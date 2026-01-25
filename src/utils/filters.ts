import { Match, MatchFilter } from "../types";

const getDateRange = (filter: MatchFilter) => {
  if (filter.type === "last7") {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { start, end: new Date() };
  }
  if (filter.type === "last30") {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end: new Date() };
  }
  if (filter.type === "range" && (filter.startDate || filter.endDate)) {
    const start = filter.startDate ? new Date(filter.startDate) : null;
    const end = filter.endDate ? new Date(filter.endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
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
  const range = getDateRange(filter);
  if (range) {
    return matches.filter(match => {
      const date = match.created_at ? new Date(match.created_at) : null;
      if (!date || Number.isNaN(date.valueOf())) return false;
      if (range.start && date < range.start) return false;
      if (range.end && date > range.end) return false;
      return true;
    });
  }
  return matches;
}
