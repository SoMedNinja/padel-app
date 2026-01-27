import { GUEST_ID } from "./guest";

/**
 * Shared Tournament Logic
 */

export const INITIAL_PLAYER_STATS = {
  totalPoints: 0,
  gamesPlayed: 0,
  rests: 0,
  wins: 0,
  ties: 0,
  losses: 0,
  pointsFor: 0,
  pointsAgainst: 0,
};

export type TournamentPlayerStats = typeof INITIAL_PLAYER_STATS & { id: string };

export interface Round {
  team1_ids: string[];
  team2_ids: string[];
  resting_ids?: string[];
  team1_score?: number | null;
  team2_score?: number | null;
  mode?: "americano" | "mexicano";
  round_number?: number;
}
// Note for non-coders: some rounds are just "suggestions" that haven't been saved yet,
// so they can exist without a round number. Saved rounds always include one.

export interface RoundWithNumber extends Round {
  round_number: number;
}

// Get the complete state of the tournament from rounds and participants
export const getTournamentState = (rounds: Round[], participants: string[]) => {
  const standings: Record<string, TournamentPlayerStats> = {};
  const teammatesFaced: Record<string, Record<string, number>> = {};
  const opponentsFaced: Record<string, Record<string, number>> = {};

  // Sort participants for determinism
  const sortedParticipants = [...participants].sort();

  sortedParticipants.forEach((id) => {
    standings[id] = { ...INITIAL_PLAYER_STATS, id };
    teammatesFaced[id] = {};
    opponentsFaced[id] = {};
    sortedParticipants.forEach((otherId) => {
      if (id !== otherId) {
        teammatesFaced[id][otherId] = 0;
        opponentsFaced[id][otherId] = 0;
      }
    });
  });

  rounds.forEach((round) => {
    const { team1_ids, team2_ids, resting_ids, team1_score, team2_score } = round;

    // Rests are counted once the round is planned/recorded
    resting_ids?.forEach((id) => {
      if (standings[id]) standings[id].rests += 1;
    });

    // Teammates and Opponents should be tracked even if the round has no score yet
    // to ensure diversity in pre-generated rounds or suggestions.
    if (team1_ids.length === 2) {
      const [a, b] = team1_ids;
      if (teammatesFaced[a] && teammatesFaced[b]) {
        teammatesFaced[a][b] = (teammatesFaced[a][b] || 0) + 1;
        teammatesFaced[b][a] = (teammatesFaced[b][a] || 0) + 1;
      }
    }
    if (team2_ids.length === 2) {
      const [a, b] = team2_ids;
      if (teammatesFaced[a] && teammatesFaced[b]) {
        teammatesFaced[a][b] = (teammatesFaced[a][b] || 0) + 1;
        teammatesFaced[b][a] = (teammatesFaced[b][a] || 0) + 1;
      }
    }
    team1_ids.forEach(p1 => {
      team2_ids.forEach(p2 => {
        if (opponentsFaced[p1] && opponentsFaced[p2]) {
          opponentsFaced[p1][p2] = (opponentsFaced[p1][p2] || 0) + 1;
          opponentsFaced[p2][p1] = (opponentsFaced[p2][p1] || 0) + 1;
        }
      });
    });

    const s1 = (team1_score !== null && team1_score !== undefined) ? Number(team1_score) : null;
    const s2 = (team2_score !== null && team2_score !== undefined) ? Number(team2_score) : null;

    if (s1 !== null && s2 !== null && Number.isFinite(s1) && Number.isFinite(s2)) {
      team1_ids.forEach(id => {
        if (!standings[id]) return;
        standings[id].totalPoints += s1;
        standings[id].pointsFor += s1;
        standings[id].pointsAgainst += s2;
        standings[id].gamesPlayed += 1;
        if (s1 > s2) standings[id].wins += 1;
        else if (s1 === s2) standings[id].ties += 1;
        else standings[id].losses += 1;
      });
      team2_ids.forEach(id => {
        if (!standings[id]) return;
        standings[id].totalPoints += s2;
        standings[id].pointsFor += s2;
        standings[id].pointsAgainst += s1;
        standings[id].gamesPlayed += 1;
        if (s2 > s1) standings[id].wins += 1;
        else if (s1 === s2) standings[id].ties += 1;
        else standings[id].losses += 1;
      });
    }
  });

  return { standings, teammatesFaced, opponentsFaced };
};

