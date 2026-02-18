import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// --- TYPES ---
interface Profile {
  id: string;
  name: string;
  avatar_url?: string | null;
  featured_badge_id?: string | null;
  email?: string | null;
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-token',
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
const SINGLES_MATCH_WEIGHT = 0.5;
const ALLOWED_TEST_ROLES = new Set(["authenticated", "service_role"]);
const ALLOWED_BROADCAST_ROLES = new Set(["admin", "service_role"]);
const WEEKLY_MIN_GAMES = 1;

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
  if (!Number.isFinite(team1Sets) || !Number.isFinite(team2Sets)) return 1;
  const diff = Math.abs(team1Sets - team2Sets);
  // User request: 2 set difference (e.g. 8-6) should have same impact as 1 set difference (1.1x).
  // This means margin 1 for diff 1 or 2, and margin 2 for diff 3 or more.
  const margin = diff > 2 ? 2 : (diff > 0 ? 1 : 0);
  return 1 + Math.min(MAX_MARGIN_MULTIPLIER - 1, margin * 0.1);
};
const getPlayerWeight = (playerElo: number, teamAverageElo: number) => {
  if (!Number.isFinite(playerElo) || !Number.isFinite(teamAverageElo)) return 1;
  const adjustment = 1 + (teamAverageElo - playerElo) / PLAYER_WEIGHT_DIVISOR;
  return clamp(adjustment, MIN_PLAYER_WEIGHT, MAX_PLAYER_WEIGHT);
};
const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

const getSinglesAdjustedMatchWeight = (match: Match, isSinglesMatch: boolean) => {
  return getMatchWeight(match) * (isSinglesMatch ? SINGLES_MATCH_WEIGHT : 1);
};

const getIsoWeek = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week: weekNo, year: d.getFullYear() };
};

const getISOWeekRange = (week: number, year: number) => {
  const firstThursday = new Date(year, 0, 1);
  while (firstThursday.getDay() !== 4) {
    firstThursday.setDate(firstThursday.getDate() + 1);
  }
  const week1Monday = new Date(firstThursday);
  week1Monday.setDate(firstThursday.getDate() - 3);
  week1Monday.setHours(0, 0, 0, 0);

  const start = new Date(week1Monday);
  start.setDate(week1Monday.getDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
};

interface PlayerDeltaParams {
  playerElo: number;
  playerGames: number;
  teamAverageElo: number;
  expectedScore: number;
  didWin: boolean;
  marginMultiplier: number;
  matchWeight: number;
}

const buildPlayerDelta = ({
  playerElo,
  playerGames,
  teamAverageElo,
  expectedScore,
  didWin,
  marginMultiplier,
  matchWeight,
}: PlayerDeltaParams) => {
  const playerK = getKFactor(playerGames);
  const weight = getPlayerWeight(playerElo, teamAverageElo);
  const effectiveWeight = didWin ? weight : 1 / weight;
  return Math.round(
    playerK * marginMultiplier * matchWeight * effectiveWeight * ((didWin ? 1 : 0) - expectedScore)
  );
};

const renderAvatar = (avatarUrl: string | null | undefined, name: string, size = 56) => {
  // Non-coder note: this helper builds the round avatar HTML used in multiple email sections.
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return avatarUrl
    ? `<img src="${avatarUrl}" alt="${name}" width="${size}" height="${size}" style="border-radius: 50%; border: 2px solid #fff; display: block;" />`
    : `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${Math.max(12, Math.round(size / 2.8))}px;">${initial}</div>`;
};

// Non-coder note: this formats dates like "12 maj" so we can label result groups.
const formatShortDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" }).format(date);
};

// Non-coder note: this keeps scores consistent across the email.
const formatScore = (s1: number, s2: number) => `${s1}–${s2}`;

