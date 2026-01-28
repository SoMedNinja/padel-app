import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// --- TYPES ---
interface Profile {
  id: string;
  name: string;
}

interface Match {
  id: string;
  team1_ids: (string | null)[];
  team2_ids: (string | null)[];
  team1_sets: number;
  team2_sets: number;
  score_type?: string;
  score_target?: number | null;
  source_tournament_id?: string | null;
  created_at: string;
}

interface PlayerStats {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  games: number;
  history: { matchId: string; delta: number; result: "W" | "L" }[];
}

// --- CONSTANTS ---
const GUEST_ID = "guest";
const ELO_BASELINE = 1000;
const BASE_K = 20;
const HIGH_K = 40;
const MID_K = 30;
const MAX_MARGIN_MULTIPLIER = 1.2;
const MAX_PLAYER_WEIGHT = 1.25;
const MIN_PLAYER_WEIGHT = 0.75;
const EXPECTED_SCORE_DIVISOR = 300;
const PLAYER_WEIGHT_DIVISOR = 800;
const SHORT_SET_MAX = 3;
const LONG_SET_MIN = 6;
const SHORT_POINTS_MAX = 15;
const MID_POINTS_MAX = 21;
const SHORT_MATCH_WEIGHT = 0.5;
const MID_MATCH_WEIGHT = 0.5;
const LONG_MATCH_WEIGHT = 1;

// --- ELO HELPERS ---
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const getKFactor = (games = 0) => {
  if (games < 10) return HIGH_K;
  if (games < 30) return MID_K;
  return BASE_K;
};
const getExpectedScore = (rating: number, opponentRating: number) =>
  1 / (1 + Math.pow(10, (opponentRating - rating) / EXPECTED_SCORE_DIVISOR));
const getMarginMultiplier = (team1Sets: number, team2Sets: number) => {
  const margin = Math.min(2, Math.abs(team1Sets - team2Sets));
  return 1 + Math.min(MAX_MARGIN_MULTIPLIER - 1, margin * 0.1);
};
const getPlayerWeight = (playerElo: number, teamAverageElo: number) => {
  const adjustment = 1 + (teamAverageElo - playerElo) / PLAYER_WEIGHT_DIVISOR;
  return clamp(adjustment, MIN_PLAYER_WEIGHT, MAX_PLAYER_WEIGHT);
};
const getMatchWeight = (match: Match) => {
  if (match.source_tournament_id) return LONG_MATCH_WEIGHT;
  const scoreType = match.score_type || "sets";
  if (scoreType === "sets") {
    const maxSets = Math.max(match.team1_sets, match.team2_sets);
    if (maxSets <= SHORT_SET_MAX) return SHORT_MATCH_WEIGHT;
    if (maxSets >= LONG_SET_MIN) return LONG_MATCH_WEIGHT;
    return MID_MATCH_WEIGHT;
  }
  if (scoreType === "points") {
    const target = match.score_target ?? 0;
    if (target <= SHORT_POINTS_MAX) return SHORT_MATCH_WEIGHT;
    if (target <= MID_POINTS_MAX) return MID_MATCH_WEIGHT;
    return LONG_MATCH_WEIGHT;
  }
  return MID_MATCH_WEIGHT;
};

const buildPlayerDelta = ({
  playerElo,
  playerGames,
  teamAverageElo,
  expectedScore,
  didWin,
  marginMultiplier,
  matchWeight,
}: any) => {
  const playerK = getKFactor(playerGames);
  const weight = getPlayerWeight(playerElo, teamAverageElo);
  const effectiveWeight = didWin ? weight : 1 / weight;
  return Math.round(
    playerK * marginMultiplier * matchWeight * effectiveWeight * ((didWin ? 1 : 0) - expectedScore)
  );
};

