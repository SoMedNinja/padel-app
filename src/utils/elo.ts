import { GUEST_ID } from "./guest";
import {
  getProfileDisplayName,
  resolveTeamIds,
} from "./profileMap";
import { getStreak, getTrendIndicator } from "./stats";
import { Match, Profile, PlayerStats, PartnerStats } from "../types";
import {
  ELO_BASELINE,
} from "../shared/elo/constants";
import {
  getKFactor,
  getExpectedScore,
  getWinProbability,
  getMarginMultiplier,
  getPlayerWeight,
  getMatchWeight,
  getSinglesAdjustedMatchWeight,
  buildPlayerDelta,
} from "../shared/elo/math";

// Re-export for compatibility if needed elsewhere
export {
  getKFactor,
  getExpectedScore,
  getWinProbability,
  getMarginMultiplier,
  getPlayerWeight,
  getMatchWeight,
  getSinglesAdjustedMatchWeight,
  buildPlayerDelta,
  ELO_BASELINE,
};

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

// --- Helper Functions for Refactoring ---

/**
 * Initializes player stats from profiles.
 */
function initializePlayerStats(profiles: Profile[]): {
  players: Record<string, PlayerStats>;
  profileMap: Map<string, Profile>;
  nameToIdMap: Map<string, string>;
  ensurePlayer: (id: string, p?: Profile, resolvedName?: string) => void;
} {
  const players: Record<string, PlayerStats> = {};
  const profileMap = new Map<string, Profile>();
  const nameToIdMap = new Map<string, string>();

  const ensurePlayer = (id: string, p?: Profile, resolvedName?: string) => {
    if (id === GUEST_ID || players[id]) return;

    // Optimization: avoid redundant Map lookups and string checks by resolving once
    const profile = p || profileMap.get(id);
    const name = resolvedName || (profile ? getProfileDisplayName(profile) : (id.length > 5 && id.startsWith("name:") ? id.slice(5) : "Okänd"));

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
      avatarUrl: profile?.avatar_url || null,
      featuredBadgeId: profile?.featured_badge_id || null,
      recentResults: [],
    };
  };

  // Optimization: Consolidate profile mapping and player initialization into a single pass.
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const name = getProfileDisplayName(p);
    profileMap.set(p.id, p);
    nameToIdMap.set(name, p.id);
    ensurePlayer(p.id, p, name);
  }

  return { players, profileMap, nameToIdMap, ensurePlayer };
}

/**
 * Sorts matches chronologically (ascending).
 */
function sortMatchesChronologically(matches: Match[]): Match[] {
  // Optimization: check if matches are already sorted (O(N)).
  // Supabase usually returns newest first (descending), but ELO calculation needs oldest first (ascending).
  let isAscending = true;
  let isDescending = true;

  for (let i = 1; i < matches.length; i++) {
    const curr = matches[i].created_at;
    const prev = matches[i - 1].created_at;
    if (curr < prev) isAscending = false;
    if (curr > prev) isDescending = false;
    if (!isAscending && !isDescending) break;
  }

  if (isAscending) {
    return matches;
  } else if (isDescending) {
    // Optimization: Reverse is O(N) which is faster than Sort O(N log N)
    return [...matches].reverse();
  } else {
    // Unsorted, must sort O(N log N)
    return [...matches].sort((a, b) => {
      if (a.created_at < b.created_at) return -1;
      if (a.created_at > b.created_at) return 1;
      return 0;
    });
  }
}

/**
 * Records partner stats for a team.
 */
function recordPartners(team: string[], didWin: boolean, players: Record<string, PlayerStats>) {
  const len = team.length;
  if (len < 2) return; // Optimization: skip for singles matches
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
}

/**
 * Processes a single match update.
 */
