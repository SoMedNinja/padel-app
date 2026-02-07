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

const toBase64 = (value: string) => {
  // Note for non-coders: calendar files must be base64-encoded before they are attached to an email.
  return btoa(unescape(encodeURIComponent(value)));
};

const escapeIcs = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

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
    const startTime = typeof body?.startTime === "string" ? body.startTime : "";
    const endTime = typeof body?.endTime === "string" ? body.endTime : "";
    const inviteeProfileIds = Array.isArray(body?.inviteeProfileIds)
      ? body.inviteeProfileIds.filter((id: unknown) => typeof id === "string")
      : [];
    const action = body?.action === "update" || body?.action === "cancel" ? body.action : "create";
    const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Padelmatch";

    if (!pollId || !date || !startTime || !endTime) {
      return jsonResponse({ success: false, error: "pollId, datum och tider måste fyllas i." }, 400);
    }

    if (inviteeProfileIds.length === 0) {
      return jsonResponse({ success: false, error: "Välj minst en mottagare." }, 400);
    }

    const { data: poll, error: pollError } = await adminClient
      .from("availability_polls")
      .select("id, week_number, week_year, days:availability_poll_days(id)")
      .eq("id", pollId)
      .single();

    if (pollError || !poll) {
      return jsonResponse({ success: false, error: "Omröstningen hittades inte." }, 404);
    }

    // Note for non-coders: calendar invites are allowed even if no votes were collected, per product request.

    const { data: invitedProfiles, error: invitedProfilesError } = await adminClient
      .from("profiles")
      .select("id, name")
      .in("id", inviteeProfileIds);

    if (invitedProfilesError) throw invitedProfilesError;

    const allUsers: Array<{ id: string; email?: string }> = [];
    let page = 1;
    const perPage = 200;
    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data?.users || [];
      users.forEach((entry) => allUsers.push({ id: entry.id, email: entry.email || undefined }));
      if (users.length < perPage) break;
      page += 1;
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

    const eventUid = `${pollId}-${date}`;
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
      `DESCRIPTION:${escapeIcs(`Padelpass vecka ${poll.week_number} (${poll.week_year}).`)}`,
      `STATUS:${status}`,
      `SEQUENCE:${sequence}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const subjectPrefix = action === "cancel" ? "Avbokad" : action === "update" ? "Uppdaterad" : "Inbjudan";

    let sentCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const recipient of recipients) {
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>${subjectPrefix}: ${title}</h2>
            <p>Hej ${recipient.name}!</p>
            <p>Du får här en kalenderinbjudan för padelpasset. Öppna bilagan för att lägga till, uppdatera eller avbryta eventet i din kalender.</p>
            <p><a href="${appBaseUrl}/schema?poll=${pollId}">Öppna schema-omröstningen</a></p>
          </body>
        </html>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Padel-appen <no-reply@padelgrabbarna.club>",
          to: [recipient.email],
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

      if (!response.ok) {
        const errText = await response.text();
        errors.push({ email: recipient.email, error: errText });
      } else {
        sentCount += 1;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const scheduledStatus = action === "cancel" ? "cancelled" : "scheduled";
    try {
      // Note for non-coders: we store scheduled games so the app can show upcoming bookings and notifications.
      await adminClient
        .from("availability_scheduled_games")
        .upsert(
          {
            poll_id: pollId,
            title,
            date,
            start_time: startTime,
            end_time: endTime,
            status: scheduledStatus,
            invitee_profile_ids: inviteeProfileIds,
            created_by: user.id,
          },
          { onConflict: "poll_id,date,start_time" },
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
