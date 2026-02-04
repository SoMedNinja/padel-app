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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!isServiceRole) {
      const authClient = createClient(supabaseUrl, anonKey);
      const { data, error } = await authClient.auth.getUser(token);
      if (error || !data?.user) {
        return jsonResponse({ success: false, error: "Invalid token" }, 401);
      }

      // Security: verify that the user is an admin before allowing them to trigger the queue.
      // This provides defense-in-depth against unauthorized users triggering mass emails.
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        return jsonResponse({ success: false, error: "Unauthorized" }, 403);
      }
    }

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
      const renderAvatar = (avatarUrl: string | null | undefined, name: string, size = 42) => {
        const initial = name.trim().charAt(0).toUpperCase() || "?";
        return avatarUrl
          ? `<img src="${avatarUrl}" alt="${name}" width="${size}" height="${size}" style="border-radius: 50%; border: 2px solid #fff; display: block;" />`
          : `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${Math.max(12, Math.round(size / 2.8))}px;">${initial}</div>`;
      };

      // Non-coder note: we also keep avatar links so the email can show player profile images.
      const winners = results.filter(entry => entry.rank === 1).map(entry => ({
        name: resolveName(entry.profile_id),
        avatarUrl: entry.profile_id ? profileMap.get(entry.profile_id)?.avatar_url : null,
        rank: entry.rank,
      }));
      const podium = results.slice(0, 3).map(entry => ({
        rank: entry.rank,
        name: resolveName(entry.profile_id),
        avatarUrl: entry.profile_id ? profileMap.get(entry.profile_id)?.avatar_url : null,
      }));
      // Non-coder note: we build a fixed-width podium layout so the email displays reliably.
      const getPodiumEntry = (rank: number) =>
        podium.find(entry => entry.rank === rank) || { rank, name: GUEST_LABEL, avatarUrl: null };
      const podiumSlots = [
        { rank: 2, paddingTop: 24, barHeight: 16, barColor: "#d7d7d7" },
        { rank: 1, paddingTop: 0, barHeight: 26, barColor: "#f5c542" },
        { rank: 3, paddingTop: 36, barHeight: 12, barColor: "#d9c1b7" },
      ];

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

      const formatRecord = (entry: any) => {
        // Non-coder note: tournaments don't store draws explicitly, so we infer them from total matches.
        const wins = Number(entry.wins ?? 0);
        const losses = Number(entry.losses ?? 0);
        const matchesPlayed = Number(entry.matches_played ?? wins + losses);
        const draws = Math.max(0, matchesPlayed - wins - losses);
        return `${wins}/${draws}/${losses}`;
      };

      const emailHtml = `
        <!doctype html>
        <html lang="sv">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Turneringssammanfattning</title>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
            <style>
              :root { color-scheme: light dark; supported-color-schemes: light dark; }
              html, body { background-color: #f4f4f4; color: #1a1a1a; }
              body { font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #1a1a1a; }
              h1, h2, h3 { font-family: 'Playfair Display', serif; }
              table, td { background-color: #ffffff; color: #1a1a1a; }
              .email-container { background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              .email-hero { background: linear-gradient(135deg, #000000 0%, #1a1a1a 60%, #0b0b0b 100%); color: #ffffff; padding: 36px 24px; text-align: center; }
              .email-section { padding: 28px 32px; }
              .email-card { background: #f7f7f7; border-radius: 12px; border: 1px solid #eee; padding: 16px; }
              .email-pill { display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(255,255,255,0.15); color: #fff; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
              .email-avatar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
              .email-subtle { color: #666; font-size: 13px; margin: 6px 0 0; }
              /* Non-coder note: soft shading and borders help the results table feel less harsh while staying readable. */
              .email-table { width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #e2e2e2; border-radius: 10px; overflow: hidden; background: #ffffff; }
              .email-table th, .email-table td { padding: 8px 10px; color: #1a1a1a; }
              .email-table thead th { background: #f1f3f5; font-weight: 700; }
              .email-table tbody tr:nth-child(even) { background: #f9fafb; }
              .email-table tbody td { border-top: 1px solid #ececec; }
            </style>
          </head>
          <body>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4; padding:24px;">
              <tr>
                <td align="center">
                  <table class="email-container" width="600" cellpadding="0" cellspacing="0">
                    <tr>
                      <td class="email-hero">
                        <div class="email-pill">Turneringssammanfattning</div>
                        <h1 style="margin:12px 0 6px; font-size:28px;">${escapeHtml(tournament.name || "Turnering")}</h1>
                        <p style="margin:0; color:#cfcfcf;">${escapeHtml(tournament.tournament_type || "mexicano")} • ${escapeHtml(tournament.location || "Plats saknas")}</p>
                        <p style="margin:6px 0 0; color:#cfcfcf;">Avslutad ${escapeHtml(formatDate(tournament.completed_at || tournament.scheduled_at || ""))}</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="email-section">
                        <div class="email-card" style="background: linear-gradient(135deg, #fff7d6 0%, #ffe3a6 100%); border: 1px solid #f0cf7a;">
                          <h2 style="margin:0 0 12px;">Vinnare</h2>
                          ${winners.length ? winners.map(entry => `
                            <!-- Non-coder note: inline styles keep the winner block centered and festive in email clients. -->
                            <div style="text-align:center; padding:8px 0;">
                              <div style="display:inline-block; text-align:center;">
                                <div style="margin:0 auto 8px; width:42px;">
                                  ${renderAvatar(entry.avatarUrl, entry.name)}
                                </div>
                                <div style="font-size:18px; font-weight:700;">
                                  <span style="font-size:18px; margin-right:6px;">👑</span>${entry.name}
                                </div>
                              </div>
                            </div>
                          `).join("") : "<p style=\"margin:0;\">Ingen vinnare registrerad</p>"}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td class="email-section" style="padding-top:0;">
                        <div class="email-card">
                          <h2 style="margin:0 0 12px;">Podium</h2>
                          <!-- Non-coder note: fixed-width table cells ensure consistent podium columns in email clients. -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;">
                            <tr>
                              ${podiumSlots.map(slot => {
                                const entry = getPodiumEntry(slot.rank);
                                return `
                                  <td width="180" valign="bottom" align="center">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td style="padding-top:${slot.paddingTop}px; padding-bottom:8px; text-align:center;">
                                          <div style="margin:0 auto 6px;">
                                            <span style="display:inline-block; padding:4px 12px; background:#111; color:#fff; border-radius:999px; font-size:16px; font-weight:700;">${entry.rank}</span>
                                          </div>
                                          <div style="margin:0 auto 6px; width:42px;">
                                            ${renderAvatar(entry.avatarUrl, entry.name)}
                                          </div>
                                          <div style="font-weight:700; font-size:14px;">${entry.name || GUEST_LABEL}</div>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="height:${slot.barHeight}px; background:${slot.barColor}; border-radius:8px 8px 0 0;"></td>
                                      </tr>
                                    </table>
                                  </td>
                                `;
                              }).join("")}
                            </tr>
                          </table>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td class="email-section" style="padding-top:0;">
                        <div class="email-card">
                          <h2 style="margin:0 0 12px;">Tabell</h2>
                          <table width="100%" cellpadding="0" cellspacing="0" class="email-table">
                            <thead>
                              <tr>
                                <th align="left">Plac.</th>
                                <th align="left">Namn</th>
                                <th align="center">Poäng</th>
                                <th align="center">Matcher</th>
                                <th align="center">V/O/F</th>
                                <th align="center">Diff</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${results.map(entry => `
                                <tr>
                                  <td>${entry.rank}</td>
                                  <td>${resolveName(entry.profile_id)}</td>
                                  <td align="center">${entry.points_for ?? 0}</td>
                                  <td align="center">${entry.matches_played ?? "-"}</td>
                                  <td align="center">${formatRecord(entry)}</td>
                                  <td align="center">${(entry.points_for ?? 0) - (entry.points_against ?? 0)}</td>
                                </tr>
                              `).join("")}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td class="email-section" style="padding-top:0;">
                        <div class="email-card">
                          <h2 style="margin:0 0 12px;">Matcher</h2>
                          ${matches.length ? matches.map(match => `
                            <p style="margin:0 0 8px;"><strong>${match.label}:</strong> ${match.matchup} (${match.score})</p>
                          `).join("") : `<p style="margin:0;">Inga matcher registrerade.</p>`}
                        </div>
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
