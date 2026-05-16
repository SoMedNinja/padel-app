import { Match } from "../types";

/**
 * Returns the series name for a given date.
 * Format: "Serie Q[1-4] [Year]"
 */
export const getSeriesName = (dateInput: Date | string): string => {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "Okänd Serie";

  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const year = date.getFullYear();

  return `Serie Q${quarter} ${year}`;
};

/**
 * Returns the current series name.
 */
export const getCurrentSeriesName = (): string => {
  return getSeriesName(new Date());
};

/**
 * Extracts all unique series names from a list of matches and sorts them descending.
 */
export const getAvailableSeries = (matches: Match[]): string[] => {
  const seriesSet = new Set<string>();

  // Always include the current series
  seriesSet.add(getCurrentSeriesName());

  for (const match of matches) {
    if (match.series) {
      seriesSet.add(match.series);
    } else if (match.created_at) {
      seriesSet.add(getSeriesName(match.created_at));
    }
  }

  return Array.from(seriesSet).sort((a, b) => {
    // Sort descending (e.g., Q2 2026 before Q1 2026)
    const [yearA, qA] = parseSeries(a);
    const [yearB, qB] = parseSeries(b);

    if (yearA !== yearB) return yearB - yearA;
    return qB - qA;
  });
};

/**
 * Helper to parse series name for sorting.
 * "Serie Q2 2026" -> [2026, 2]
 */
const parseSeries = (seriesName: string): [number, number] => {
  const match = seriesName.match(/Serie Q(\d) (\d{4})/);
  if (!match) return [0, 0];
  return [parseInt(match[2]), parseInt(match[1])];
};
