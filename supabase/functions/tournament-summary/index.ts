import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GUEST_LABEL = "Gästspelare";

const escapeHtml = (unsafe: string) =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getBearerToken = (req: Request) => {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Non-coder note: call this function on a schedule (for example every 10-15 minutes) so queued emails go out on time.
  const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !resendApiKey) {
      // Non-coder note: missing secrets mean we cannot read tournament data or send emails safely.
      return jsonResponse({
        success: false,
        error: "Supabase- eller Resend-nycklar saknas.",
      });
    }

    const token = getBearerToken(req);
    if (!token) {
      return jsonResponse({ success: false, error: "Missing bearer token" }, 401);
    }

    const isServiceRole = token === serviceRoleKey;
    if (!isServiceRole) {
      const authClient = createClient(supabaseUrl, anonKey);
      const { data, error } = await authClient.auth.getUser(token);
      if (error || !data?.user) {
        return jsonResponse({ success: false, error: "Invalid token" }, 401);
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const nowIso = new Date().toISOString();
    const { data: jobs, error: jobsError } = await supabase
      .from("tournament_email_queue")
      .select("id, tournament_id, scheduled_for")
      .eq("status", "pending")
      .lte("scheduled_for", nowIso);

    if (jobsError) {
      console.error("Queue fetch error:", jobsError);
      return jsonResponse({ success: false, error: jobsError.message });
    }

    if (!jobs || jobs.length === 0) {
      return jsonResponse({ success: true, message: "No pending emails" });
    }

    // Non-coder note: we fetch all auth users once to match profile ids with email addresses.
    const allUsers: any[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data: usersData, error } = await supabase.auth.admin.listUsers({ page, perPage: 50 });
      if (error) throw error;
      if (!usersData?.users) break;
      allUsers.push(...usersData.users);
      hasMore = usersData.users.length === 50;
      page += 1;
    }

    const resolveUserEmail = (user: any) => {
      if (!user) return null;
      const metadataEmail = user.user_metadata?.email ?? user.user_metadata?.email_address ?? null;
      const identityEmail = Array.isArray(user.identities)
        ? user.identities
          .map((identity: any) => identity?.identity_data?.email ?? identity?.email ?? null)
          .find((email: string | null) => Boolean(email))
        : null;
      return user.email ?? metadataEmail ?? identityEmail ?? null;
    };

    const authEmailMap = new Map(allUsers.map(user => [user.id, resolveUserEmail(user)]));

    let sentCount = 0;
    let skippedCount = 0;

    for (const job of jobs) {
      const { data: tournament, error: tournamentError } = await supabase
        .from("mexicana_tournaments")
        .select("id, name, completed_at, scheduled_at, location, score_target, tournament_type")
        .eq("id", job.tournament_id)
        .maybeSingle();

      if (tournamentError || !tournament) {
        console.error("Tournament fetch error:", tournamentError);
        skippedCount += 1;
        await supabase
          .from("tournament_email_queue")
          .update({ status: "skipped", sent_at: new Date().toISOString() })
          .eq("id", job.id);
        continue;
      }

      const [participantsResponse, resultsResponse, roundsResponse] = await Promise.all([
        supabase
          .from("mexicana_participants")
          .select("profile_id, profiles(id, name, avatar_url, email)")
          .eq("tournament_id", tournament.id),
        supabase
          .from("mexicana_results")
          .select("profile_id, rank, points_for, points_against, wins, losses, matches_played")
          .eq("tournament_id", tournament.id)
          .order("rank", { ascending: true }),
        supabase
          .from("mexicana_rounds")
          .select("round_number, team1_ids, team2_ids, team1_score, team2_score")
          .eq("tournament_id", tournament.id)
          .order("round_number", { ascending: true }),
      ]);

      if (participantsResponse.error || resultsResponse.error || roundsResponse.error) {
        console.error("Tournament summary fetch error:", {
          participants: participantsResponse.error,
          results: resultsResponse.error,
          rounds: roundsResponse.error,
        });
        skippedCount += 1;
        await supabase
          .from("tournament_email_queue")
          .update({ status: "skipped", sent_at: new Date().toISOString() })
          .eq("id", job.id);
        continue;
      }

      const participants = participantsResponse.data || [];
      const results = resultsResponse.data || [];
      const rounds = roundsResponse.data || [];

      const profileMap = new Map(
        participants
          .filter(row => row?.profiles?.id)
          .map(row => [row.profiles.id, {
            name: escapeHtml(row.profiles.name ?? GUEST_LABEL),
            avatar_url: row.profiles.avatar_url ? escapeHtml(row.profiles.avatar_url) : null,
            email: row.profiles.email ?? null,
          }])
      );

      const resolveName = (id: string | null) => {
        if (!id) return GUEST_LABEL;
        return profileMap.get(id)?.name ?? GUEST_LABEL;
      };

      const participantNames = participants
        .map(row => resolveName(row.profile_id))
        .filter(Boolean);

      const winners = results.filter(entry => entry.rank === 1).map(entry => resolveName(entry.profile_id));
      const podium = results.slice(0, 3).map(entry => ({
        rank: entry.rank,
        name: resolveName(entry.profile_id),
      }));

      const matches = rounds
        .filter(round => Number.isFinite(round.team1_score) && Number.isFinite(round.team2_score))
        .map(round => {
          const team1 = (round.team1_ids || []).map((id: string | null) => resolveName(id)).join(" + ");
          const team2 = (round.team2_ids || []).map((id: string | null) => resolveName(id)).join(" + ");
          return {
            label: `Runda ${round.round_number}`,
            matchup: `${team1 || GUEST_LABEL} vs ${team2 || GUEST_LABEL}`,
            score: `${round.team1_score ?? 0}–${round.team2_score ?? 0}`,
          };
        });

      const emailHtml = `
        <!doctype html>
        <html lang="sv">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Turneringssammanfattning</title>
          </head>
          <body style="margin:0; padding:0; background:#f4f4f4; color:#111; font-family: Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4; padding:24px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:16px; padding:24px;">
                    <tr>
                      <td style="padding-bottom:16px;">
                        <h1 style="margin:0; font-size:24px;">${escapeHtml(tournament.name || "Turnering")}</h1>
                        <p style="margin:4px 0 0; color:#666;">${escapeHtml(tournament.tournament_type || "mexicano")} • ${escapeHtml(tournament.location || "Plats saknas")}</p>
                        <p style="margin:4px 0 0; color:#666;">Avslutad ${escapeHtml(formatDate(tournament.completed_at || tournament.scheduled_at || ""))}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 0; border-top:1px solid #eee;">
                        <h2 style="margin:0 0 8px; font-size:18px;">Vinnare</h2>
                        <p style="margin:0;">${winners.length ? winners.join(", ") : "Ingen vinnare registrerad"}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 0; border-top:1px solid #eee;">
                        <h2 style="margin:0 0 8px; font-size:18px;">Podium</h2>
                        <ol style="margin:0; padding-left:20px;">
                          ${podium.map(entry => `<li>${entry.name || GUEST_LABEL}</li>`).join("")}
                        </ol>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 0; border-top:1px solid #eee;">
                        <h2 style="margin:0 0 8px; font-size:18px;">Deltagare</h2>
                        <p style="margin:0;">${participantNames.join(", ") || "Inga deltagare registrerade"}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 0; border-top:1px solid #eee;">
                        <h2 style="margin:0 0 8px; font-size:18px;">Tabell</h2>
                        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
                          <tr style="background:#f7f7f7;">
                            <th align="left">Placering</th>
                            <th align="left">Spelare</th>
                            <th align="center">Vinster</th>
                            <th align="center">För</th>
                            <th align="center">Mot</th>
                          </tr>
                          ${results.map(entry => `
                            <tr>
                              <td>${entry.rank}</td>
                              <td>${resolveName(entry.profile_id)}</td>
                              <td align="center">${entry.wins}</td>
                              <td align="center">${entry.points_for}</td>
                              <td align="center">${entry.points_against}</td>
                            </tr>
                          `).join("")}
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 0; border-top:1px solid #eee;">
                        <h2 style="margin:0 0 8px; font-size:18px;">Matcher</h2>
                        ${matches.length ? matches.map(match => `
                          <p style="margin:0 0 6px;"><strong>${match.label}:</strong> ${match.matchup} (${match.score})</p>
                        `).join("") : `<p style="margin:0;">Inga matcher registrerade.</p>`}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const participantEmails = participants
        .map(row => row.profile_id)
        .filter((id): id is string => Boolean(id))
        .map(id => authEmailMap.get(id) || profileMap.get(id)?.email)
        .filter((email): email is string => Boolean(email));

      const uniqueEmails = Array.from(new Set(participantEmails));

      if (uniqueEmails.length === 0) {
        // Non-coder note: we skip sending if nobody has an email address available.
        skippedCount += 1;
        await supabase
          .from("tournament_email_queue")
          .update({ status: "skipped", sent_at: new Date().toISOString() })
          .eq("id", job.id);
        continue;
      }

      for (const email of uniqueEmails) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Padel-appen <no-reply@padelgrabbarna.club>",
            to: email,
            subject: `Turneringssammanfattning: ${tournament.name || "Turnering"}`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Failed to send tournament email to ${email}:`, errorData);
        } else {
          sentCount += 1;
        }

        // Non-coder note: short pauses reduce the chance of hitting email provider rate limits.
        await delay(200);
      }

      await supabase
        .from("tournament_email_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", job.id);
    }

    return jsonResponse({ success: true, sent: sentCount, skipped: skippedCount });
  } catch (error) {
    console.error("Tournament summary send error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
