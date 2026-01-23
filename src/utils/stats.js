// All match- och statistiklogik samlad här

const normalizeTeam = (team) => {
  if (Array.isArray(team)) return team.filter(Boolean);
  if (typeof team === "string") {
    const trimmed = team.trim();
    if (!trimmed) return [];
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map(name => name.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

export function getWinnersAndLosers(match) {
  const team1 = normalizeTeam(match.team1);
  const team2 = normalizeTeam(match.team2);
  const team1Won = match.team1_sets > match.team2_sets;
  return {
    winners: team1Won ? team1 : team2,
    losers: team1Won ? team2 : team1,
  };
}

export function getLatestMatchDate(matches) {
  return matches
    .map(m => m.created_at?.slice(0, 10))
    .filter(Boolean)
    .sort()
    .pop();
}

export function getRecentResults(matches, playerName, limit = 5) {
  return matches
    .filter(
      m =>
        normalizeTeam(m.team1).includes(playerName) ||
        normalizeTeam(m.team2).includes(playerName)
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-limit)
    .map(m => {
      const team1 = normalizeTeam(m.team1);
      const team2 = normalizeTeam(m.team2);
      const won =
        (team1.includes(playerName) && m.team1_sets > m.team2_sets) ||
        (team2.includes(playerName) && m.team2_sets > m.team1_sets);
      return won ? "W" : "L";
    });
}

export function getMvpStats(matches, allowedNames = null) {
  const stats = {};
  const allowList =
    allowedNames instanceof Set ? allowedNames : allowedNames ? new Set(allowedNames) : null;

  matches.forEach(m => {
    const { winners, losers } = getWinnersAndLosers(m);

    winners.forEach(p => {
      if (!p || p === "Gäst") return;
      if (allowList && !allowList.has(p)) return;
      if (!stats[p]) stats[p] = { wins: 0, games: 0 };
      stats[p].wins++;
      stats[p].games++;
    });

    losers.forEach(p => {
      if (!p || p === "Gäst") return;
      if (allowList && !allowList.has(p)) return;
      if (!stats[p]) stats[p] = { wins: 0, games: 0 };
      stats[p].games++;
    });
  });

  return stats;
}
