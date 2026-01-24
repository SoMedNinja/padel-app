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

// Get the complete state of the tournament from rounds and participants
export const getTournamentState = (rounds, participants) => {
  const standings = {};
  const teammatesFaced = {};
  const opponentsFaced = {};

  participants.forEach((id) => {
    standings[id] = { ...INITIAL_PLAYER_STATS, id };
    teammatesFaced[id] = {};
    opponentsFaced[id] = {};
    participants.forEach((otherId) => {
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

    const s1 = (team1_score !== null && team1_score !== undefined) ? Number(team1_score) : null;
    const s2 = (team2_score !== null && team2_score !== undefined) ? Number(team2_score) : null;

    if (s1 !== null && s2 !== null && Number.isFinite(s1) && Number.isFinite(s2)) {
      team1_ids.forEach(id => {
        standings[id].totalPoints += s1;
        standings[id].pointsFor += s1;
        standings[id].pointsAgainst += s2;
        standings[id].gamesPlayed += 1;
        if (s1 > s2) standings[id].wins += 1;
        else if (s1 === s2) standings[id].ties += 1;
        else standings[id].losses += 1;
      });
      team2_ids.forEach(id => {
        standings[id].totalPoints += s2;
        standings[id].pointsFor += s2;
        standings[id].pointsAgainst += s1;
        standings[id].gamesPlayed += 1;
        if (s2 > s1) standings[id].wins += 1;
        else if (s1 === s2) standings[id].ties += 1;
        else standings[id].losses += 1;
      });

      // Teammates
      if (team1_ids.length === 2) {
        const [a, b] = team1_ids;
        teammatesFaced[a][b] += 1;
        teammatesFaced[b][a] += 1;
      }
      if (team2_ids.length === 2) {
        const [a, b] = team2_ids;
        teammatesFaced[a][b] += 1;
        teammatesFaced[b][a] += 1;
      }

      // Opponents
      team1_ids.forEach(p1 => {
        team2_ids.forEach(p2 => {
          opponentsFaced[p1][p2] += 1;
          opponentsFaced[p2][p1] += 1;
        });
      });
    }
  });

  return { standings, teammatesFaced, opponentsFaced };
};

export const getRestCycle = (rounds, participants, mode) => {
  const restCounts = {};
  participants.forEach(p => restCounts[p] = 0);

  // Only consider rounds that match the mode?
  // Actually, the rules say "Track americanoRestCycle" and "Track mexicanoRestCycle" separately.
  // But they are computed from the rounds history.
  rounds.filter(r => r.mode === mode).forEach(r => {
    r.resting_ids?.forEach(id => {
      if (restCounts[id] !== undefined) restCounts[id]++;
    });
  });

  const minRests = Math.min(...Object.values(restCounts));
  const restedInCycle = Object.keys(restCounts).filter(id => restCounts[id] > minRests);

  return new Set(restedInCycle);
};

/**
 * Americano Logic
 */

export const pickAmericanoRestingPlayers = (standings, restCycle, participants, count) => {
  // A1: Lowest "rests in current cycle" (not in set), tie-break by fewest total gamesPlayed
  const sorted = [...participants].sort((a, b) => {
    const aRested = restCycle.has(a) ? 1 : 0;
    const bRested = restCycle.has(b) ? 1 : 0;
    if (aRested !== bRested) return aRested - bRested; // 0 (not rested) comes first
    return (standings[a]?.gamesPlayed || 0) - (standings[b]?.gamesPlayed || 0);
  });
  return sorted.slice(0, count);
};

export const pickAmericanoTeams = (activePlayers, standings, teammatesFaced) => {
  // A2: Minimize repeatTeammateCount, tie-break by minimize imbalance
  // Possible 2v2 splits for 4 players: [0,1] vs [2,3], [0,2] vs [1,3], [0,3] vs [1,2]
  const [p1, p2, p3, p4] = activePlayers;
  const splits = [
    { t1: [p1, p2], t2: [p3, p4] },
    { t1: [p1, p3], t2: [p2, p4] },
    { t1: [p1, p4], t2: [p2, p3] },
  ];

  const getRepeatCount = (split) => {
    const c1 = teammatesFaced[split.t1[0]][split.t1[1]] || 0;
    const c2 = teammatesFaced[split.t2[0]][split.t2[1]] || 0;
    return c1 + c2;
  };

  const getImbalance = (split) => {
    const s1 = (standings[split.t1[0]]?.totalPoints || 0) + (standings[split.t1[1]]?.totalPoints || 0);
    const s2 = (standings[split.t2[0]]?.totalPoints || 0) + (standings[split.t2[1]]?.totalPoints || 0);
    return Math.abs(s1 - s2);
  };

  splits.sort((a, b) => {
    const rA = getRepeatCount(a);
    const rB = getRepeatCount(b);
    if (rA !== rB) return rA - rB;
    return getImbalance(a) - getImbalance(b);
  });

  return splits[0];
};

/**
 * Mexicano Logic
 */

export const pickMexicanoRestingPlayers = (standings, restCycle, participants, count) => {
  // M1: Lowest totalPoints, tie-break by MOST gamesPlayed
  // M2: Override: prefer those NOT in restCycle
  const sorted = [...participants].sort((a, b) => {
    const aRested = restCycle.has(a) ? 1 : 0;
    const bRested = restCycle.has(b) ? 1 : 0;
    if (aRested !== bRested) return aRested - bRested; // 0 (not rested) comes first

    const pA = standings[a]?.totalPoints || 0;
    const pB = standings[b]?.totalPoints || 0;
    if (pA !== pB) return pA - pB;

    return (standings[b]?.gamesPlayed || 0) - (standings[a]?.gamesPlayed || 0); // MOST gamesPlayed
  });
  return sorted.slice(0, count);
};

export const pickMexicanoTeams = (activePlayers, standings) => {
  // Smallest diff = abs(teamStrength1 - teamStrength2)
  const [p1, p2, p3, p4] = activePlayers;
  const splits = [
    { t1: [p1, p2], t2: [p3, p4] },
    { t1: [p1, p3], t2: [p2, p4] },
    { t1: [p1, p4], t2: [p2, p3] },
  ];

  const getImbalance = (split) => {
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
export const getNextSuggestion = (rounds, participants, mode) => {
  const { standings, teammatesFaced } = getTournamentState(rounds, participants);
  const restCycle = getRestCycle(rounds, participants, mode);
  const restingCount = participants.length - 4;

  let resting_ids;
  if (mode === 'americano') {
    resting_ids = pickAmericanoRestingPlayers(standings, restCycle, participants, restingCount);
  } else {
    resting_ids = pickMexicanoRestingPlayers(standings, restCycle, participants, restingCount);
  }

  const activePlayers = participants.filter(id => !resting_ids.includes(id));
  let teams;
  if (mode === 'americano') {
    teams = pickAmericanoTeams(activePlayers, standings, teammatesFaced);
  } else {
    teams = pickMexicanoTeams(activePlayers, standings);
  }

  return {
    team1_ids: teams.t1,
    team2_ids: teams.t2,
    resting_ids,
  };
};