// --- CORE LOGIC ---
function calculateEloAt(matches: Match[], profiles: Profile[], untilDate?: string): Record<string, PlayerStats> {
  const players: Record<string, PlayerStats> = {};
  profiles.forEach(p => {
    players[p.id] = { id: p.id, name: p.name, elo: ELO_BASELINE, wins: 0, losses: 0, games: 0, history: [] };
  });

  const sortedMatches = [...matches]
    .filter(m => !untilDate || m.created_at < untilDate)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  sortedMatches.forEach(m => {
    const t1Ids = m.team1_ids.filter(id => id && id !== GUEST_ID) as string[];
    const t2Ids = m.team2_ids.filter(id => id && id !== GUEST_ID) as string[];
    const t1Active = t1Ids.filter(id => players[id]);
    const t2Active = t2Ids.filter(id => players[id]);

    if (!t1Active.length || !t2Active.length) return;

    const e1 = t1Active.reduce((s, id) => s + players[id].elo, 0) / t1Active.length;
    const e2 = t2Active.reduce((s, id) => s + players[id].elo, 0) / t2Active.length;

    const exp1 = getExpectedScore(e1, e2);
    const team1Won = m.team1_sets > m.team2_sets;
    const marginMultiplier = getMarginMultiplier(m.team1_sets, m.team2_sets);
    const matchWeight = getMatchWeight(m);

    t1Active.forEach(id => {
      const p = players[id];
      const delta = buildPlayerDelta({
        playerElo: p.elo,
        playerGames: p.games,
        teamAverageElo: e1,
        expectedScore: exp1,
        didWin: team1Won,
        marginMultiplier,
        matchWeight
      });
      p.elo += delta;
      if (team1Won) p.wins++; else p.losses++;
      p.games++;
      p.history.push({ matchId: m.id, delta, result: team1Won ? "W" : "L" });
    });

    t2Active.forEach(id => {
      const p = players[id];
      const delta = buildPlayerDelta({
        playerElo: p.elo,
        playerGames: p.games,
        teamAverageElo: e2,
        expectedScore: 1 - exp1,
        didWin: !team1Won,
        marginMultiplier,
        matchWeight
      });
      p.elo += delta;
      if (!team1Won) p.wins++; else p.losses++;
      p.games++;
      p.history.push({ matchId: m.id, delta, result: !team1Won ? "W" : "L" });
    });
  });

  return players;
}