export const getRestCycle = (rounds: Round[], participants: string[], mode: "americano" | "mexicano") => {
  const restCounts: Record<string, number> = {};
  participants.forEach(p => restCounts[p] = 0);

  // Track rests for the specific mode
  rounds.filter(r => r.mode === mode).forEach(r => {
    r.resting_ids?.forEach(id => {
      if (restCounts[id] !== undefined) restCounts[id]++;
    });
  });

  const counts = Object.values(restCounts);
  const minRests = counts.length ? Math.min(...counts) : 0;
  const restedInCycle = Object.keys(restCounts).filter(id => restCounts[id] > minRests);

  return new Set(restedInCycle);
};

/**
 * Americano Logic
 */

export const pickAmericanoRestingPlayers = (standings: Record<string, TournamentPlayerStats>, restCycle: Set<string>, participants: string[], count: number) => {
  // A1: Lowest "rests in current cycle" (not in set), tie-break by fewest total gamesPlayed
  // We use stable sort with ID as final tie-breaker for determinism
  const sorted = [...participants].sort((a, b) => {
    const aRested = restCycle.has(a) ? 1 : 0;
    const bRested = restCycle.has(b) ? 1 : 0;
    if (aRested !== bRested) return aRested - bRested; // 0 (not rested) comes first

    const gamesA = standings[a]?.gamesPlayed || 0;
    const gamesB = standings[b]?.gamesPlayed || 0;
    if (gamesA !== gamesB) return gamesA - gamesB;

    return a.localeCompare(b);
  });
  return sorted.slice(0, count);
};

export const pickAmericanoTeams = (
  activePlayers: string[],
  standings: Record<string, TournamentPlayerStats>,
  teammatesFaced: Record<string, Record<string, number>>,
  opponentsFaced: Record<string, Record<string, number>>
) => {
  // A2: Minimize repeatTeammateCount, tie-break by minimize repeatOpponentCount, then by minimize imbalance
  const [p1, p2, p3, p4] = [...activePlayers].sort(); // Sort for determinism
  const splits = [
    { t1: [p1, p2], t2: [p3, p4] },
    { t1: [p1, p3], t2: [p2, p4] },
    { t1: [p1, p4], t2: [p2, p3] },
  ];

  const getTeammateRepeatCount = (split: { t1: string[], t2: string[] }) => {
    const c1 = teammatesFaced[split.t1[0]]?.[split.t1[1]] || 0;
    const c2 = teammatesFaced[split.t2[0]]?.[split.t2[1]] || 0;
    return c1 + c2;
  };

  const getOpponentRepeatCount = (split: { t1: string[], t2: string[] }) => {
    let count = 0;
    split.t1.forEach(a => {
      split.t2.forEach(b => {
        count += opponentsFaced[a]?.[b] || 0;
      });
    });
    return count;
  };

  const getImbalance = (split: { t1: string[], t2: string[] }) => {
    const s1 = (standings[split.t1[0]]?.totalPoints || 0) + (standings[split.t1[1]]?.totalPoints || 0);
    const s2 = (standings[split.t2[0]]?.totalPoints || 0) + (standings[split.t2[1]]?.totalPoints || 0);
    return Math.abs(s1 - s2);
  };

  splits.sort((a, b) => {
    const tA = getTeammateRepeatCount(a);
    const tB = getTeammateRepeatCount(b);
    if (tA !== tB) return tA - tB;

    const oA = getOpponentRepeatCount(a);
    const oB = getOpponentRepeatCount(b);
    if (oA !== oB) return oA - oB;

    return getImbalance(a) - getImbalance(b);
  });

  return splits[0];
};

