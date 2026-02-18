import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Simple p-limit implementation for concurrency control
const pLimit = (concurrency: number) => {
  const queue: (() => void)[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()!();
    }
  };

  const run = async <T>(fn: () => Promise<T>, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => {
    activeCount++;
    const result = (async () => fn())();
    try {
      const res = await result;
      resolve(res);
    } catch (err) {
      reject(err);
    }
    next();
  };

  const enqueue = <T>(fn: () => Promise<T>, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => {
    queue.push(run.bind(null, fn, resolve, reject));
    if (activeCount < concurrency && queue.length > 0) {
      queue.shift()!();
    }
  };

  return <T>(fn: () => Promise<T>) => new Promise<T>((resolve, reject) => enqueue(fn, resolve, reject));
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AvailabilitySlot = "morning" | "day" | "evening";

const SLOT_LABEL: Record<AvailabilitySlot, string> = {
  morning: "Morgon",
  day: "Dag",
  evening: "Kväll",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const addHours = (date: Date, hours: number) => {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
};

const buildVoteLink = ({
  appBaseUrl,
  pollId,
  dayId,
  slots,
}: {
  appBaseUrl: string;
  pollId: string;
  dayId: string;
  slots?: AvailabilitySlot[];
}) => {
  const params = new URLSearchParams();
  params.set("poll", pollId);
  params.set("day", dayId);
  if (slots && slots.length > 0) {
    params.set("slots", slots.join(","));
  }
  return `${appBaseUrl}/schema?${params.toString()}`;
};

const formatDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(date);
  return new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "short" }).format(parsed);
};

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? Deno.env.get("SITE_URL") ?? "";
    const allowedTestRecipient = Deno.env.get("ALLOWED_TEST_RECIPIENT") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !appBaseUrl) {
      return jsonResponse(
        {
          success: false,
          error: "Saknar miljövariabler för utskick.",
          hint: "Sätt SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY och APP_BASE_URL i Supabase Functions secrets.",
        },
        500,
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Du måste vara inloggad." }, 401);
    }

    // Note for non-coders: this extracts only the token string so we can validate who is calling the function.
    const accessToken = authHeader.replace("Bearer ", "").trim();
    if (!accessToken) {
      return jsonResponse({ success: false, error: "Inloggningstoken saknas." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: authData,
      error: userError,
    } = await adminClient.auth.getUser(accessToken);

    const user = authData?.user;

    if (userError || !user) {
      return jsonResponse({ success: false, error: "Kunde inte verifiera användaren." }, 401);
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return jsonResponse({ success: false, error: "Endast administratörer kan skicka detta mail." }, 403);
    }

    const body = await req.json();
    const pollId = typeof body?.pollId === "string" ? body.pollId : "";
    const testRecipientEmail = typeof body?.testRecipientEmail === "string" ? body.testRecipientEmail.trim() : "";
    const onlyMissingVotes = body?.onlyMissingVotes === true;
    const normalizedTestRecipientEmail = testRecipientEmail.toLowerCase();

    if (!pollId) {
      return jsonResponse({ success: false, error: "pollId saknas." }, 400);
    }

    if (
      testRecipientEmail &&
      normalizedTestRecipientEmail !== allowedTestRecipient.toLowerCase()
    ) {
      const msg = allowedTestRecipient
        ? `Endast ${allowedTestRecipient} är tillåten testmottagare.`
        : "Ingen testmottagare är konfigurerad.";
      return jsonResponse({ success: false, error: msg }, 400);
    }

    const { data: poll, error: pollError } = await adminClient
      .from("availability_polls")
      .select("id, week_number, week_year, start_date, end_date, status, days:availability_poll_days(id, date)")
      .eq("id", pollId)
      .single();

    if (pollError || !poll) {
      return jsonResponse({ success: false, error: "Omröstningen hittades inte." }, 404);
    }

    const pollDayIds = (poll.days || []).map((day) => day.id);
    let votedProfileIds = new Set<string>();
    if (pollDayIds.length > 0) {
      const { data: votes, error: votesError } = await adminClient
        .from("availability_votes")
        .select("profile_id")
        .in("poll_day_id", pollDayIds);

      if (votesError) throw votesError;

      // Note for non-coders: a Set keeps each profile_id only once, even if the person voted on many days.
      votedProfileIds = new Set((votes || []).map((vote) => vote.profile_id).filter(Boolean));
    }

    const { data: mailLogs, error: mailLogError } = await adminClient
      .from("availability_poll_mail_log")
      .select("id, sent_at")
      .eq("poll_id", pollId)
      .order("sent_at", { ascending: false });

    if (mailLogError) throw mailLogError;

    const isTestMode = Boolean(testRecipientEmail);
    const alreadySentCount = mailLogs?.length || 0;

    if (!isTestMode) {
      if (alreadySentCount >= 2) {
        return jsonResponse({ success: false, error: "Max 2 mail per omröstning är tillåtet." }, 400);
      }

      const latest = mailLogs?.[0]?.sent_at ? new Date(mailLogs[0].sent_at) : null;
      if (latest) {
        const earliestNext = addHours(latest, 24);
        const now = new Date();
        if (now < earliestNext) {
          const hoursLeft = Math.ceil((earliestNext.getTime() - now.getTime()) / (1000 * 60 * 60));
          return jsonResponse(
            { success: false, error: `Du kan skicka nästa mail om cirka ${hoursLeft} timmar.` },
            400,
          );
        }
      }
    }

    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, name, is_approved, is_deleted, is_regular")
      .eq("is_approved", true)
      .eq("is_deleted", false)
      .eq("is_regular", true);

    if (profilesError) throw profilesError;

    const allUsers: Array<{ id: string; email?: string }> = [];
    const profileIds = (profiles || []).map((p) => p.id);
    const BATCH_SIZE = 10;

    for (let i = 0; i < profileIds.length; i += BATCH_SIZE) {
      const batch = profileIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map((id) => adminClient.auth.admin.getUserById(id)));

      results.forEach((result, index) => {
        const id = batch[index];
        if (result.data && result.data.user) {
          allUsers.push({
            id: result.data.user.id,
            email: result.data.user.email || undefined,
          });
        } else if (result.error) {
          // We log the error but do not throw, to ensure that a single missing/mismatched user
          // does not prevent emails from being sent to all other valid recipients.
          console.error(`Failed to fetch user ${id}: ${result.error.message}`);
        }
      });
    }

    const emailByUser = new Map<string, string>();
    allUsers.forEach((entry) => {
      if (entry.email) {
        emailByUser.set(entry.id, entry.email);
      }
    });

    let recipients = (profiles || [])
      .map((entry) => ({
        id: entry.id,
        name: entry.name || "Spelare",
        email: emailByUser.get(entry.id),
      }))
      .filter((entry): entry is { id: string; name: string; email: string } => Boolean(entry.email));

    const totalRecipientsBeforeVoteFilter = recipients.length;

    if (onlyMissingVotes) {
      recipients = recipients.filter((entry) => !votedProfileIds.has(entry.id));
    }

    if (isTestMode) {
      recipients = recipients.filter(
        (entry) => entry.email.toLowerCase() === normalizedTestRecipientEmail,
      );
    }

    if (recipients.length === 0) {
      if (onlyMissingVotes) {
        // Note for non-coders: if everyone already voted, we return success with zero emails instead of a hard error.
        return jsonResponse({
          success: true,
          sent: 0,
          total: 0,
          totalBeforeVoteFilter: totalRecipientsBeforeVoteFilter,
          votedProfileCount: votedProfileIds.size,
          onlyMissingVotes,
          sendAttempt: isTestMode ? null : alreadySentCount + 1,
          mode: isTestMode ? "test" : "broadcast",
          errors: [],
          slotLabels: SLOT_LABEL,
        });
      }

      return jsonResponse({ success: false, error: "Inga mottagare med e-post hittades." }, 400);
    }

    const sortedDays = [...(poll.days || [])].sort((a, b) => a.date.localeCompare(b.date));
    const moduleLink = `${appBaseUrl}/schema?poll=${poll.id}`;

    const dayCards = sortedDays
      .map((day) => {
        const fullDayLink = buildVoteLink({ appBaseUrl, pollId: poll.id, dayId: day.id });
        const morningLink = buildVoteLink({ appBaseUrl, pollId: poll.id, dayId: day.id, slots: ["morning"] });
        const dayLink = buildVoteLink({ appBaseUrl, pollId: poll.id, dayId: day.id, slots: ["day"] });
        const eveningLink = buildVoteLink({ appBaseUrl, pollId: poll.id, dayId: day.id, slots: ["evening"] });

        return `
          <div style="margin: 10px 0; padding: 12px; border: 1px solid #eee; border-radius: 10px;">
            <p style="margin: 0 0 8px 0; font-weight: 700;">${formatDate(day.date)}</p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">Klicka för att öppna appen och fylla i direkt:</p>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              <a href="${fullDayLink}" style="padding:6px 10px; background:#f4f4f4; border-radius:999px; text-decoration:none; color:#111; font-size:13px;">Hela dagen</a>
              <a href="${morningLink}" style="padding:6px 10px; background:#f4f4f4; border-radius:999px; text-decoration:none; color:#111; font-size:13px;">Morgon</a>
              <a href="${dayLink}" style="padding:6px 10px; background:#f4f4f4; border-radius:999px; text-decoration:none; color:#111; font-size:13px;">Dag</a>
              <a href="${eveningLink}" style="padding:6px 10px; background:#f4f4f4; border-radius:999px; text-decoration:none; color:#111; font-size:13px;">Kväll</a>
            </div>
          </div>
        `;
      })
      .join("");

    let sentCount = 0;
    const errors: Array<{ email: string; error: string }> = [];
    const maxRetriesOnRateLimit = 2;
    const rateLimitWaitMs = 1200;

    const sendEmailWithRetry = async (recipientEmail: string, html: string) => {
      let retries = 0;
      while (true) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Padel-appen <no-reply@padelgrabbarna.club>",
            to: [recipientEmail],
            subject: `Schema vecka ${poll.week_number} (${poll.week_year})`,
            html,
          }),
        });

        if (response.ok) {
          return { ok: true, errorMessage: "", retries };
        }

        const errText = await response.text();
        if (response.status === 429 && retries < maxRetriesOnRateLimit) {
          retries += 1;
          // Note for non-coders: when the email provider says "too many requests", we pause and retry a few times.
          await sleep(rateLimitWaitMs);
          continue;
        }

        return {
          ok: false,
          errorMessage: `HTTP ${response.status} after ${retries} retries: ${errText}`,
          retries,
        };
      }
    };

    const processRecipient = async (recipient: typeof recipients[0]) => {
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:20px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:640px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden;">
              <tr>
                <td style="padding:24px; background:linear-gradient(135deg,#101010,#1f1f1f); color:#fff;">
                  <p style="margin:0; font-size:12px; letter-spacing:1px; text-transform:uppercase; opacity:0.8;">Schema-omröstning</p>
                  <h1 style="margin:8px 0 0 0; font-size:24px;">Vecka ${poll.week_number} (${poll.week_year})</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:24px; color:#222;">
                  <p style="margin:0 0 12px 0;">Hej ${escapeHtml(recipient.name)}!</p>
                  <p style="margin:0 0 12px 0; color:#222; font-size:15px; line-height:1.6;">
                    Vi planerar kommande padelmatcher och behöver ditt svar.
                    Markera vilka datum och tider du kan spela genom att använda länkarna nedan.
                  </p>
                  <p style="margin:0 0 16px 0; color:#555;">När du klickar på en dag/tid öppnas appen direkt på rätt modul så att du snabbt kan registrera din tillgänglighet.</p>
                  <!-- Note for non-coders: this intro text explains the goal of the email before any buttons, so recipients understand they should mark available dates for padel. -->
                  <p style="margin:0 0 16px 0;"><a href="${moduleLink}" style="display:inline-block; padding:10px 14px; background:#111; color:#fff; text-decoration:none; border-radius:8px;">Öppna veckans modul</a></p>
                  ${dayCards}
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const result = await sendEmailWithRetry(recipient.email, html);
      return { email: recipient.email, success: result.ok, error: result.errorMessage };
    };

    const limit = pLimit(5);
    const results = await Promise.all(recipients.map((recipient) => limit(() => processRecipient(recipient))));

    results.forEach((r) => {
      if (r.success) {
        sentCount += 1;
      } else {
        errors.push({ email: r.email, error: r.error });
      }
    });

    if (!isTestMode) {
      const { error: insertLogError } = await adminClient.from("availability_poll_mail_log").insert({
        poll_id: poll.id,
        sent_by: user.id,
      });

      if (insertLogError) throw insertLogError;
    }

    return jsonResponse({
      success: true,
      sent: sentCount,
      total: recipients.length,
      totalBeforeVoteFilter: totalRecipientsBeforeVoteFilter,
      votedProfileCount: votedProfileIds.size,
      onlyMissingVotes,
      sendAttempt: isTestMode ? null : alreadySentCount + 1,
      mode: isTestMode ? "test" : "broadcast",
      errors,
      slotLabels: SLOT_LABEL,
    });
  } catch (error) {
    console.error("availability-poll-mail error", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Okänt fel",
      },
      500,
    );
  }
});
