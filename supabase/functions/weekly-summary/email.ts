import { WeeklyPlayerStats, MvpCandidate, WeekHighlight, LeaderboardEntry, EmailResult } from "./types.ts";
import { escapeHtml, renderAvatar, getBadgeLabelById, delay } from "./utils.ts";

export const generateEmailHtml = (
  stats: WeeklyPlayerStats,
  mvp: MvpCandidate | null,
  highlight: WeekHighlight | null,
  leaderboard: LeaderboardEntry[],
  weekLabel: string
): string => {
  const deltaColor = stats.eloDelta >= 0 ? "#2e7d32" : "#d32f2f";
  const deltaSign = stats.eloDelta > 0 ? "+" : "";
  const featuredBadgeLabel = getBadgeLabelById(stats.featuredBadgeId);

  const renderTrendIndicator = (trend: "up" | "down" | "same") => {
    const config = trend === "up"
      ? { symbol: "▲", color: "#2e7d32" }
      : trend === "down"
        ? { symbol: "▼", color: "#d32f2f" }
        : { symbol: "→", color: "#999" };
    return `<span style="color: ${config.color}; font-weight: 700; margin-right: 6px;">${config.symbol}</span>`;
  };

  const sparklinePoints = stats.recentResults
    .map((result: string, index: number) => {
      const x = 8 + index * 18;
      const y = result === "W" ? 6 : 20;
      return `${x},${y}`;
    })
    .join(" ");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
      <style>
        :root { color-scheme: light dark; supported-color-schemes: light dark; }
        body { font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #1a1a1a; }
        h1, h2, h3 { font-family: 'Playfair Display', serif; }
        table, td { background-color: #ffffff; color: #1a1a1a; }
        .email-invert-allowed,
        .email-invert-allowed td { background-color: #111111 !important; color: #ffffff !important; }
        @media screen and (max-width: 620px) {
          .email-outer { padding: 12px !important; }
          .email-container { width: 100% !important; max-width: 100% !important; }
          .email-hero { padding: 32px 16px !important; }
          .email-section { padding-left: 20px !important; padding-right: 20px !important; }
          .email-stat-cell { display: block !important; width: 100% !important; border-right: 0 !important; border-bottom: 1px solid #eee !important; }
          .email-col { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
          .email-col:last-child { padding-bottom: 0 !important; }
        }
        @media (prefers-color-scheme: dark) {
          body, table, td, p, h1, h2, h3, span, div { background-color: #0f0f0f !important; color: #f5f5f5 !important; }
          .email-container { background-color: #141414 !important; box-shadow: none !important; }
          .email-card { background-color: #1b1b1b !important; color: #f5f5f5 !important; border-color: #2a2a2a !important; }
          .email-light { background-color: #1b1b1b !important; border-color: #2a2a2a !important; }
          .email-divider { border-color: #2a2a2a !important; }
          .email-border { border-color: #f5f5f5 !important; }
          .email-accent { color: var(--email-accent) !important; }
          .email-highlight { color: var(--email-highlight) !important; }
          .email-invert-allowed,
          .email-invert-allowed td { background-color: #0b0b0b !important; color: #ffffff !important; }
        }
        [data-ogsc] body,
        [data-ogsc] table,
        [data-ogsc] td,
        [data-ogsc] p,
        [data-ogsc] h1,
        [data-ogsc] h2,
        [data-ogsc] h3,
        [data-ogsc] span,
        [data-ogsc] div { background-color: #0f0f0f !important; color: #f5f5f5 !important; }
        [data-ogsc] .email-container { background-color: #141414 !important; }
        [data-ogsc] .email-card { background-color: #1b1b1b !important; color: #f5f5f5 !important; border-color: #2a2a2a !important; }
        [data-ogsc] .email-light { background-color: #1b1b1b !important; border-color: #2a2a2a !important; }
        [data-ogsc] .email-divider { border-color: #2a2a2a !important; }
        [data-ogsc] .email-border { border-color: #f5f5f5 !important; }
        [data-ogsc] .email-accent { color: var(--email-accent) !important; }
        [data-ogsc] .email-highlight { color: var(--email-highlight) !important; }
        [data-ogsc] .email-invert-allowed { background-color: #0b0b0b !important; color: #ffffff !important; }
      </style>
    </head>
    <body class="email-root" style="margin: 0; padding: 0; background-color: #f4f4f4; color: #1a1a1a;">
      <table class="email-outer" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4" style="background-color: #f4f4f4; padding: 20px; color: #1a1a1a;">
        <tr>
          <td align="center" style="background-color: #f4f4f4; color: #1a1a1a;">
            <table class="email-container" width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="background-color: #ffffff; color: #1a1a1a; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td class="email-invert-allowed email-hero" style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 60%, #0b0b0b 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 2px; text-transform: uppercase;">${escapeHtml(weekLabel)}</h1>
                  <p class="email-highlight" style="color: #999; margin: 10px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; --email-highlight: #d4af37;">Grabbarnas Serie &bull; Sammanfattning</p>
                </td>
              </tr>
              <!-- Intro -->
              <tr>
                <td class="email-section" style="padding: 40px 40px 20px 40px; background-color: #ffffff; color: #1a1a1a;">
                  <h2 style="margin: 0; font-size: 28px; color: #000;">Hej ${stats.name}!</h2>
                  <p style="font-size: 16px; color: #666; line-height: 1.6;">Här är din personliga sammanfattning av veckans matcher och prestationer på banan.</p>
                </td>
              </tr>
              <!-- Player Icon -->
              <tr>
                <td class="email-section" style="padding: 0 40px 30px 40px; background-color: #ffffff; color: #1a1a1a;">
                  <table class="email-invert-allowed" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#111111" style="background: #111; border-radius: 10px; color: #fff;">
                    <tr>
                      <td style="padding: 20px;" width="80" align="center">
                        ${renderAvatar(stats.avatarUrl, stats.name)}
                      </td>
                      <td style="padding: 20px 20px 20px 0;">
                        <h3 style="margin: 0; font-size: 20px; color: #fff;">
                          ${stats.name}${featuredBadgeLabel ? ` <span class="email-highlight" style="display: inline-block; margin-left: 8px; padding: 2px 8px; border: 1px solid #333; border-radius: 999px; font-size: 12px; color: #d4af37; text-transform: uppercase; letter-spacing: 1px; --email-highlight: #d4af37;">${featuredBadgeLabel}</span>` : ""}
                        </h3>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Stats Grid -->
              <tr>
                <td class="email-section" style="padding: 0 40px 40px 40px; background-color: #ffffff; color: #1a1a1a;">
                  <table class="email-card" width="100%" border="0" cellspacing="0" cellpadding="10" bgcolor="#fafafa" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #eee;">
                    <tr>
                      <td class="email-stat-cell email-divider" width="50%" align="center" style="border-right: 1px solid #eee; border-bottom: 1px solid #eee;">
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Matcher</p>
                        <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #000;">${stats.matchesPlayed}</p>
                      </td>
                      <td class="email-stat-cell email-divider" width="50%" align="center" style="border-bottom: 1px solid #eee;">
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Vinstprocent</p>
                        <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #000;">${stats.winRate}%</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="email-stat-cell email-divider" width="50%" align="center" style="border-right: 1px solid #eee;">
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">ELO Delta</p>
                        <p class="email-accent" style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: var(--email-accent); --email-accent: ${deltaColor};">${deltaSign}${stats.eloDelta}</p>
                      </td>
                      <td class="email-stat-cell" width="50%" align="center">
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Nuvarande ELO</p>
                        <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #000;">${stats.currentElo}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- MVP Section -->
              ${mvp ? `
              <tr>
                <td class="email-section" style="padding: 0 40px 40px 40px; background-color: #ffffff; color: #1a1a1a;">
                  <div style="background-color: #000; border-radius: 8px; padding: 30px; text-align: center; color: #fff;">
                  <p class="email-highlight" style="margin: 0; font-size: 12px; color: #d4af37; text-transform: uppercase; letter-spacing: 2px; --email-highlight: #d4af37;">Veckans MVP</p>
                  <div style="margin: 14px 0 10px 0; display: inline-block;">
                    ${renderAvatar(mvp.avatarUrl || null, mvp.name)}
                  </div>
                  <h3 style="margin: 0; font-size: 32px; color: #fff;">${mvp.name}</h3>
                    <p style="margin: 0; font-size: 14px; color: #999;">Grym insats i veckan!</p>
                  </div>
                </td>
              </tr>
              ` : ""}
              <!-- Highlight Section -->
              ${highlight ? `
              <tr>
                <td class="email-section" style="padding: 0 40px 40px 40px; background-color: #ffffff; color: #1a1a1a;">
                  <div class="email-light email-border" style="border-left: 4px solid #000; padding: 10px 20px; background-color: #f9f9f9;">
                    <h3 style="margin: 0; font-size: 20px; color: #000;">✨ ${highlight.title}</h3>
                    <p style="margin: 10px 0 0 0; font-size: 16px; color: #444; line-height: 1.5;">${highlight.description}</p>
                  </div>
                </td>
              </tr>
              ` : ""}
              <!-- Synergy & Rivalry -->
              ${(stats.synergy || stats.rivalry) ? `
              <tr>
                <td class="email-section" style="padding: 0 40px 40px 40px; background-color: #ffffff; color: #1a1a1a;">
                  <h3 class="email-border" style="margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #000; display: inline-block;">Synergi & Rivalitet</h3>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td class="email-col" width="50%" style="padding-right: 10px;">
                        <table class="email-light" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f7f7f7" style="background: #f7f7f7; border-radius: 10px; border: 1px solid #eee;">
                          <tr>
                            <td style="padding: 16px;" align="center" width="70">
                              ${stats.synergy ? renderAvatar(stats.synergy.avatarUrl, stats.synergy.name) : ""}
                            </td>
                            <td style="padding: 16px 16px 16px 0;">
                              <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #999;">Veckans synergi</p>
                              <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 700; color: #111;">${stats.synergy ? stats.synergy.name : "Ingen partner spelad"}</p>
                              ${stats.synergy ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #666;">${stats.synergy.games} matcher • ${stats.synergy.winRate}% vinster</p>` : ""}
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td class="email-col" width="50%" style="padding-left: 10px;">
                        <table class="email-light" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f7f7f7" style="background: #f7f7f7; border-radius: 10px; border: 1px solid #eee;">
                          <tr>
                            <td style="padding: 16px;" align="center" width="70">
                              ${stats.rivalry ? renderAvatar(stats.rivalry.avatarUrl, stats.rivalry.name) : ""}
                            </td>
                            <td style="padding: 16px 16px 16px 0;">
                              <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #999;">Veckans rival</p>
                              <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 700; color: #111;">${stats.rivalry ? stats.rivalry.name : "Ingen rival denna vecka"}</p>
                              ${stats.rivalry ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #666;">${stats.rivalry.games} möten • ${stats.rivalry.winRate}% vinster</p>` : ""}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ""}
              <!-- Best Comeback & Form Curve -->
              ${(stats.bestComeback || stats.recentResults.length) ? `
              <tr>
                <td class="email-section" style="padding: 0 40px 40px 40px; background-color: #ffffff; color: #1a1a1a;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td class="email-col" width="50%" style="padding-right: 10px;">
                        <div style="background: #111; border-radius: 10px; padding: 16px; color: #fff; min-height: 120px;">
                          <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #d4af37;">Bästa comeback</p>
                          <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700;">${stats.bestComeback ? stats.bestComeback.score : "Ingen vinst i veckan"}</p>
                          <p style="margin: 6px 0 0 0; font-size: 13px; color: #bbb;">${stats.bestComeback ? `Lag: ${stats.bestComeback.teamsLabel}` : "Spela fler matcher för att få en comeback!"}</p>
                        </div>
                      </td>
                      <td class="email-col" width="50%" style="padding-left: 10px;">
                        <div class="email-light" style="background: #f7f7f7; border-radius: 10px; border: 1px solid #eee; padding: 16px; min-height: 120px;">
                          <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #999;">Formkurva (senaste 5)</p>
                          ${stats.recentResults.length ? `
                            <svg width="120" height="26" viewBox="0 0 120 26" xmlns="http://www.w3.org/2000/svg" aria-label="Formkurva">
                              <polyline points="${sparklinePoints}" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
                              ${stats.recentResults.map((result: string, index: number) => {
                                const x = 8 + index * 18;
                                const y = result === "W" ? 6 : 20;
                                const color = result === "W" ? "#2e7d32" : "#d32f2f";
                                return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" />`;
                              }).join("")}
                            </svg>
                            <p style="margin: 6px 0 0 0; font-size: 12px; color: #666;">${stats.recentResults.join(" ")}</p>
                          ` : `
                            <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">Ingen formkurva ännu.</p>
                          `}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ""}
              <!-- Results Section -->
              ${stats.resultsByDate.length > 0 ? `
              <tr>
                <td class="email-section" style="padding: 0 40px 40px 40px; background-color: #ffffff; color: #1a1a1a;">
                  <h3 class="email-border" style="margin: 0 0 10px 0; font-size: 20px; border-bottom: 2px solid #000; display: inline-block;">Dina resultat</h3>
                  ${stats.resultsByDate.map((entry: { dateLabel: string; scores: string[] }) => `
                    <p style="margin: 0 0 6px 0; font-size: 14px; color: #666;">
                      <span style="font-weight: 600; color: #111;">${entry.dateLabel}:</span> ${entry.scores.join(", ")}
                    </p>
                  `).join("")}
                </td>
              </tr>
              ` : ""}
              <!-- Leaderboard Section -->
              <tr>
                <td class="email-section" style="padding: 0 40px 40px 40px; background-color: #ffffff; color: #1a1a1a;">
                <h3 class="email-border" style="margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #000; display: inline-block;">Topplistan just nu</h3>
                <table width="100%" border="0" cellspacing="0" cellpadding="5">
                    ${leaderboard.map(entry => `
                      <tr>
                        <td class="email-divider" width="24" align="center" style="font-size: 13px; color: #999; border-bottom: 1px solid #eee; padding: 10px 0;">${entry.rank}</td>
                        <td class="email-divider" width="44" align="center" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                          ${renderAvatar(entry.avatarUrl, entry.name, 32)}
                        </td>
                        <td class="email-divider" style="font-size: 14px; border-bottom: 1px solid #eee; padding: 10px 0; color: #333;">
                          ${renderTrendIndicator(entry.trend)}${entry.name}
                        </td>
                        <td class="email-divider" align="right" style="font-size: 14px; border-bottom: 1px solid #eee; padding: 10px 0; color: #333;">${entry.elo}</td>
                      </tr>
                    `).join('')}
                </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #eee; color: #1a1a1a;">
                  <p style="margin: 0; font-size: 12px; color: #999;">
                    Detta är ett automatiskt utskick från Grabbarnas Serie.<br>
                    Vi ses på banan!
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const sendEmailWithRetry = async (
  recipientEmail: string,
  htmlContent: string,
  subject: string,
  resendApiKey: string
): Promise<{ ok: boolean; errorMessage: string; retries: number }> => {
  const maxRetriesOnRateLimit = 2;
  const rateLimitWaitMs = 1200;
  let retries = 0;

  while (true) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: 'Padel-appen <no-reply@padelgrabbarna.club>',
        to: [recipientEmail],
        subject,
        html: htmlContent
      })
    });

    if (response.ok) {
      return { ok: true, errorMessage: "", retries };
    }

    const errText = await response.text();
    if (response.status === 429 && retries < maxRetriesOnRateLimit) {
      retries += 1;
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
