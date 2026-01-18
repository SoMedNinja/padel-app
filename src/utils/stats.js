// All match- och statistiklogik samlad här

export function getWinnersAndLosers(match) {
  const team1Won = match.team1_sets > match.team2_sets;
  return {
    winners: team1Won ? match.team1 || [] : match.team2 || [],
    losers: team1Won ? match.team2 || [] : match.team1 || [],
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
        (m.team1 || []).includes(playerName) ||
        (m.team2 || []).includes(playerName)
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-limit)
    .map(m => {
      const won =
        ((m.team1 || []).includes(playerName) && m.team1_sets > m.team2_sets) ||
        ((m.team2 || []).includes(playerName) && m.team2_sets > m.team1_sets);
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
