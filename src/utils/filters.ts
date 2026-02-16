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
  if (!matches || !matches.length) return [];
  if (filter.type === "all") return matches;

  const result: Match[] = [];
  const type = filter.type;

  // Optimization: Pre-calculate date range parameters once outside the loop
  let start: string | undefined;
  let end: string | undefined;

  if (type === "last7" || type === "last30" || type === "range") {
    const range = getDateRangeISO(filter);
    if (!range) return type === "range" ? [] : matches;
    start = range.start;
    end = range.end;
  }

  // Optimization: Use a single pass for-loop instead of .filter() to avoid intermediate array allocations.
  // This also allows us to handle all filter types in a unified, high-performance way.
  for (let i = 0, len = matches.length; i < len; i++) {
    const m = matches[i];
    let keep = false;

    if (type === "short") {
      keep = (m.score_type || "sets") === "sets" && Math.max(m.team1_sets, m.team2_sets) <= 3;
    } else if (type === "long") {
      keep = (m.score_type || "sets") === "sets" && Math.max(m.team1_sets, m.team2_sets) >= 6;
    } else if (type === "tournaments") {
      keep = !!m.source_tournament_id;
    } else if (start || end) {
      const dateStr = m.created_at;
      if (dateStr) {
        keep = (!start || dateStr >= start) && (!end || dateStr <= end);
      }
    } else {
      keep = true;
    }

    if (keep) {
      result.push(m);
    }
  }

  return result;
}
