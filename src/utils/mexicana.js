import { getExpectedScore } from "./elo";

const getRotationRounds = (playerCount) => {
  const roundMap = {
    5: 5,
    6: 3,
  };
  return roundMap[playerCount] || Math.ceil(playerCount / 2);
};

const getTeamAverageElo = (team, eloMap, fallback = 1000) => {
  if (!team.length) return fallback;
  const total = team.reduce((sum, id) => sum + (eloMap[id] ?? fallback), 0);
  return total / team.length;
};

const getWinProbability = (teamAElo, teamBElo) =>
  getExpectedScore(teamAElo, teamBElo);

const getFairnessScore = (winProbability) =>
  Math.max(0, Math.min(100, Math.round((1 - Math.abs(0.5 - winProbability) * 2) * 100)));

const buildCombos = (arr, size) => {
  const result = [];
  const helper = (start, combo) => {
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

const teamSplits = (fourPlayers) => {
  const [p1, p2, p3, p4] = fourPlayers;
  return [
    { teamA: [p1, p2], teamB: [p3, p4] },
    { teamA: [p1, p3], teamB: [p2, p4] },
    { teamA: [p1, p4], teamB: [p2, p3] },
  ];
};

const pairKey = (a, b) => [a, b].sort().join("|");
const getPairCount = (map, a, b) => map.get(pairKey(a, b)) || 0;
const addPairCount = (map, a, b) => {
  const key = pairKey(a, b);
  map.set(key, (map.get(key) || 0) + 1);
};

export const generateMexicanaRounds = (playerIds = [], eloMap = {}) => {
  const players = [...playerIds];
  const roundCount = getRotationRounds(players.length);
  const targetGames = (4 * roundCount) / players.length;
  const games = Object.fromEntries(players.map(id => [id, 0]));
  const teammateCounts = new Map();
  const opponentCounts = new Map();

  const rounds = [];
  const combos = buildCombos(players, 4);

  const pickCandidate = (strictGames) => {
    let best = null;
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
    if (!candidate) break;

    rounds.push({
      roundNumber: round + 1,
      team1Ids: candidate.teamA,
      team2Ids: candidate.teamB,
      restingIds: candidate.rest,
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

  return {
    rounds,
    averageFairness: rounds.length
      ? Math.round(rounds.reduce((sum, round) => sum + round.fairness, 0) / rounds.length)
      : 0,
  };
};

export const calculateMexicanaStandings = (rounds = [], participants = []) => {
  const stats = new Map(
    participants.map(id => [
      id,
      {
        id,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    ])
  );

  rounds.forEach(round => {
    const scoreA = Number(round.team1_score);
    const scoreB = Number(round.team2_score);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return;

    const teamA = round.team1_ids || [];
    const teamB = round.team2_ids || [];
    const teamAWon = scoreA > scoreB;

    const updateTeam = (team, pointsFor, pointsAgainst, won) => {
      team.forEach(id => {
        if (!stats.has(id)) return;
        const entry = stats.get(id);
        entry.matchesPlayed += 1;
        entry.pointsFor += pointsFor;
        entry.pointsAgainst += pointsAgainst;
        if (won) entry.wins += 1;
        else entry.losses += 1;
      });
    };

    updateTeam(teamA, scoreA, scoreB, teamAWon);
    updateTeam(teamB, scoreB, scoreA, !teamAWon);
  });

  return Array.from(stats.values()).map(entry => ({
    ...entry,
    pointsDiff: entry.pointsFor - entry.pointsAgainst,
    pointsTotal: entry.pointsFor,
  }));
};

export const buildMexicanaResults = (standings = []) => {
  const sorted = [...standings].sort((a, b) => {
    if (b.pointsTotal !== a.pointsTotal) return b.pointsTotal - a.pointsTotal;
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.id.localeCompare(b.id);
  });

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
};