function findWeekHighlight(weekMatches: Match[], playersEnd: Record<string, PlayerStats>, playersStart: Record<string, PlayerStats>) {
  if (!weekMatches.length) return null;

  const highlights: any[] = [];

  weekMatches.forEach(match => {
    const getPreElo = (id: string | null) => {
      if (!id || id === GUEST_ID) return 1000;
      const pEnd = playersEnd[id];
      if (!pEnd) return 1000;
      const matchIdx = pEnd.history.findIndex(h => h.matchId === match.id);
      if (matchIdx === -1) return playersStart[id]?.elo ?? 1000;

      let eloBefore = pEnd.elo;
      for (let i = pEnd.history.length - 1; i >= matchIdx; i--) {
        eloBefore -= pEnd.history[i].delta;
      }
      return eloBefore;
    };

    const t1PreElo = match.team1_ids.map(getPreElo);
    const t2PreElo = match.team2_ids.map(getPreElo);
    const avg1 = t1PreElo.reduce((a, b) => a + b, 0) / (t1PreElo.length || 1);
    const avg2 = t2PreElo.reduce((a, b) => a + b, 0) / (t2PreElo.length || 1);
    const exp1 = getExpectedScore(avg1, avg2);
    const team1Won = match.team1_sets > match.team2_sets;
    const winnerExp = team1Won ? exp1 : (1 - exp1);
    const margin = Math.abs(match.team1_sets - match.team2_sets);

    // Upsets are significant underdog wins (< 30% win chance)
    if (winnerExp < 0.30) {
      highlights.push({
        type: 'upset',
        score: (0.5 - winnerExp) * 100,
        title: 'Veckans Skräll',
        description: `Underdog-seger! Laget med endast ${Math.round(winnerExp * 100)}% vinstchans vann med ${match.team1_sets}-${match.team2_sets}.`
      });
    }
    if (margin <= 1) {
       highlights.push({
        type: 'thriller',
        score: 50 - (winnerExp > 0.5 ? winnerExp - 0.5 : 0.5 - winnerExp) * 20,
        title: 'Veckans Rysare',
        description: `En riktig nagelbitare som avgjordes med minsta möjliga marginal (${match.team1_sets}-${match.team2_sets}).`
      });
    }
    if (margin >= 3) {
      highlights.push({
        type: 'crush',
        score: margin * 10,
        title: 'Veckans Kross',
        description: `Total dominans! En övertygande seger med ${match.team1_sets}-${match.team2_sets}.`
      });
    }
  });

  const priority: Record<string, number> = { upset: 3, thriller: 2, crush: 1 };
  highlights.sort((a, b) => {
    if (priority[a.type] !== priority[b.type]) return priority[b.type] - priority[a.type];
    return b.score - a.score;
  });

  return highlights[0] || null;
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfWeekISO = startOfWeek.toISOString();
    const endOfWeekISO = now.toISOString();

    const { data: profiles } = await supabase.from('profiles').select('id, name').eq('is_deleted', false);
    const { data: matches } = await supabase.from('matches').select('*');

    // Paginated user fetch to ensure we get all players
    const allUsers = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data: usersData, error } = await supabase.auth.admin.listUsers({ page, perPage: 50 });
      if (error) throw error;
      allUsers.push(...usersData.users);
      hasMore = usersData.users.length === 50;
      page++;
    }

    if (!profiles || !matches) throw new Error("Failed to fetch data from database");

    const emailMap = new Map(allUsers.map(u => [u.id, u.email]));
    const eloStart = calculateEloAt(matches, profiles, startOfWeekISO);
    const eloEnd = calculateEloAt(matches, profiles, endOfWeekISO);
    const weeklyMatches = matches.filter(m => m.created_at >= startOfWeekISO && m.created_at <= endOfWeekISO);

    const activePlayerIds = new Set<string>();
    weeklyMatches.forEach(m => {
      [...m.team1_ids, ...m.team2_ids].forEach(id => { if (id && id !== GUEST_ID) activePlayerIds.add(id); });
    });

    if (activePlayerIds.size === 0) return new Response(JSON.stringify({ message: "No activity" }), { status: 200 });

    const weeklyStats: Record<string, any> = {};
    activePlayerIds.forEach(id => {
      const pStart = eloStart[id] || { elo: ELO_BASELINE };
      const pEnd = eloEnd[id];
      const pMatches = weeklyMatches.filter(m => m.team1_ids.includes(id) || m.team2_ids.includes(id));
      const wins = pMatches.filter(m => {
        const isT1 = m.team1_ids.includes(id);
        return isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
      }).length;

      const partners: Record<string, number> = {};
      pMatches.forEach(m => {
        const team = m.team1_ids.includes(id) ? m.team1_ids : m.team2_ids;
        team.forEach(pid => { if (pid && pid !== id && pid !== GUEST_ID) partners[pid] = (partners[pid] || 0) + 1; });
      });

      weeklyStats[id] = {
        name: pEnd.name,
        matchesPlayed: pMatches.length,
        eloDelta: pEnd.elo - pStart.elo,
        currentElo: pEnd.elo,
        winRate: Math.round((wins / pMatches.length) * 100),
        partners: Object.entries(partners).map(([pid, count]) => ({
          name: profiles.find(p => p.id === pid)?.name || "Okänd",
          count
        })),
        results: pMatches.map(m => `${m.team1_sets}-${m.team2_sets}`),
        wins,
        id
      };
    });

    const mvpCandidates = Object.values(weeklyStats).map(s => ({
      ...s,
      mvpScore: s.eloDelta + (s.wins / s.matchesPlayed) * 15 + s.matchesPlayed * 0.5
    })).sort((a, b) => b.mvpScore - a.mvpScore);

    const mvp = mvpCandidates.length > 0 ? mvpCandidates[0] : null;
    const highlight = findWeekHighlight(weeklyMatches, eloEnd, eloStart);
    const leaderboard = Object.values(eloEnd).sort((a, b) => b.elo - a.elo).map((p, i) => `${i + 1}. ${p.name}: ${p.elo}`);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error("RESEND_API_KEY missing");

    const emailResults = await Promise.all(Array.from(activePlayerIds).map(async (id) => {
      const email = emailMap.get(id);
      if (!email) return { id, success: false, error: 'Email not found' };
      const stats = weeklyStats[id];

      const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <div style="background: #1976d2; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Veckan i padel</h1>
          </div>

          <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px;">Hej <strong>${stats.name}</strong>!</p>
            <p>Här är sammanfattningen för veckan som gått.</p>

            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #1565c0; font-size: 20px;">Dina stats</h2>
              <table style="width: 100%;">
                <tr><td>🎾 <strong>Matcher:</strong></td><td style="text-align: right;">${stats.matchesPlayed}</td></tr>
                <tr><td>📈 <strong>ELO-förändring:</strong></td><td style="text-align: right; color: ${stats.eloDelta >= 0 ? '#2e7d32' : '#d32f2f'};">${stats.eloDelta > 0 ? '+' : ''}${stats.eloDelta}</td></tr>
                <tr><td>🏆 <strong>Vinstprocent:</strong></td><td style="text-align: right;">${stats.winRate}%</td></tr>
                <tr><td>🔥 <strong>Nuvarande ELO:</strong></td><td style="text-align: right;">${stats.currentElo}</td></tr>
              </table>
            </div>

            ${mvp ? `
              <div style="background: #fff8e1; padding: 15px; border-radius: 8px; border: 1px solid #ffe082; margin-bottom: 20px; text-align: center;">
                <span style="font-size: 24px;">🎖️</span>
                <h3 style="margin: 5px 0; color: #f57f17;">Veckans MVP: ${mvp.name}</h3>
                <p style="margin: 0; font-size: 0.9em;">Grym insats i veckan!</p>
              </div>
            ` : ''}

            ${highlight ? `
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #333; font-size: 18px;">✨ ${highlight.title}</h3>
                <p style="margin: 0;">${highlight.description}</p>
              </div>
            ` : ''}

            <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Dina resultat</h3>
            <p>${stats.results.join(', ')}</p>

            ${stats.partners.length > 0 ? `
              <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Partners</h3>
              <p>${stats.partners.map((p: any) => `${p.name} (${p.count})`).join(', ')}</p>
            ` : ''}

            <div style="margin-top: 30px; padding: 20px; background: #fafafa; border-radius: 8px;">
              <h3 style="margin-top: 0;">Topplistan just nu</h3>
              <div style="font-family: monospace; white-space: pre-wrap;">${leaderboard.join('\n')}</div>
            </div>

            <p style="font-size: 12px; color: #999; margin-top: 40px; text-align: center;">
              Detta är ett automatiskt utskick från Grabbarnas Serie.<br>
              Vi ses på banan!
            </p>
          </div>
        </div>
      `;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: 'Padel-appen <onboarding@resend.dev>',
          to: [email],
          subject: 'Veckan i padel',
          html: html
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Failed to send email to ${email}:`, errorData);
        return { id, success: false, error: errorData };
      }

      return { id, success: true };
    }));

    const successfulCount = emailResults.filter(r => r.success).length;
    return new Response(JSON.stringify({
      success: true,
      sent: successfulCount,
      total: emailResults.length,
      errors: emailResults.filter(r => !r.success)
    }), { status: 200 });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
