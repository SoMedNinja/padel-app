import { GUEST_ID } from "./guest";
import {
  getProfileDisplayName,
  resolveTeamIds,
} from "./profileMap";
import { Match, Profile, PlayerStats } from "../types";

const BASE_K = 20;
const HIGH_K = 40;
const MID_K = 30;
const MAX_MARGIN_MULTIPLIER = 1.2;
const MAX_PLAYER_WEIGHT = 1.25;
const MIN_PLAYER_WEIGHT = 0.75;
const EXPECTED_SCORE_DIVISOR = 300;
const PLAYER_WEIGHT_DIVISOR = 800;
const ELO_BASELINE = 1000;
const SHORT_SET_MAX = 3;
const LONG_SET_MIN = 6;
const SHORT_POINTS_MAX = 15;
const MID_POINTS_MAX = 21;
const SHORT_MATCH_WEIGHT = 0.5;
const MID_MATCH_WEIGHT = 0.5;
const LONG_MATCH_WEIGHT = 1;
// Note for non-coders: 1v1 matches count a bit less because one player's form swings the result more.
const SINGLES_MATCH_WEIGHT = 0.5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getKFactor = (games = 0) => {
  if (games < 10) return HIGH_K;
  if (games < 30) return MID_K;
  return BASE_K;
};

export const getExpectedScore = (rating: number, opponentRating: number) =>
  1 / (1 + Math.pow(10, (opponentRating - rating) / EXPECTED_SCORE_DIVISOR));

export const getWinProbability = getExpectedScore;

export const getMarginMultiplier = (team1Sets: number, team2Sets: number) => {
  if (!Number.isFinite(team1Sets) || !Number.isFinite(team2Sets)) return 1;
  const margin = Math.min(2, Math.abs(team1Sets - team2Sets));
  return 1 + Math.min(MAX_MARGIN_MULTIPLIER - 1, margin * 0.1);
};

export const getPlayerWeight = (playerElo: number, teamAverageElo: number) => {
  if (!Number.isFinite(playerElo) || !Number.isFinite(teamAverageElo)) return 1;
  // Note for non-coders: lower-rated players get a bigger boost (gain more, lose less) vs their team average.
  const adjustment = 1 + (teamAverageElo - playerElo) / PLAYER_WEIGHT_DIVISOR;
  return clamp(adjustment, MIN_PLAYER_WEIGHT, MAX_PLAYER_WEIGHT);
};

