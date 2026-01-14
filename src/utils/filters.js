export function filterMatches(matches, filterType) {
  if (filterType === "all") return matches;

  if (filterType === "short") {
    return matches.filter(m =>
      Math.max(m.team1_sets, m.team2_sets) <= 3
    );
  }

  if (filterType === "long") {
    return matches.filter(m =>
      Math.max(m.team1_sets, m.team2_sets) >= 6
    );
  }

  return matches;
}
