import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toIcsTimestamp = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
};

const toIcsLocalDateTime = (date: string, time: string) => {
  const compactDate = date.replace(/-/g, "");
  const compactTime = time.replace(/:/g, "");
  return `${compactDate}T${compactTime}00`;
};

const normalizeClockTime = (rawTime: string): string | null => {
  // Note for non-coders: some clients can send extra seconds/timezone text, so we keep only HH:MM to avoid accidental timezone shifts.
  const match = rawTime.trim().match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const toBase64 = (value: string) => {
  // Note for non-coders: calendar files must be base64-encoded before they are attached to an email.
  return btoa(unescape(encodeURIComponent(value)));
};

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const escapeIcs = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? Deno.env.get("SITE_URL") ?? "";

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

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Du måste vara inloggad." }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();
    if (!accessToken) {
      return jsonResponse({ success: false, error: "Inloggningstoken saknas." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: userError } = await adminClient.auth.getUser(accessToken);
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
      return jsonResponse({ success: false, error: "Endast administratörer kan skicka kalenderinbjudningar." }, 403);
    }

    const body = await req.json();
    const pollId = typeof body?.pollId === "string" ? body.pollId : "";
    const date = typeof body?.date === "string" ? body.date : "";
    const startTimeRaw = typeof body?.startTime === "string" ? body.startTime : "";
    const endTimeRaw = typeof body?.endTime === "string" ? body.endTime : "";
    const startTime = normalizeClockTime(startTimeRaw);
    const endTime = normalizeClockTime(endTimeRaw);
    // Note for non-coders: location is optional so admins can describe any venue without a dropdown.
    const location = typeof body?.location === "string" && body.location.trim() ? body.location.trim() : "";
    const inviteeProfileIds = Array.isArray(body?.inviteeProfileIds)
      ? body.inviteeProfileIds.filter((id: unknown) => typeof id === "string")
      : [];
    const action = body?.action === "update" || body?.action === "cancel" ? body.action : "create";
    const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Padelmatch";

    if (!date || !startTime || !endTime) {
      return jsonResponse({ success: false, error: "Datum och tider måste fyllas i." }, 400);
    }

    if (inviteeProfileIds.length === 0) {
      return jsonResponse({ success: false, error: "Välj minst en mottagare." }, 400);
    }

    let poll: { id: string; week_number: number; week_year: number } | null = null;
    if (pollId) {
      const { data: pollData, error: pollError } = await adminClient
        .from("availability_polls")
        .select("id, week_number, week_year")
        .eq("id", pollId)
        .single();

      if (pollError || !pollData) {
        return jsonResponse({ success: false, error: "Omröstningen hittades inte." }, 404);
      }

      poll = pollData;
    }

    // Note for non-coders: calendar invites are allowed even if no votes were collected, per product request.

    const { data: invitedProfiles, error: invitedProfilesError } = await adminClient
      .from("profiles")
      .select("id, name")
      .in("id", inviteeProfileIds);

    if (invitedProfilesError) throw invitedProfilesError;

    const allUsers: Array<{ id: string; email?: string }> = [];
    // Performance Optimization: Fetch only invited users (who exist in profiles) instead of all users.
    const inviteeIds = (invitedProfiles || []).map((p) => p.id);
    const uniqueInviteeIds = Array.from(new Set(inviteeIds));
    const BATCH_SIZE = 10;

    for (let i = 0; i < uniqueInviteeIds.length; i += BATCH_SIZE) {
      const batch = uniqueInviteeIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map((id) => adminClient.auth.admin.getUserById(id)));

      results.forEach((result) => {
        if (result.data && result.data.user) {
          allUsers.push({ id: result.data.user.id, email: result.data.user.email });
        } else if (result.error) {
          console.warn(`Could not fetch user: ${result.error.message}`, result.error);
        }
      });
    }

    const emailByUser = new Map<string, string>();
    allUsers.forEach((entry) => {
      if (entry.email) {
        emailByUser.set(entry.id, entry.email);
      }
    });

    const recipients = (invitedProfiles || [])
      .map((entry) => ({
        id: entry.id,
        name: entry.name || "Spelare",
        email: emailByUser.get(entry.id),
      }))
      .filter((entry): entry is { id: string; name: string; email: string } => Boolean(entry.email));

    if (recipients.length === 0) {
      return jsonResponse({ success: false, error: "Inga mottagare med e-post hittades." }, 400);
    }

    const eventUid = `${pollId || "manual"}-${date}-${startTime}`;
    const dtstamp = toIcsTimestamp(new Date());
    const dtstart = toIcsLocalDateTime(date, startTime);
    const dtend = toIcsLocalDateTime(date, endTime);
    const sequence = action === "update" ? 1 : action === "cancel" ? 2 : 0;
    const method = action === "cancel" ? "CANCEL" : "REQUEST";
    const status = action === "cancel" ? "CANCELLED" : "CONFIRMED";

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Padel-appen//EN",
      `METHOD:${method}`,
      "BEGIN:VEVENT",
      `UID:${escapeIcs(eventUid)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Stockholm:${dtstart}`,
      `DTEND;TZID=Europe/Stockholm:${dtend}`,
      `SUMMARY:${escapeIcs(title)}`,
      ...(location ? [`LOCATION:${escapeIcs(location)}`] : []),
      `DESCRIPTION:${escapeIcs(
        poll ? `Padelpass vecka ${poll.week_number} (${poll.week_year}).` : "Padelpass - fristående bokning.",
      )}`,
      `STATUS:${status}`,
      `SEQUENCE:${sequence}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const subjectPrefix = action === "cancel" ? "Avbokad" : action === "update" ? "Uppdaterad" : "Inbjudan";
    const schemaLinkParams = new URLSearchParams();
    if (pollId) schemaLinkParams.set("poll", pollId);
    const schemaLink = schemaLinkParams.toString()
      ? `${appBaseUrl}/schema?${schemaLinkParams.toString()}`
      : `${appBaseUrl}/schema`;

    const maxRetriesOnRateLimit = 2;
    const rateLimitWaitMs = 1200;
    const perEmailDelayMs = 600;

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
            subject: `${subjectPrefix}: ${title}`,
            html,
            attachments: [
              {
                filename: "padel-invite.ics",
                content: toBase64(icsContent),
              },
            ],
          }),
        });

        if (response.ok) {
          return { ok: true, errorMessage: "", retries };
        }

        const errText = await response.text();
        if (response.status === 429 && retries < maxRetriesOnRateLimit) {
          retries += 1;
          // Note for non-coders: "429" means the email provider asked us to slow down, so we pause and retry.
          await delay(rateLimitWaitMs * retries);
          continue;
        }

        return {
          ok: false,
          errorMessage: `HTTP ${response.status} after ${retries} retries: ${errText}`,
          retries,
        };
      }
    };

    let sentCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const recipient of recipients) {
      const locationLine = location ? `<p><strong>Plats:</strong> ${escapeHtml(location)}</p>` : "";
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>${subjectPrefix}: ${escapeHtml(title)}</h2>
            <p>Hej ${escapeHtml(recipient.name)}!</p>
            <p>Du får här en kalenderinbjudan för padelpasset. Öppna bilagan för att lägga till, uppdatera eller avbryta eventet i din kalender.</p>
            ${locationLine}
            <p><a href="${schemaLink}">Öppna schema</a></p>
          </body>
        </html>
      `;

      const result = await sendEmailWithRetry(recipient.email, html);

      if (!result.ok) {
        errors.push({ email: recipient.email, error: result.errorMessage });
      } else {
        sentCount += 1;
      }

      // Note for non-coders: we pause between emails so we don't overwhelm the email provider.
      await delay(perEmailDelayMs);
    }

    const scheduledStatus = action === "cancel" ? "cancelled" : "scheduled";
    try {
      // Note for non-coders: we store scheduled games so the app can show upcoming bookings and notifications.
      await adminClient
        .from("availability_scheduled_games")
        .upsert(
          {
            event_uid: eventUid,
            poll_id: pollId || null,
            title,
            date,
            start_time: startTime,
            end_time: endTime,
            status: scheduledStatus,
            location: location || null,
            invitee_profile_ids: inviteeProfileIds,
            created_by: user.id,
          },
          { onConflict: "event_uid" },
        );
    } catch (logError) {
      console.warn("Could not log scheduled game", logError);
    }

    return jsonResponse({
      success: true,
      sent: sentCount,
      total: recipients.length,
      errors,
    });
  } catch (error) {
    console.error("availability-calendar-invite error", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Okänt fel",
      },
      500,
    );
  }
});