export const getMatchWeight = (match: Match) => {
  // Note for non-coders: This scales ELO changes so long/tournament matches matter more than quick ones.
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

export const getSinglesAdjustedMatchWeight = (match: Match, isSinglesMatch: boolean) => {
  return getMatchWeight(match) * (isSinglesMatch ? SINGLES_MATCH_WEIGHT : 1);
};

export { ELO_BASELINE };

export const getEloExplanation = (
  delta: number,
  playerElo: number,
  teamAverageElo: number,
  opponentAverageElo: number,
  matchWeight: number,
  didWin: boolean,
  games: number
) => {
  if (delta === 0) return "Ingen ELO-förändring.";

  const expected = getExpectedScore(teamAverageElo, opponentAverageElo);
  const prob = Math.round((isFinite(expected) ? expected : 0.5) * 100);
  const weight = getPlayerWeight(playerElo, teamAverageElo);
  const k = getKFactor(games);

  const lines = [
    `Resultat: ${didWin ? "Vinst" : "Förlust"} (${delta > 0 ? "+" : ""}${delta} ELO)`,
    `Vinstchans: ${prob}%`,
    `Matchvikt: ${matchWeight}x (K=${k})`,
    `Spelarvikt: ${weight.toFixed(2)}x (relativt laget)`
  ];

  if (didWin && prob < 40) lines.push("💪 Bonus för vinst mot starkare motstånd!");
  if (!didWin && prob > 60) lines.push("⚠️ Större avdrag vid förlust som favorit.");

  return lines.join("\n");
};

export const buildPlayerDelta = ({
  playerElo,
  playerGames,
  teamAverageElo,
  expectedScore,
  didWin,
  marginMultiplier,
  matchWeight,
}: {
  playerElo: number;
  playerGames: number;
  teamAverageElo: number;
  expectedScore: number;
  didWin: boolean;
  marginMultiplier: number;
  matchWeight: number;
}) => {
  // Note for non-coders: we start from a base "K" value, then scale it by match length and player weight.
  // Note for non-coders: low-rated players get bigger boosts on wins and smaller penalties on losses (inverse weight).
  const playerK = getKFactor(playerGames);
  const weight = getPlayerWeight(playerElo, teamAverageElo);
  const effectiveWeight = didWin ? weight : 1 / weight;
  return Math.round(
    playerK * marginMultiplier * matchWeight * effectiveWeight * ((didWin ? 1 : 0) - expectedScore)
  );
};

export function calculateElo(matches: Match[], profiles: Profile[] = []): PlayerStats[] {
  return calculateEloWithStats(matches, profiles).players;
}

export function calculateEloWithStats(matches: Match[], profiles: Profile[] = []): {
  players: PlayerStats[];
  eloDeltaByMatch: Record<string, Record<string, number>>;
  eloRatingByMatch: Record<string, Record<string, number>>;
} {
  const players: Record<string, PlayerStats> = {};
  const profileMap = new Map<string, Profile>();
  const nameToIdMap = new Map<string, string>();
  const avatarMap: Record<string, string | null> = {};
  const badgeMap: Record<string, string | null> = {};

  profiles.forEach(p => {
    profileMap.set(p.id, p);
    nameToIdMap.set(getProfileDisplayName(p), p.id);
    avatarMap[p.id] = p.avatar_url || null;
    badgeMap[p.id] = p.featured_badge_id || null;
  });

  const ensurePlayer = (id: string) => {
    if (id === GUEST_ID) return;
    if (players[id]) return;

    // Optimization: avoid redundant Map lookups and string checks by resolving once
    const p = profileMap.get(id);
    const name = p ? getProfileDisplayName(p) : (id.startsWith("name:") ? id.replace("name:", "") : "Okänd");

    players[id] = {
      id,
      name,
      elo: ELO_BASELINE,
      startElo: ELO_BASELINE,
      wins: 0,
      losses: 0,
      games: 0,
      history: [],
      partners: {},
      avatarUrl: p?.avatar_url || null,
      featuredBadgeId: p?.featured_badge_id || null,
      recentResults: [],
    };
  };

  profiles.forEach(p => {
    ensurePlayer(p.id);
  });

  const normalizeTeam = (team: any): string[] => {
    if (!Array.isArray(team)) return [];
    // Optimization: check if filter is needed before allocating new array
    for (let i = 0; i < team.length; i++) {
      if (!team[i]) return team.filter(Boolean);
    }
    return team;
  };
  const activeTeam = (team: string[]) => {
    const active = [];
    for (let i = 0; i < team.length; i++) {
      const id = team[i];
      if (id !== GUEST_ID && players[id]) active.push(id);
    }
    return active;
  };
  const avg = (team: string[]) => {
    let sum = 0;
    const len = team.length;
    for (let i = 0; i < len; i++) {
      sum += players[team[i]]?.elo ?? ELO_BASELINE;
    }
    return sum / len;
  };
  const recordPartners = (team: string[], didWin: boolean) => {
    const len = team.length;
    for (let i = 0; i < len; i++) {
      const playerId = team[i];
      const player = players[playerId];
      for (let j = 0; j < len; j++) {
        const partnerId = team[j];
        if (playerId === partnerId) continue;
        const partnerStats = player.partners[partnerId] || { games: 0, wins: 0 };
        partnerStats.games += 1;
        if (didWin) partnerStats.wins += 1;
        player.partners[partnerId] = partnerStats;
      }
    }
  };

  // Optimization: check if matches are already sorted in O(N) to avoid expensive O(N log N) sort and copy.
  let isSorted = true;
  for (let i = 1; i < matches.length; i++) {
    if (matches[i].created_at < matches[i - 1].created_at) {
      isSorted = false;
      break;
    }
  }

  // Optimization: use string comparison for sorting to avoid expensive new Date() calls.
  // ISO 8601 strings sort correctly lexicographically.
  const sortedMatches = isSorted ? matches : [...matches].sort((a, b) => {
    if (a.created_at < b.created_at) return -1;
    if (a.created_at > b.created_at) return 1;
    return 0;
  });

  const eloDeltaByMatch: Record<string, Record<string, number>> = {};
  const eloRatingByMatch: Record<string, Record<string, number>> = {};

  sortedMatches.forEach((m) => {
    // We only instantiate Date once per match in the sorted loop
    const historyStamp = new Date(m.created_at).getTime();

    const t1 = normalizeTeam(resolveTeamIds(m.team1_ids, m.team1, nameToIdMap));
    const t2 = normalizeTeam(resolveTeamIds(m.team2_ids, m.team2, nameToIdMap));
    // Optimization: avoid redundant resolution calls inside the loop.
    // ensurePlayer now handles lazy resolution from pre-calculated maps.
    for (let i = 0; i < t1.length; i++) ensurePlayer(t1[i]);
    for (let i = 0; i < t2.length; i++) ensurePlayer(t2[i]);
    const t1Active = activeTeam(t1);
    const t2Active = activeTeam(t2);

    if (!t1Active.length || !t2Active.length) return;
    if (!Number.isFinite(m.team1_sets) || !Number.isFinite(m.team2_sets)) return;

    const e1 = avg(t1Active);
    const e2 = avg(t2Active);

    const exp1 = getExpectedScore(e1, e2);
    const team1Won = m.team1_sets > m.team2_sets;
    const marginMultiplier = getMarginMultiplier(m.team1_sets, m.team2_sets);
    const isSinglesMatch = t1Active.length === 1 && t2Active.length === 1;
    const matchWeight = getSinglesAdjustedMatchWeight(m, isSinglesMatch);

    const matchDeltas: Record<string, number> = {};
    const matchRatings: Record<string, number> = {};

    t1Active.forEach(id => {
      const player = players[id];
      const delta = buildPlayerDelta({
        playerElo: player.elo,
        playerGames: player.games,
        teamAverageElo: e1,
        expectedScore: exp1,
        didWin: team1Won,
        marginMultiplier,
        matchWeight,
      });
      player.elo += delta;
      if (team1Won) {
        player.wins++;
      } else {
        player.losses++;
      }
      player.games++;

      const result = team1Won ? "W" : "L";
      player.recentResults.push(result);
      player.history.push({
        result,
        timestamp: historyStamp,
        date: m.created_at || "",
        delta,
        elo: player.elo,
        matchId: m.id,
      });

      matchDeltas[id] = delta;
      matchRatings[id] = player.elo;
    });

    t2Active.forEach(id => {
      const player = players[id];
      const delta = buildPlayerDelta({
        playerElo: player.elo,
        playerGames: player.games,
        teamAverageElo: e2,
        expectedScore: 1 - exp1,
        didWin: !team1Won,
        marginMultiplier,
        matchWeight,
      });
      player.elo += delta;
      if (team1Won) {
        player.losses++;
      } else {
        player.wins++;
      }
      player.games++;

      const result = team1Won ? "L" : "W";
      player.recentResults.push(result);
      player.history.push({
        result,
        timestamp: historyStamp,
        date: m.created_at || "",
        delta,
        elo: player.elo,
        matchId: m.id,
      });

      matchDeltas[id] = delta;
      matchRatings[id] = player.elo;
    });

    eloDeltaByMatch[m.id] = matchDeltas;
    eloRatingByMatch[m.id] = matchRatings;

    recordPartners(t1Active, team1Won);
    recordPartners(t2Active, !team1Won);
  });

  const finalPlayers = Object.values(players).map(player => {
    // Optimization: find best partner in a single pass instead of map + filter + sort
    let bestPartnerEntry: any = null;
    let bestWinRate = -1;
    let bestGames = -1;
    let bestWins = -1;

    for (const partnerId in player.partners) {
      const stats = player.partners[partnerId];
      if (stats.games < 2) continue;

      const winRate = stats.wins / stats.games;
      let isBetter = false;

      if (!bestPartnerEntry) {
        isBetter = true;
      } else if (winRate > bestWinRate) {
        isBetter = true;
      } else if (winRate === bestWinRate) {
        if (stats.games > bestGames) {
          isBetter = true;
        } else if (stats.games === bestGames) {
          if (stats.wins > bestWins) {
            isBetter = true;
          }
        }
      }

      if (isBetter) {
        bestPartnerEntry = { partnerId, ...stats, winRate };
        bestWinRate = winRate;
        bestGames = stats.games;
        bestWins = stats.wins;
      }
    }

    const bestPartner = bestPartnerEntry
      ? {
        ...bestPartnerEntry,
        name: players[bestPartnerEntry.partnerId]?.name || "Okänd",
      }
      : null;

    return { ...player, bestPartner };
  });

  return {
    players: finalPlayers,
    eloDeltaByMatch,
    eloRatingByMatch
  };
}