// Non-coder note: this helper turns player ids into a readable "Team A vs Team B" label.
const buildTeamLabel = (match: Match, profileMap: Map<string, Profile>) => {
  const resolveName = (pid: string | null) => {
    if (!pid || pid === GUEST_ID) return "Gästspelare";
    if (pid.startsWith("name:")) return escapeHtml(pid.replace("name:", ""));
    return profileMap.get(pid)?.name || "Gästspelare";
  };
  const team1 = match.team1_ids.map(resolveName).join(" + ");
  const team2 = match.team2_ids.map(resolveName).join(" + ");
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

// --- MVP HELPERS ---
const getMvpWinner = (candidates: any[]) => {
  let winner: any = null;

  for (let i = 0; i < candidates.length; i++) {
    const r = candidates[i];
    if (r.matchesPlayed < WEEKLY_MIN_GAMES) continue;
    if (!winner) {
      winner = r;
      continue;
    }

    const scoreDiff = r.score - winner.score;
    if (scoreDiff > 0.001) {
      winner = r;
    } else if (scoreDiff > -0.001) {
      const eloGainDiff = r.periodEloGain - winner.periodEloGain;
      if (eloGainDiff > 0.001) {
        winner = r;
      } else if (eloGainDiff > -0.001) {
        if (r.eloNet > winner.eloNet) {
          winner = r;
        } else if (r.eloNet === winner.eloNet) {
          if (r.wins > winner.wins) {
            winner = r;
          } else if (r.wins === winner.wins) {
            if (r.name.localeCompare(winner.name) < 0) {
              winner = r;
            }
          }
        }
      }
    }
  }

  return winner;
};

// --- AUTH HELPERS ---
const getBearerToken = (req: Request) => {
  const header = req.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
};

// --- CORE LOGIC ---
function calculateElo(matches: Match[], profileMap: Map<string, Profile>, initialState?: Record<string, PlayerStats>): Record<string, PlayerStats> {
  const players: Record<string, PlayerStats> = {};

  if (initialState) {
    for (const [id, stats] of Object.entries(initialState)) {
      players[id] = { ...stats, history: [...stats.history] };
    }
  }

  const ensurePlayer = (id: string) => {
    if (players[id]) return;
    const p = profileMap.get(id);
    const name = p ? p.name : (id.startsWith("name:") ? escapeHtml(id.replace("name:", "")) : "Okänd");
    players[id] = { id, name, elo: ELO_BASELINE, wins: 0, losses: 0, games: 0, history: [] };
  };

  profileMap.forEach(p => {
    ensurePlayer(p.id);
  });

  const sortedMatches = [...matches].sort((a, b) => a.created_at.localeCompare(b.created_at));

  sortedMatches.forEach(m => {
    const t1Raw = m.team1_ids.filter(id => id && id !== GUEST_ID) as string[];
    const t2Raw = m.team2_ids.filter(id => id && id !== GUEST_ID) as string[];

    const t1Active: string[] = [];
    const t2Active: string[] = [];

    t1Raw.forEach(id => {
      ensurePlayer(id);
      if (players[id]) t1Active.push(id);
    });
    t2Raw.forEach(id => {
      ensurePlayer(id);
      if (players[id]) t2Active.push(id);
    });

    if (!t1Active.length || !t2Active.length) return;

    const e1 = t1Active.reduce((s, id) => s + players[id].elo, 0) / t1Active.length;
    const e2 = t2Active.reduce((s, id) => s + players[id].elo, 0) / t2Active.length;

    const exp1 = getExpectedScore(e1, e2);
    const team1Won = m.team1_sets > m.team2_sets;
    const marginMultiplier = getMarginMultiplier(m.team1_sets, m.team2_sets);
    const isSinglesMatch = t1Active.length === 1 && t2Active.length === 1;
    const matchWeight = getSinglesAdjustedMatchWeight(m, isSinglesMatch);

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
  profileMap: Map<string, Profile>
) {
  if (!weekMatches.length) return null;

  const highlights: any[] = [];

  weekMatches.forEach(match => {
    const getPreElo = (id: string | null) => {
      if (!id || id === GUEST_ID) return 1000;
      const pEnd = playersEnd[id];
      // If pEnd doesn't exist, it might be a guest not active in the current calculation
      if (!pEnd) return playersStart[id]?.elo ?? 1000;

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

    const teamsLabel = buildTeamLabel(match, profileMap);
    const totalElo = avg1 + avg2;

    // 1. Upset?
    if (winnerExp < 0.35) {
      highlights.push({
        type: 'upset',
        score: (0.5 - winnerExp) * 100,
        title: 'Veckans Skräll',
        description: `Underdog-seger! Laget med endast ${Math.round(winnerExp * 100)}% vinstchans vann med ${match.team1_sets}-${match.team2_sets}. Lag: ${teamsLabel}.`
      });
    }
    // 2. Thriller?
    if (margin <= 1) {
       highlights.push({
        type: 'thriller',
        score: 50 - (winnerExp > 0.5 ? winnerExp - 0.5 : 0.5 - winnerExp) * 20,
        title: 'Veckans Rysare',
        description: `En riktig nagelbitare som avgjordes med minsta möjliga marginal (${match.team1_sets}-${match.team2_sets}). Lag: ${teamsLabel}.`
      });
    }
    // 3. Crush?
    if (margin >= 3) {
      highlights.push({
        type: 'crush',
        score: margin * 10,
        title: 'Veckans Kross',
        description: `Total dominans! En övertygande seger med ${match.team1_sets}-${match.team2_sets}. Lag: ${teamsLabel}.`
      });
    }
    // 4. Titans?
    if (totalElo > 2200) {
      highlights.push({
        type: 'titans',
        score: (totalElo - 2000) / 10,
        title: 'Veckans Giganter',
        description: `Mötet med veckans högsta samlade ELO-poäng (${Math.round(totalElo)}). Lag: ${teamsLabel}.`
      });
    }
  });

  const priority: Record<string, number> = { upset: 4, thriller: 3, crush: 2, titans: 1 };
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

  const authHeader = req.headers.get("Authorization") ?? "";
  // Note for non-coders: this temporary log helps us prove if the request reached the function with auth attached.
  console.log(JSON.stringify({
    event: "weekly-summary.auth-header-check",
    hasAuthorizationHeader: authHeader.length > 0,
    hasBearerPrefix: authHeader.startsWith("Bearer "),
  }));

  const jsonResponse = (payload: Record<string, any>, status = 200) => {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const cronToken = Deno.env.get('WEEKLY_SUMMARY_CRON_TOKEN') ?? '';
    const cronHeader = req.headers.get("x-cron-token");
    const isCronRequest = Boolean(cronToken) && cronHeader === cronToken;

    if (!supabaseUrl || !serviceRoleKey) {
      // Non-coder note: the server needs these secrets to read data and send emails on behalf of the app.
      return jsonResponse({
        success: false,
        error: "SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY saknas.",
        hint: "Lägg till variablerna i Supabase Functions > Environment Variables."
      });
    }

    if (!anonKey && !isCronRequest) {
      // Non-coder note: the anon key is used only to validate a user login token.
      return jsonResponse({
        success: false,
        error: "SUPABASE_ANON_KEY saknas.",
        hint: "Lägg till variabeln i Supabase Functions > Environment Variables."
      });
    }

    if (!resendApiKey) {
      // Non-coder note: we cannot send email without the Resend API key.
      return jsonResponse({
        success: false,
        error: "RESEND_API_KEY saknas.",
        hint: "Lägg till variabeln i Supabase Functions > Environment Variables."
      });
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // Parse request body
    let targetPlayerId: string | null = null;
    let requestedTimeframe: string | null = null;
    let requestedWeek: number | null = null;
    let requestedYear: number | null = null;
    let previewOnly = false;

    try {
      const body = await req.json();
      targetPlayerId = body.playerId || null;
      requestedTimeframe = body.timeframe || null;
      requestedWeek = body.week || null;
      requestedYear = body.year || null;
      // Non-coder note: previewOnly returns the final HTML without sending an email, useful for native app previews.
      previewOnly = body.previewOnly === true;
    } catch {
      // No body or not JSON, proceed with defaults
    }

    if (cronHeader && !isCronRequest) {
      // Non-coder note: cron calls must include the exact shared secret we configured for scheduled jobs.
      return new Response(JSON.stringify({ error: "Invalid cron token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let userId: string | null = null;
    let role: string | null = null;

    if (!isCronRequest) {
      const token = getBearerToken(req);
      if (!token) {
        // Non-coder note: every request must include a login token so only signed-in users can trigger emails.
        return new Response(JSON.stringify({ error: "Missing bearer token" }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const authClient = createClient(
        supabaseUrl,
        anonKey
      );
      // Non-coder note: this call checks with Supabase that the token belongs to a real user.
      const { data: authData, error } = await authClient.auth.getUser(token);
      if (error || !authData?.user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      userId = authData.user.id;
      role =
        authData.user.role ??
        authData.user.app_metadata?.role ??
        null;
    } else {
      // Non-coder note: cron runs act like a trusted server request, so we treat them as service-role calls.
      role = "service_role";
    }

    // Determine timeframe
    let start: Date;
    let end: Date;
    let weekLabel: string;

    const now = new Date();

    if (requestedTimeframe === "7days") {
      end = now;
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      weekLabel = "SENASTE 7 DAGARNA";
    } else if (requestedTimeframe === "30days") {
      end = now;
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      weekLabel = "SENASTE 30 DAGARNA";
    } else if (requestedTimeframe === "isoWeek" && requestedWeek && requestedYear) {
      const range = getISOWeekRange(requestedWeek, requestedYear);
      start = range.start;
      end = range.end;
      weekLabel = `VECKA ${requestedWeek} I PADEL`;
    } else {
      // Default to the previous full ISO week
      const lastWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { week, year } = getIsoWeek(lastWeekDate);
      const range = getISOWeekRange(week, year);
      start = range.start;
      end = range.end;
      weekLabel = `VECKA ${week} I PADEL`;
    }

    const startOfWeekISO = start.toISOString();
    const endOfWeekISO = end.toISOString();

    // Non-coder note: we fetch the current user's profile separately so admin checks don't fail
    // just because a profile is soft-deleted or filtered out from the main list.
    const { data: currentUserProfileData, error: currentUserProfileError } = userId
      ? await supabase
        .from('profiles')
        .select('id, is_admin, is_deleted')
        .eq('id', userId)
        .maybeSingle()
      : { data: null, error: null };
    if (currentUserProfileError) {
      console.error("Current profile fetch error:", currentUserProfileError);
      throw new Error(`Failed to fetch current profile: ${currentUserProfileError.message}`);
    }

    const { data: rawProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, featured_badge_id, is_admin, email')
      .eq('is_deleted', false);
    if (profilesError) {
      console.error("Profiles fetch error:", profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    // Security: Sanitize profile data early to prevent injection in emails
    const profiles = (rawProfiles || []).map(p => ({
      ...p,
      name: escapeHtml(p.name || "Okänd"),
      avatar_url: p.avatar_url ? escapeHtml(p.avatar_url) : null,
      email: p.email ?? null
    }));

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    const { data: matches, error: matchesError } = await supabase.from('matches').select('*');
    if (matchesError) {
      console.error("Matches fetch error:", matchesError);
      throw new Error(`Failed to fetch matches: ${matchesError.message}`);
    }

    if (!profiles || !matches) throw new Error("Failed to fetch data from database");

    // Security: Verify admin status from database and enforce test email ownership
    const isActualAdmin = currentUserProfileData?.is_admin === true || role === 'service_role';

    if (targetPlayerId) {
      if (!role || !ALLOWED_TEST_ROLES.has(role)) {
        if (!isActualAdmin) {
          // Non-coder note: test emails are allowed only for signed-in roles we explicitly trust.
          return new Response(JSON.stringify({ error: "Roll saknar behörighet för testläge" }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    } else if (!isActualAdmin) {
      // Non-coder note: mass email sends are restricted to admins/service roles only.
      const profileHint = currentUserProfileData
        ? "Din profil saknar adminflagga."
        : "Ingen profil hittades som matchar din inloggade användare.";
      return new Response(JSON.stringify({ error: `Roll saknar behörighet för massutskick. ${profileHint}` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (targetPlayerId && !isActualAdmin && targetPlayerId !== userId) {
      return new Response(JSON.stringify({ error: "Du kan bara skicka test-mail till dig själv" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const weeklyMatches = matches.filter(m => m.created_at >= startOfWeekISO && m.created_at <= endOfWeekISO);

    const activePlayerIds = new Set<string>();
    if (targetPlayerId) {
      activePlayerIds.add(targetPlayerId);
    } else {
      weeklyMatches.forEach(m => {
        [...m.team1_ids, ...m.team2_ids].forEach(id => { if (id && id !== GUEST_ID) activePlayerIds.add(id); });
      });
    }

    // Performance Optimization: Fetch only active users instead of all users.
    const activeIdsArray = Array.from(activePlayerIds);
    const activeIdsSet = new Set(activeIdsArray);
    const allUsers: any[] = [];
    const userMap = new Map<string, any>();

    // Fetch users in bulk using listUsers with pagination to avoid N+1 requests
    let page = 1;
    const PER_PAGE = 1000;

    // We continue fetching until we either run out of users or find all active users
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });

      if (error) {
        console.error("Error fetching users list:", error);
        // If bulk fetch fails, we abort the user resolution but continue with empty list
        break;
      }

      const users = data?.users || [];
      if (users.length === 0) break;

      // Only store users that are in the active list to save memory
      users.forEach((u: any) => {
        if (activeIdsSet.has(u.id)) {
          userMap.set(u.id, u);
        }
      });

      // Optimization: Stop fetching if we have found all active users
      if (userMap.size === activeIdsSet.size) break;

      if (users.length < PER_PAGE) break;
      page++;
    }

    // Populate allUsers from the map, only including found users
    activeIdsArray.forEach(id => {
      if (userMap.has(id)) {
        allUsers.push(userMap.get(id));
      } else {
        // Log missing users similar to original implementation
        console.warn(`User ${id} not found in Auth users list.`);
      }
    });

    // Non-coder note: Supabase stores emails in slightly different places depending on sign-in method,
    // so we look in a few common spots before deciding an email is missing.
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

    // Non-coder note: this map lets us quickly check if a player has a matching auth user record.
    const authUserMap = new Map(allUsers.map(u => [u.id, u]));
    const emailMap = new Map(allUsers.map(u => [u.id, resolveUserEmail(u)]));
    const profileEmailMap = new Map(profiles.map(profile => [profile.id, profile.email ?? null]));
    // Non-coder note: Auth is the primary email source, but we fall back to profile emails so weekly
    // sends still go out if Auth doesn't return an address for someone.
    const profileNameMap = new Map(profiles.map(profile => [profile.id, profile.name]));

    // Optimization: Calculate ELO incrementally to avoid reprocessing full history twice.
    const sortedAllMatches = [...matches].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const matchesBefore = sortedAllMatches.filter(m => m.created_at < startOfWeekISO);
    // Note: eloEnd uses matches < endOfWeekISO, so we filter accordingly.
    const matchesWeekForElo = sortedAllMatches.filter(m => m.created_at >= startOfWeekISO && m.created_at < endOfWeekISO);

    const eloStart = calculateElo(matchesBefore, profileMap);
    const eloEnd = calculateElo(matchesWeekForElo, profileMap, eloStart);

    if (activePlayerIds.size === 0 && !targetPlayerId) {
      console.log("No active players and no targetPlayerId provided");
      return new Response(JSON.stringify({ message: "No activity" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const weeklyStats: Record<string, any> = {};

    // Performance Optimization: Pre-calculate match map to avoid O(N*M) lookups
    const playerMatchesMap = new Map<string, Match[]>();
    weeklyMatches.forEach(m => {
      const uniqueIds = new Set([...m.team1_ids, ...m.team2_ids]);
      uniqueIds.forEach(pid => {
        if (pid && pid !== GUEST_ID) {
          if (!playerMatchesMap.has(pid)) {
            playerMatchesMap.set(pid, []);
          }
          playerMatchesMap.get(pid)!.push(m);
        }
      });
    });

    Array.from(activePlayerIds).forEach(id => {
      const pStart = eloStart[id] || { elo: ELO_BASELINE };
      const profile = profileMap.get(id);
      const pEnd = eloEnd[id] || { elo: ELO_BASELINE, name: profile?.name || "Okänd" };
      const pMatches = playerMatchesMap.get(id) || [];
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
          name: profileMap.get(bestPartnerEntry[0])?.name || "Okänd",
          avatarUrl: profileMap.get(bestPartnerEntry[0])?.avatar_url || null,
          games: bestPartnerEntry[1].games,
          winRate: Math.round((bestPartnerEntry[1].wins / bestPartnerEntry[1].games) * 100),
        }
        : null;

      const topOpponentEntry = Object.entries(opponentStats).sort((a, b) => b[1].games - a[1].games)[0];
      const rivalry = topOpponentEntry
        ? {
          id: topOpponentEntry[0],
          name: profileMap.get(topOpponentEntry[0])?.name || "Okänd",
          avatarUrl: profileMap.get(topOpponentEntry[0])?.avatar_url || null,
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

      // Non-coder note: we group scores by date so one date label can cover multiple games.
      const resultsByDate = [...pMatches]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .reduce((acc: { dateLabel: string; scores: string[] }[], match) => {
          const dateLabel = formatShortDate(match.created_at);
          if (!dateLabel) return acc;
          const scoreLabel = formatScore(match.team1_sets, match.team2_sets);
          const existing = acc.find(entry => entry.dateLabel === dateLabel);
          if (existing) {
            existing.scores.push(scoreLabel);
          } else {
            acc.push({ dateLabel, scores: [scoreLabel] });
          }
          return acc;
        }, []);

      weeklyStats[id] = {
        name: pEnd.name,
        matchesPlayed: pMatches.length,
        eloDelta: pEnd.elo - pStart.elo,
        currentElo: pEnd.elo,
        winRate: pMatches.length > 0 ? Math.round((wins / pMatches.length) * 100) : 0,
        partners: Object.entries(partners).map(([pid, count]) => ({
          name: profileMap.get(pid)?.name || "Okänd",
          count
        })),
        avatarUrl: profile?.avatar_url || null,
        synergy,
        rivalry,
        bestComeback: comebackMatch
          ? {
            score: `${comebackMatch.match.team1_sets}-${comebackMatch.match.team2_sets}`,
            margin: comebackMatch.margin,
            teamsLabel: buildTeamLabel(comebackMatch.match, profileMap),
          }
          : null,
        recentResults,
        resultsByDate,
        wins,
        id,
        featuredBadgeId: profile?.featured_badge_id || null
      };
    });

    const mvpCandidates = Object.values(weeklyStats).map(s => ({
      ...s,
      score: s.eloDelta + (s.matchesPlayed > 0 ? (s.wins / s.matchesPlayed) * 15 : 0) + s.matchesPlayed * 0.5,
      periodEloGain: s.eloDelta,
      eloNet: s.currentElo
    }));

    const mvp = getMvpWinner(mvpCandidates);
    const highlight = findWeekHighlight(weeklyMatches, eloEnd, eloStart, profileMap);
    // Non-coder note: we compare the current leaderboard to last week's to show movement arrows.
    const previousRanks = new Map(
      Object.values(eloStart)
        .sort((a, b) => b.elo - a.elo)
        .map((player, index) => [player.id, index + 1])
    );
    // Non-coder note: we keep the leaderboard short so the email matches the preview layout.
    const leaderboard = Object.values(eloEnd)
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 5)
      .map((player, index) => {
        const currentRank = index + 1;
        const previousRank = previousRanks.get(player.id);
        const movement = previousRank ? previousRank - currentRank : 0;
        const trend = movement > 0 ? "up" : movement < 0 ? "down" : "same";
        const avatarUrl = profileMap.get(player.id)?.avatar_url || null;
        return {
          id: player.id,
          name: player.name,
          elo: player.elo,
          rank: currentRank,
          trend,
          avatarUrl,
        };
      });

    // Non-coder note: we send emails one-by-one with a short pause to avoid provider rate limits.
    const maxRetriesOnRateLimit = 2;
    const rateLimitWaitMs = 1200;
    // const perEmailDelayMs = 600; // Removed per-email delay for parallel processing
    const sendEmailWithRetry = async (recipientEmail: string, htmlContent: string, subject: string) => {
      let retries = 0;
      while (true) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
          body: JSON.stringify({
            // Non-coder note: Resend requires a verified domain in the "from" address for real recipients.
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
          // Note for non-coders: "too many requests" means we should pause and retry a few times.
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

    // Encapsulate email generation and sending logic
    const processPlayer = async (id: string) => {
      const email = emailMap.get(id) ?? profileEmailMap.get(id);
      const name = profileNameMap.get(id) ?? "Okänd";
      const authUser = authUserMap.get(id);
      if (!email) {
        const missingEmailError = !authUser
          ? "No auth user"
          : !authUser.email
            ? "Auth user email empty"
            : "Email not found";
        return { id, name, success: false, error: missingEmailError };
      }
      const stats = weeklyStats[id];

      const deltaColor = stats.eloDelta >= 0 ? "#2e7d32" : "#d32f2f";
      const deltaSign = stats.eloDelta > 0 ? "+" : "";
      // Non-coder note: we turn the stored badge id into a short label shown beside the player name.
      const featuredBadgeLabel = getBadgeLabelById(stats.featuredBadgeId);
      // Non-coder note: arrows make it easy to spot who climbed or fell compared to last week.
      const renderTrendIndicator = (trend: "up" | "down" | "same") => {
        const config = trend === "up"
          ? { symbol: "▲", color: "#2e7d32" }
          : trend === "down"
            ? { symbol: "▼", color: "#d32f2f" }
            : { symbol: "→", color: "#999" };
        return `<span style="color: ${config.color}; font-weight: 700; margin-right: 6px;">${config.symbol}</span>`;
      };
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
          <!-- Non-coder note: we declare support for light + dark so Gmail can keep the email dark in dark mode. -->
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
          <style>
            /* Non-coder note: we list both schemes so email apps can switch themes. */
            :root { color-scheme: light dark; supported-color-schemes: light dark; }
            body { font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #1a1a1a; }
            h1, h2, h3 { font-family: 'Playfair Display', serif; }
            /* Non-coder note: Apple Mail may flip colors, so we pin light backgrounds on tables/cells. */
            table, td { background-color: #ffffff; color: #1a1a1a; }
            /* Non-coder note: allow the intentionally dark hero/feature blocks to stay dark. */
            .email-invert-allowed,
            .email-invert-allowed td { background-color: #111111 !important; color: #ffffff !important; }
            /* Non-coder note: this mobile rule stacks columns and reduces padding for small screens. */
            @media screen and (max-width: 620px) {
              .email-outer { padding: 12px !important; }
              .email-container { width: 100% !important; max-width: 100% !important; }
              .email-hero { padding: 32px 16px !important; }
              .email-section { padding-left: 20px !important; padding-right: 20px !important; }
              .email-stat-cell { display: block !important; width: 100% !important; border-right: 0 !important; border-bottom: 1px solid #eee !important; }
              .email-col { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
              .email-col:last-child { padding-bottom: 0 !important; }
            }
            /* Non-coder note: prefers-color-scheme swaps to a dark theme on supported clients (ex: Gmail). */
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
            /* Non-coder note: Outlook dark mode uses data-ogsc, so we mirror the dark palette there too. */
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

      if (previewOnly) {
        // Non-coder note: we return the first fully-rendered email so iOS can show an exact preview.
        return { id, name, success: true, previewHtml: html };
      }

      const result = await sendEmailWithRetry(email, html, weekLabel);

      if (!result.ok) {
        console.error(`Failed to send email to ${email}:`, result.errorMessage);
        return { id, name, success: false, error: result.errorMessage };
      } else {
        return { id, name, success: true };
      }
    };

    let emailResults: any[] = [];
    let previewHtml: string | null = null;

    if (previewOnly) {
      const id = Array.from(activePlayerIds)[0];
      if (id) {
        const result = await processPlayer(id);
        if (result.previewHtml) previewHtml = result.previewHtml;
        emailResults.push(result);
      }
    } else {
      const limit = pLimit(5);
      emailResults = await Promise.all(
        Array.from(activePlayerIds).map(id => limit(() => processPlayer(id)))
      );
    }

    if (previewOnly) {
      return new Response(JSON.stringify({
        success: true,
        previewHtml,
        total: 1,
        sent: previewHtml ? 1 : 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
    const message = error instanceof Error ? error.message : String(error);
    // Non-coder note: we return a friendly error payload so the UI can show what went wrong.
    return jsonResponse({ success: false, error: message });
  }
});