function processMatchUpdates(
  match: Match,
  players: Record<string, PlayerStats>,
  nameToIdMap: Map<string, string>,
  ensurePlayer: (id: string) => void
): { matchDeltas: Record<string, number>; matchRatings: Record<string, number> } | null {

  // Optimization: Consolidate team resolution, player insurance, and active filtering into single-pass loops.
  // This reduces iterations and avoids multiple intermediate array allocations per match.
  const t1Raw = resolveTeamIds(match.team1_ids, match.team1, nameToIdMap);
  const t2Raw = resolveTeamIds(match.team2_ids, match.team2, nameToIdMap);

  const t1Active: string[] = [];
  const t2Active: string[] = [];

  for (let i = 0; i < t1Raw.length; i++) {
    const id = t1Raw[i];
    if (id && id !== GUEST_ID) {
      if (!players[id]) ensurePlayer(id);
      if (players[id]) t1Active.push(id);
    }
  }
  for (let i = 0; i < t2Raw.length; i++) {
    const id = t2Raw[i];
    if (id && id !== GUEST_ID) {
      if (!players[id]) ensurePlayer(id);
      if (players[id]) t2Active.push(id);
    }
  }

  if (!t1Active.length || !t2Active.length) return null;
  if (!Number.isFinite(match.team1_sets) || !Number.isFinite(match.team2_sets)) return null;

  const avg = (team: string[]) => {
    let sum = 0;
    const len = team.length;
    for (let i = 0; i < len; i++) {
      sum += players[team[i]]?.elo ?? ELO_BASELINE;
    }
    return sum / len;
  };

  const e1 = avg(t1Active);
  const e2 = avg(t2Active);

  const exp1 = getExpectedScore(e1, e2);
  const team1Won = match.team1_sets > match.team2_sets;
  const marginMultiplier = getMarginMultiplier(match.team1_sets, match.team2_sets);
  const isSinglesMatch = t1Active.length === 1 && t2Active.length === 1;
  const matchWeight = getSinglesAdjustedMatchWeight(match, isSinglesMatch);

  const matchDeltas: Record<string, number> = {};
  const matchRatings: Record<string, number> = {};
  const historyStamp = new Date(match.created_at).getTime();

  // Update Team 1
  for (let i = 0; i < t1Active.length; i++) {
    const id = t1Active[i];
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
      date: match.created_at || "",
      delta,
      elo: player.elo,
      matchId: match.id,
    });

    matchDeltas[id] = delta;
    matchRatings[id] = player.elo;
  }

  // Update Team 2
  for (let i = 0; i < t2Active.length; i++) {
    const id = t2Active[i];
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
      date: match.created_at || "",
      delta,
      elo: player.elo,
      matchId: match.id,
    });

    matchDeltas[id] = delta;
    matchRatings[id] = player.elo;
  }

  recordPartners(t1Active, team1Won, players);
  recordPartners(t2Active, !team1Won, players);

  return { matchDeltas, matchRatings };
}

/**
 * Calculates derived statistics (streaks, trends, best partners) for all players.
 */
function finalizePlayerStats(players: Record<string, PlayerStats>): PlayerStats[] {
  return Object.values(players).map(player => {
    // Optimization: Pre-calculate streak and trend once per data change
    const streak = getStreak(player.recentResults, true);
    const trend = getTrendIndicator(player.recentResults);

    // Optimization: find best partner in a single pass instead of map + filter + sort
    let bestPartnerEntry: (PartnerStats & { partnerId: string; winRate: number }) | null = null;
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

    // Optimization: Slice recentResults to last 5 for UI display (trend/chips)
    // to avoid sending large arrays to components. streak/trend are already pre-calculated.
    return {
      ...player,
      bestPartner,
      streak,
      trend,
      recentResults: player.recentResults.slice(-5)
    };
  });
}

// --- Main Functions ---

export function calculateElo(matches: Match[], profiles: Profile[] = []): PlayerStats[] {
  return calculateEloWithStats(matches, profiles).players;
}

export function calculateEloWithStats(matches: Match[], profiles: Profile[] = []): {
  players: PlayerStats[];
  eloDeltaByMatch: Record<string, Record<string, number>>;
  eloRatingByMatch: Record<string, Record<string, number>>;
} {
  const { players, nameToIdMap, ensurePlayer } = initializePlayerStats(profiles);
  const sortedMatches = sortMatchesChronologically(matches);

  const eloDeltaByMatch: Record<string, Record<string, number>> = {};
  const eloRatingByMatch: Record<string, Record<string, number>> = {};

  // Optimization: use a for-loop instead of forEach for the main match processing loop.
  for (let matchIdx = 0; matchIdx < sortedMatches.length; matchIdx++) {
    const m = sortedMatches[matchIdx];
    const result = processMatchUpdates(m, players, nameToIdMap, ensurePlayer);

    if (result) {
      eloDeltaByMatch[m.id] = result.matchDeltas;
      eloRatingByMatch[m.id] = result.matchRatings;
    }
  }

  const finalPlayers = finalizePlayerStats(players);

  return {
    players: finalPlayers,
    eloDeltaByMatch,
    eloRatingByMatch
  };
}
