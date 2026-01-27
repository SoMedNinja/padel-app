import { Match, MatchFilter } from "../types";

const getDateRangeISO = (filter: MatchFilter) => {
  if (filter.type === "last7") {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { start: start.toISOString(), end: new Date().toISOString() };
  }
  if (filter.type === "last30") {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start: start.toISOString(), end: new Date().toISOString() };
  }
  if (filter.type === "range") {
    // Note for non-coders: We only filter once a "från" date exists so the list stays empty until then.
    if (!filter.startDate) return null;
    const start = new Date(filter.startDate);
    const end = filter.endDate ? new Date(filter.endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  return null;
};

export function filterMatches(matches: Match[], filter: MatchFilter): Match[] {
  if (!matches) return [];
  if (filter.type === "short") {
    return matches.filter(
      m => (m.score_type || "sets") === "sets" && Math.max(m.team1_sets, m.team2_sets) <= 3
    );
  }
  if (filter.type === "long") {
    return matches.filter(
      m => (m.score_type || "sets") === "sets" && Math.max(m.team1_sets, m.team2_sets) >= 6
    );
  }
  if (filter.type === "tournaments") {
    return matches.filter(m => !!m.source_tournament_id);
  }
  const range = getDateRangeISO(filter);
  if (range) {
    const { start, end } = range;
    return matches.filter(match => {
      const dateStr = match.created_at;
      if (!dateStr) return false;
      // Pre-calculated ISO strings allow for fast lexicographical comparison
      if (start && dateStr < start) return false;
      if (end && dateStr > end) return false;
      return true;
    });
  }
  return matches;
}
