import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// --- TYPES ---
interface Profile {
  id: string;
  name: string;
  avatar_url?: string | null;
  featured_badge_id?: string | null;
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
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
const ALLOWED_TEST_ROLES = new Set(["authenticated", "service_role"]);
const ALLOWED_BROADCAST_ROLES = new Set(["admin", "service_role"]);

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

const renderAvatar = (avatarUrl: string | null | undefined, name: string) => {
  // Non-coder note: this helper builds the round avatar HTML used in multiple email sections.
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return avatarUrl
    ? `<img src="${avatarUrl}" alt="${name}" width="56" height="56" style="border-radius: 50%; border: 2px solid #fff; display: block;" />`
    : `<div style="width: 56px; height: 56px; border-radius: 50%; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px;">${initial}</div>`;
};

// Non-coder note: this helper turns player ids into a readable "Team A vs Team B" label.
const buildTeamLabel = (match: Match, profiles: Profile[]) => {
  const team1 = match.team1_ids
    .map(pid => profiles.find(p => p.id === pid)?.name)
    .filter(Boolean)
    .join(" + ");
  const team2 = match.team2_ids
    .map(pid => profiles.find(p => p.id === pid)?.name)
    .filter(Boolean)
    .join(" + ");
  return `${team1 || "Okänt lag"} vs ${team2 || "Okänt lag"}`;
};

const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const toRoman = (index: number) => romanNumerals[index] || `${index + 1}`;
const BADGE_ICON_MAP: Record<string, string> = {
  matches: "🏟️",
  wins: "🏆",
  losses: "🧱",
  streak: "🔥",
  activity: "📅",
  elo: "📈",
  upset: "🎯",
  "win-rate": "📊",
  "elo-lift": "🚀",
  marathon: "⏱️",
  "fast-win": "⚡",
  clutch: "🧊",
  partners: "🤝",
  rivals: "👀",
  "tournaments-played": "🎲",
  "tournaments-wins": "🥇",
  "tournaments-podiums": "🥉",
  "americano-wins": "🇺🇸",
  "mexicano-wins": "🇲🇽",
  "night-owl": "🦉",
  "early-bird": "🌅",
  "clean-sheets": "🧹",
  "giant-slayer": "⚔️",
  "king-of-elo": "👑",
  "most-active": "🐜",
  "win-machine": "🤖",
  "upset-king": "⚡",
  "marathon-pro": "🏃",
  "clutch-pro": "🧊",
  "social-butterfly": "🦋",
  "monthly-giant": "🐘",
  "the-wall": "🧱"
};
const BADGE_THRESHOLD_MAP: Record<string, number[]> = {
  matches: [1, 5, 10, 25, 50, 75, 100, 150, 200],
  wins: [1, 5, 10, 25, 50, 75, 100, 150],
  losses: [1, 5, 10, 25, 50, 75],
  streak: [3, 5, 7, 10, 15],
  activity: [3, 6, 10, 15, 20],
  elo: [1100, 1200, 1300, 1400, 1500],
  upset: [25, 50, 100, 150, 200, 250],
  "win-rate": [50, 60, 70, 80, 90],
  "elo-lift": [50, 100],
  marathon: [1, 3, 5, 10, 15],
  "fast-win": [1, 3, 5, 8, 12],
  clutch: [1, 3, 5, 8, 12],
  partners: [2, 4, 6, 10, 15],
  rivals: [3, 5, 8, 12, 20],
  "tournaments-played": [1, 3, 5, 8],
  "tournaments-wins": [1, 2, 3],
  "tournaments-podiums": [1, 3, 5],
  "americano-wins": [1, 3, 5],
  "mexicano-wins": [1, 3, 5],
  "night-owl": [5, 10, 25],
  "early-bird": [5, 10, 25],
  "clean-sheets": [5, 10, 25, 50]
};
const getBadgeLabelById = (badgeId: string | null | undefined) => {
  if (!badgeId) return "";
  if (BADGE_ICON_MAP[badgeId]) return BADGE_ICON_MAP[badgeId];
  const lastDash = badgeId.lastIndexOf("-");
  if (lastDash < 0) return "";
  const prefix = badgeId.slice(0, lastDash);
  const target = badgeId.slice(lastDash + 1);
  const thresholds = BADGE_THRESHOLD_MAP[prefix];
  if (!thresholds) return "";
  const index = thresholds.indexOf(Number(target));
  if (index < 0) return "";
  // Non-coder note: we add a roman numeral tier so the badge looks like the in-app merit label.
  return `${BADGE_ICON_MAP[prefix] ?? ""} ${toRoman(index)}`.trim();
};

// --- AUTH HELPERS ---
const getBearerToken = (req: Request) => {
  const header = req.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
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

function findWeekHighlight(
  weekMatches: Match[],
  playersEnd: Record<string, PlayerStats>,
  playersStart: Record<string, PlayerStats>,
  profiles: Profile[]
) {
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

    const teamsLabel = buildTeamLabel(match, profiles);
    // Upsets are significant underdog wins (< 30% win chance)
    if (winnerExp < 0.30) {
      highlights.push({
        type: 'upset',
        score: (0.5 - winnerExp) * 100,
        title: 'Veckans Skräll',
        description: `Underdog-seger! Laget med endast ${Math.round(winnerExp * 100)}% vinstchans vann med ${match.team1_sets}-${match.team2_sets}. Lag: ${teamsLabel}.`
      });
    }
    if (margin <= 1) {
       highlights.push({
        type: 'thriller',
        score: 50 - (winnerExp > 0.5 ? winnerExp - 0.5 : 0.5 - winnerExp) * 20,
        title: 'Veckans Rysare',
        description: `En riktig nagelbitare som avgjordes med minsta möjliga marginal (${match.team1_sets}-${match.team2_sets}). Lag: ${teamsLabel}.`
      });
    }
    if (margin >= 3) {
      highlights.push({
        type: 'crush',
        score: margin * 10,
        title: 'Veckans Kross',
        description: `Total dominans! En övertygande seger med ${match.team1_sets}-${match.team2_sets}. Lag: ${teamsLabel}.`
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for specific player request (test mode)
    let targetPlayerId: string | null = null;
    try {
      const body = await req.json();
      targetPlayerId = body.playerId || null;
    } catch {
      // No body or not JSON, proceed as normal
    }

    const token = getBearerToken(req);
    if (!token) {
      // Non-coder note: every request must include a login token so only signed-in users can trigger emails.
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!anonKey) {
      // Non-coder note: the anon key is used only to validate a user login token.
      throw new Error("SUPABASE_ANON_KEY missing");
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      anonKey
    );
    // Non-coder note: this call checks with Supabase that the token belongs to a real user.
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const role =
      data.user.role ??
      data.user.app_metadata?.role ??
      data.user.user_metadata?.role ??
      null;
    if (targetPlayerId) {
      if (!role || !ALLOWED_TEST_ROLES.has(role)) {
        // Non-coder note: test emails are allowed only for signed-in roles we explicitly trust.
        return new Response(JSON.stringify({ error: "Roll saknar behörighet för testläge" }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (!role || !ALLOWED_BROADCAST_ROLES.has(role)) {
      // Non-coder note: mass email sends are restricted to admins/service roles only.
      return new Response(JSON.stringify({ error: "Roll saknar behörighet för massutskick" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const now = new Date();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfWeekISO = startOfWeek.toISOString();
    const endOfWeekISO = now.toISOString();

    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, name, avatar_url, featured_badge_id').eq('is_deleted', false);
    if (profilesError) {
      console.error("Profiles fetch error:", profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const { data: matches, error: matchesError } = await supabase.from('matches').select('*');
    if (matchesError) {
      console.error("Matches fetch error:", matchesError);
      throw new Error(`Failed to fetch matches: ${matchesError.message}`);
    }

    // Paginated user fetch to ensure we get all players
    const allUsers = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data: usersData, error } = await supabase.auth.admin.listUsers({ page, perPage: 50 });
      if (error) throw error;
      if (!usersData?.users) break;
      allUsers.push(...usersData.users);
      hasMore = usersData.users.length === 50;
      page++;
    }

    if (!profiles || !matches) throw new Error("Failed to fetch data from database");

    const emailMap = new Map(allUsers.map(u => [u.id, u.email]));
    const profileNameMap = new Map(profiles.map(profile => [profile.id, profile.name]));
    const eloStart = calculateEloAt(matches, profiles, startOfWeekISO);
    const eloEnd = calculateEloAt(matches, profiles, endOfWeekISO);
    const weeklyMatches = matches.filter(m => m.created_at >= startOfWeekISO && m.created_at <= endOfWeekISO);

    const activePlayerIds = new Set<string>();
    if (targetPlayerId) {
      activePlayerIds.add(targetPlayerId);
    } else {
      weeklyMatches.forEach(m => {
        [...m.team1_ids, ...m.team2_ids].forEach(id => { if (id && id !== GUEST_ID) activePlayerIds.add(id); });
      });
    }

    if (activePlayerIds.size === 0 && !targetPlayerId) {
      console.log("No active players and no targetPlayerId provided");
      return new Response(JSON.stringify({ message: "No activity" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const weeklyStats: Record<string, any> = {};
    Array.from(activePlayerIds).forEach(id => {
      const pStart = eloStart[id] || { elo: ELO_BASELINE };
      const profile = profiles.find(p => p.id === id);
      const pEnd = eloEnd[id] || { elo: ELO_BASELINE, name: profile?.name || "Okänd" };
      const pMatches = weeklyMatches.filter(m => m.team1_ids.includes(id) || m.team2_ids.includes(id));
      const wins = pMatches.filter(m => {
        const isT1 = m.team1_ids.includes(id);
        return isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
      }).length;

      const partners: Record<string, number> = {};
      const partnerStats: Record<string, { games: number; wins: number }> = {};
      const opponentStats: Record<string, { games: number; wins: number }> = {};
      pMatches.forEach(m => {
        const isTeam1 = m.team1_ids.includes(id);
        const didWin = isTeam1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
        const team = isTeam1 ? m.team1_ids : m.team2_ids;
        const opponents = isTeam1 ? m.team2_ids : m.team1_ids;
        team.forEach(pid => {
          if (pid && pid !== id && pid !== GUEST_ID) {
            partners[pid] = (partners[pid] || 0) + 1;
            partnerStats[pid] = partnerStats[pid] || { games: 0, wins: 0 };
            partnerStats[pid].games += 1;
            partnerStats[pid].wins += didWin ? 1 : 0;
          }
        });
        opponents.forEach(pid => {
          if (pid && pid !== GUEST_ID) {
            opponentStats[pid] = opponentStats[pid] || { games: 0, wins: 0 };
            opponentStats[pid].games += 1;
            opponentStats[pid].wins += didWin ? 1 : 0;
          }
        });
      });

      const sortedMatches = [...pMatches].sort((a, b) => a.created_at.localeCompare(b.created_at));
      // Non-coder note: we take the last five wins/losses to build the tiny form curve in the email.
      const recentResults = sortedMatches.slice(-5).map(m => {
        const isT1 = m.team1_ids.includes(id);
        const didWin = isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
        return didWin ? "W" : "L";
      });

      const bestPartnerEntry = Object.entries(partnerStats).sort((a, b) => b[1].games - a[1].games)[0];
      const synergy = bestPartnerEntry
        ? {
          id: bestPartnerEntry[0],
          name: profiles.find(p => p.id === bestPartnerEntry[0])?.name || "Okänd",
          avatarUrl: profiles.find(p => p.id === bestPartnerEntry[0])?.avatar_url || null,
          games: bestPartnerEntry[1].games,
          winRate: Math.round((bestPartnerEntry[1].wins / bestPartnerEntry[1].games) * 100),
        }
        : null;

      const topOpponentEntry = Object.entries(opponentStats).sort((a, b) => b[1].games - a[1].games)[0];
      const rivalry = topOpponentEntry
        ? {
          id: topOpponentEntry[0],
          name: profiles.find(p => p.id === topOpponentEntry[0])?.name || "Okänd",
          avatarUrl: profiles.find(p => p.id === topOpponentEntry[0])?.avatar_url || null,
          games: topOpponentEntry[1].games,
          winRate: Math.round((topOpponentEntry[1].wins / topOpponentEntry[1].games) * 100),
        }
        : null;

      const comebackMatch = sortedMatches
        .filter(m => {
          const isT1 = m.team1_ids.includes(id);
          return isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
        })
        .map(m => {
          const isT1 = m.team1_ids.includes(id);
          const teamSets = isT1 ? m.team1_sets : m.team2_sets;
          const oppSets = isT1 ? m.team2_sets : m.team1_sets;
          return { match: m, margin: teamSets - oppSets };
        })
        .sort((a, b) => a.margin - b.margin)[0];

      weeklyStats[id] = {
        name: pEnd.name,
        matchesPlayed: pMatches.length,
        eloDelta: pEnd.elo - pStart.elo,
        currentElo: pEnd.elo,
        winRate: pMatches.length > 0 ? Math.round((wins / pMatches.length) * 100) : 0,
        partners: Object.entries(partners).map(([pid, count]) => ({
          name: profiles.find(p => p.id === pid)?.name || "Okänd",
          count
        })),
        avatarUrl: profile?.avatar_url || null,
        synergy,
        rivalry,
        bestComeback: comebackMatch
          ? {
            score: `${comebackMatch.match.team1_sets}-${comebackMatch.match.team2_sets}`,
            margin: comebackMatch.margin,
            teamsLabel: buildTeamLabel(comebackMatch.match, profiles),
          }
          : null,
        recentResults,
        results: pMatches.map(m => `${m.team1_sets}-${m.team2_sets}`),
        wins,
        id,
        featuredBadgeId: profile?.featured_badge_id || null
      };
    });

    const mvpCandidates = Object.values(weeklyStats).map(s => ({
      ...s,
      mvpScore: s.eloDelta + (s.matchesPlayed > 0 ? (s.wins / s.matchesPlayed) * 15 : 0) + s.matchesPlayed * 0.5
    })).sort((a, b) => b.mvpScore - a.mvpScore);

    const mvp = mvpCandidates.length > 0 ? mvpCandidates[0] : null;
    const highlight = findWeekHighlight(weeklyMatches, eloEnd, eloStart, profiles);
    // Non-coder note: we keep the leaderboard short so the email matches the preview layout.
    const leaderboard = Object.values(eloEnd)
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${p.name}: ${p.elo}`);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error("RESEND_API_KEY missing");

    const emailResults = await Promise.all(Array.from(activePlayerIds).map(async (id) => {
      const email = emailMap.get(id);
      const name = profileNameMap.get(id) ?? "Okänd";
      if (!email) return { id, name, success: false, error: 'Email not found' };
      const stats = weeklyStats[id];

      const deltaColor = stats.eloDelta >= 0 ? "#2e7d32" : "#d32f2f";
      const deltaSign = stats.eloDelta > 0 ? "+" : "";
      // Non-coder note: we turn the stored badge id into a short label shown beside the player name.
      const featuredBadgeLabel = getBadgeLabelById(stats.featuredBadgeId);
      // Non-coder note: the form curve turns W/L into SVG points so it renders in email clients.
      const sparklinePoints = stats.recentResults
        .map((result: string, index: number) => {
          const x = 8 + index * 18;
          const y = result === "W" ? 6 : 20;
          return `${x},${y}`;
        })
        .join(" ");

      // Non-coder note: the min-height styles keep the comeback and form cards the same visual size.
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #1a1a1a; }
            h1, h2, h3 { font-family: 'Playfair Display', serif; }
          </style>
        </head>
        <body>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 60%, #0b0b0b 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 2px; text-transform: uppercase;">Veckan i Padel</h1>
                      <p style="color: #999; margin: 10px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Grabbarnas Serie &bull; Sammanfattning</p>
                    </td>
                  </tr>
                  <!-- Intro -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px;">
                      <h2 style="margin: 0; font-size: 28px; color: #000;">Hej ${stats.name}!</h2>
                      <p style="font-size: 16px; color: #666; line-height: 1.6;">Här är din personliga sammanfattning av veckans matcher och prestationer på banan.</p>
                    </td>
                  </tr>
                  <!-- Player Icon -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #111; border-radius: 10px; color: #fff;">
                        <tr>
                          <td style="padding: 20px;" width="80" align="center">
                            ${renderAvatar(stats.avatarUrl, stats.name)}
                          </td>
                          <td style="padding: 20px 20px 20px 0;">
                            <h3 style="margin: 0; font-size: 20px; color: #fff;">
                              ${stats.name}${featuredBadgeLabel ? ` <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border: 1px solid #333; border-radius: 999px; font-size: 12px; color: #d4af37; text-transform: uppercase; letter-spacing: 1px;">${featuredBadgeLabel}</span>` : ""}
                            </h3>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Stats Grid -->
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #eee;">
                        <tr>
                          <td width="50%" align="center" style="border-right: 1px solid #eee; border-bottom: 1px solid #eee;">
                            <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Matcher</p>
                            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #000;">${stats.matchesPlayed}</p>
                          </td>
                          <td width="50%" align="center" style="border-bottom: 1px solid #eee;">
                            <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Vinstprocent</p>
                            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #000;">${stats.winRate}%</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" align="center" style="border-right: 1px solid #eee;">
                            <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">ELO Delta</p>
                            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: ${deltaColor};">${deltaSign}${stats.eloDelta}</p>
                          </td>
                          <td width="50%" align="center">
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
                    <td style="padding: 0 40px 40px 40px;">
                      <div style="background-color: #000; border-radius: 8px; padding: 30px; text-align: center; color: #fff;">
                      <p style="margin: 0; font-size: 12px; color: #d4af37; text-transform: uppercase; letter-spacing: 2px;">Veckans MVP</p>
                      <div style="margin: 14px 0 10px 0;">
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
                    <td style="padding: 0 40px 40px 40px;">
                      <div style="border-left: 4px solid #000; padding: 10px 20px; background-color: #f9f9f9;">
                        <h3 style="margin: 0; font-size: 20px; color: #000;">✨ ${highlight.title}</h3>
                        <p style="margin: 10px 0 0 0; font-size: 16px; color: #444; line-height: 1.5;">${highlight.description}</p>
                      </div>
                    </td>
                  </tr>
                  ` : ""}
                  <!-- Synergy & Rivalry -->
                  ${(stats.synergy || stats.rivalry) ? `
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <h3 style="margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #000; display: inline-block;">Synergi & Rivalitet</h3>
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td width="50%" style="padding-right: 10px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f7f7f7; border-radius: 10px; border: 1px solid #eee;">
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
                          <td width="50%" style="padding-left: 10px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f7f7f7; border-radius: 10px; border: 1px solid #eee;">
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
                    <td style="padding: 0 40px 40px 40px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td width="50%" style="padding-right: 10px;">
                            <div style="background: #111; border-radius: 10px; padding: 16px; color: #fff; min-height: 120px;">
                              <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #d4af37;">Bästa comeback</p>
                              <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700;">${stats.bestComeback ? stats.bestComeback.score : "Ingen vinst i veckan"}</p>
                              <p style="margin: 6px 0 0 0; font-size: 13px; color: #bbb;">${stats.bestComeback ? `Lag: ${stats.bestComeback.teamsLabel}` : "Spela fler matcher för att få en comeback!"}</p>
                            </div>
                          </td>
                          <td width="50%" style="padding-left: 10px;">
                            <div style="background: #f7f7f7; border-radius: 10px; border: 1px solid #eee; padding: 16px; min-height: 120px;">
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
                  ${stats.results.length > 0 ? `
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <h3 style="margin: 0 0 10px 0; font-size: 20px; border-bottom: 2px solid #000; display: inline-block;">Dina resultat</h3>
                      <p style="margin: 0; font-size: 14px; color: #666;">${stats.results.join(', ')}</p>
                    </td>
                  </tr>
                  ` : ""}
                  <!-- Leaderboard Section -->
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <h3 style="margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #000; display: inline-block;">Topplistan just nu</h3>
                      <table width="100%" border="0" cellspacing="0" cellpadding="5">
                        ${leaderboard.map(line => `
                          <tr>
                            <td style="font-size: 14px; border-bottom: 1px solid #eee; padding: 10px 0; color: #333;">${line}</td>
                          </tr>
                        `).join('')}
                      </table>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
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
        return { id, name, success: false, error: errorData };
      }

      return { id, name, success: true };
    }));

    const successfulCount = emailResults.filter(r => r.success).length;
    console.log(`Successfully sent ${successfulCount}/${emailResults.length} emails`);

    return new Response(JSON.stringify({
      success: true,
      sent: successfulCount,
      total: emailResults.length,
      errors: emailResults.filter(r => !r.success)
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