/**
 * Mexicano Logic
 */

export const pickMexicanoRestingPlayers = (standings: Record<string, TournamentPlayerStats>, restCycle: Set<string>, participants: string[], count: number) => {
  // M1: Lowest totalPoints, tie-break by MOST gamesPlayed
  // M2: Override: prefer those NOT in restCycle
  const sorted = [...participants].sort((a, b) => {
    const aRested = restCycle.has(a) ? 1 : 0;
    const bRested = restCycle.has(b) ? 1 : 0;
    if (aRested !== bRested) return aRested - bRested; // 0 (not rested) comes first

    const pA = standings[a]?.totalPoints || 0;
    const pB = standings[b]?.totalPoints || 0;
    if (pA !== pB) return pA - pB;

    const gamesA = standings[a]?.gamesPlayed || 0;
    const gamesB = standings[b]?.gamesPlayed || 0;
    if (gamesA !== gamesB) return gamesB - gamesA; // MOST gamesPlayed

    return a.localeCompare(b);
  });
  return sorted.slice(0, count);
};

export const pickMexicanoTeams = (activePlayers: string[], standings: Record<string, TournamentPlayerStats>) => {
  // Smallest diff = abs(teamStrength1 - teamStrength2)
  const [p1, p2, p3, p4] = [...activePlayers].sort(); // Sort for determinism
  const splits = [
    { t1: [p1, p2], t2: [p3, p4] },
    { t1: [p1, p3], t2: [p2, p4] },
    { t1: [p1, p4], t2: [p2, p3] },
  ];

  const getImbalance = (split: { t1: string[], t2: string[] }) => {
    const s1 = (standings[split.t1[0]]?.totalPoints || 0) + (standings[split.t1[1]]?.totalPoints || 0);
    const s2 = (standings[split.t2[0]]?.totalPoints || 0) + (standings[split.t2[1]]?.totalPoints || 0);
    return Math.abs(s1 - s2);
  };

  splits.sort((a, b) => getImbalance(a) - getImbalance(b));
  return splits[0];
};

/**
 * Orchestrator
 */

export const generateAmericanoRounds = (participants: string[]) => {
  const rounds: RoundWithNumber[] = [];
  const playerCount = participants.length;

  // Deterministic round count
  const roundMap: Record<number, number> = {
    4: 3,
    5: 5,
    6: 15, // Standard Americano for 6 players is usually more, but let's stick to some logic
    7: 7,
    8: 7,
  };
  const roundCount = roundMap[playerCount] || playerCount;

  const currentRounds: Round[] = [];
  for (let i = 0; i < roundCount; i++) {
    const suggestion = getNextSuggestion(currentRounds, participants, 'americano');
    const newRound: RoundWithNumber = {
      ...suggestion,
      round_number: i + 1,
      mode: 'americano'
    };
    currentRounds.push(newRound);
    rounds.push(newRound);
  }

  return rounds;
};

export const getNextSuggestion = (rounds: Round[], participants: string[], mode: "americano" | "mexicano"): { team1_ids: string[], team2_ids: string[], resting_ids: string[] } => {
  const { standings, teammatesFaced, opponentsFaced } = getTournamentState(rounds, participants);
  const restCycle = getRestCycle(rounds, participants, mode);
  const restingCount = participants.length - 4;

  let resting_ids: string[];
  if (mode === 'americano') {
    resting_ids = pickAmericanoRestingPlayers(standings, restCycle, participants, restingCount);
  } else {
    resting_ids = pickMexicanoRestingPlayers(standings, restCycle, participants, restingCount);
  }

  const activePlayers = participants.filter(id => !resting_ids.includes(id));
  let teams: { t1: string[], t2: string[] };
  if (mode === 'americano') {
    teams = pickAmericanoTeams(activePlayers, standings, teammatesFaced, opponentsFaced);
  } else {
    teams = pickMexicanoTeams(activePlayers, standings);
  }

  return {
    team1_ids: teams.t1,
    team2_ids: teams.t2,
    resting_ids,
  };
};
