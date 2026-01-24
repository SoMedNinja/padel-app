export function filterMatches(matches, filter) {
  if (!matches) return [];
  if (filter === "short") {
    return matches.filter(
      m => (m.score_type || "sets") === "sets" && Math.max(m.team1_sets, m.team2_sets) <= 3
    );
  }
  if (filter === "long") {
    return matches.filter(
      m => (m.score_type || "sets") === "sets" && Math.max(m.team1_sets, m.team2_sets) >= 6
    );
  }
  if (filter === "tournaments") {
    return matches.filter(m => m.source_tournament_id !== null);
  }
  return matches;
}
