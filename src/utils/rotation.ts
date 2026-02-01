import { getExpectedScore, ELO_BASELINE } from "./elo";

export const getTeamAverageElo = (team: string[], eloMap: Record<string, number>) => {
  let total = 0;
  let count = 0;
  // Optimization: Single pass instead of .filter().reduce() to avoid intermediate array allocation.
  for (let i = 0; i < team.length; i++) {
    const id = team[i];
    if (id && id !== "guest-id") {
      total += (eloMap[id] ?? ELO_BASELINE);
      count++;
    }
  }
  if (count === 0) return ELO_BASELINE;
  return total / count;
};

export const getWinProbability = getExpectedScore;

export const getFairnessScore = (winProbability: number) =>
  Math.max(0, Math.min(100, Math.round((1 - Math.abs(0.5 - winProbability) * 2) * 100)));

export const getRotationRounds = (playerCount: number) => {
  const roundMap: Record<number, number> = {
    5: 5,
    6: 3,
    7: 7,
    8: 4,
  };
  return roundMap[playerCount] || Math.ceil(playerCount / 2);
};

export interface RotationRound {
  round: number;
  teamA: string[];
  teamB: string[];
  rest: string[];
  fairness: number;
  winProbability: number;
}

export const buildRotationSchedule = (pool: string[], eloMap: Record<string, number>) => {
  const players = [...pool];
  const roundCount = getRotationRounds(players.length);
  const targetGames = (4 * roundCount) / players.length;
  const games = Object.fromEntries(players.map(id => [id, 0]));
  const teammateCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();

  const pairKey = (a: string, b: string) => [a, b].sort().join("|");
  const getPairCount = (map: Map<string, number>, a: string, b: string) => map.get(pairKey(a, b)) || 0;
  const addPairCount = (map: Map<string, number>, a: string, b: string) => {
    const key = pairKey(a, b);
    map.set(key, (map.get(key) || 0) + 1);
  };

  const buildCombos = (arr: string[], size: number): string[][] => {
    const result: string[][] = [];
    const helper = (start: number, combo: string[]) => {
      if (combo.length === size) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i <= arr.length - (size - combo.length); i += 1) {
        combo.push(arr[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    };
    helper(0, []);
    return result;
  };

  const teamSplits = (fourPlayers: string[]) => {
    const [p1, p2, p3, p4] = fourPlayers;
    return [
      { teamA: [p1, p2], teamB: [p3, p4] },
      { teamA: [p1, p3], teamB: [p2, p4] },
      { teamA: [p1, p4], teamB: [p2, p3] },
    ];
  };

  const rounds: RotationRound[] = [];
  const combos = buildCombos(players, 4);

  const pickCandidate = (strictGames: boolean) => {
    let best: any = null;
    combos.forEach(combo => {
      const restPlayers = players.filter(id => !combo.includes(id));
      const teams = teamSplits(combo);
      teams.forEach(teamsOption => {
        if (
          strictGames &&
          [...teamsOption.teamA, ...teamsOption.teamB].some(id => games[id] >= targetGames)
        ) {
          return;
        }

        const teamAElo = getTeamAverageElo(teamsOption.teamA, eloMap);
        const teamBElo = getTeamAverageElo(teamsOption.teamB, eloMap);
        const winProbability = getWinProbability(teamAElo, teamBElo);
        const fairness = getFairnessScore(winProbability);

        const teammatePenalty =
          getPairCount(teammateCounts, teamsOption.teamA[0], teamsOption.teamA[1]) +
          getPairCount(teammateCounts, teamsOption.teamB[0], teamsOption.teamB[1]);
        const opponentPenalty = teamsOption.teamA.reduce(
          (sum, aId) =>
            sum +
            teamsOption.teamB.reduce(
              (innerSum, bId) => innerSum + getPairCount(opponentCounts, aId, bId),
              0
            ),
          0
        );
        const gamePenalty = [...teamsOption.teamA, ...teamsOption.teamB].reduce(
          (sum, id) => sum + games[id],
          0
        );
        const restPenalty = restPlayers.reduce(
          (sum, id) => sum + Math.max(0, targetGames - games[id]),
          0
        );
        const score =
          fairness * 2 -
          teammatePenalty * 15 -
          opponentPenalty * 6 -
          gamePenalty * 4 -
          restPenalty * 2;

        if (!best || score > best.score) {
          best = {
            score,
            fairness,
            winProbability,
            teamA: teamsOption.teamA,
            teamB: teamsOption.teamB,
            rest: restPlayers,
          };
        }
      });
    });
    return best;
  };

  for (let round = 0; round < roundCount; round += 1) {
    const candidate = pickCandidate(true) || pickCandidate(false);
    if (!candidate) {
      break;
    }
    rounds.push({
      round: round + 1,
      teamA: candidate.teamA,
      teamB: candidate.teamB,
      rest: candidate.rest,
      fairness: candidate.fairness,
      winProbability: candidate.winProbability,
    });

    [...candidate.teamA, ...candidate.teamB].forEach(id => {
      games[id] += 1;
    });
    addPairCount(teammateCounts, candidate.teamA[0], candidate.teamA[1]);
    addPairCount(teammateCounts, candidate.teamB[0], candidate.teamB[1]);

    candidate.teamA.forEach(aId => {
      candidate.teamB.forEach(bId => {
        addPairCount(opponentCounts, aId, bId);
      });
    });
  }

  const averageFairness = rounds.length
    ? Math.round(rounds.reduce((sum, round) => sum + round.fairness, 0) / rounds.length)
    : 0;

  return { rounds, averageFairness, targetGames };
};
