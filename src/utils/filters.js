export function filterMatches(matches, filter) {
  if (!matches) return [];
  if (filter === "short") return matches.filter(m => Math.max(m.team1_sets, m.team2_sets) <= 3);
  if (filter === "long") return matches.filter(m => Math.max(m.team1_sets, m.team2_sets) >= 6);
  return matches;
}
