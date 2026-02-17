/**
 * Centralized formatting utilities for the application.
 * Ensures consistent Swedish formatting for dates, scores, and other values.
 */

// Optimization: Cache Intl.DateTimeFormat instances to avoid expensive re-creation
const formatterCache = new Map<string, Intl.DateTimeFormat>();

// Optimization: Define default options as a constant to avoid redundant object allocations
// and allow for faster cache key resolution.
const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

// Optimization: Pre-define common options as constants to leverage identity-based cache hits
// in getFormatter and skip expensive JSON.stringify calls.
const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const FULL_DATE_OPTIONS: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "short" };
const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

const getFormatter = (options: Intl.DateTimeFormatOptions) => {
  // Optimization: Use a constant key for default options to avoid JSON.stringify overhead
  const isDefault = options === DEFAULT_OPTIONS;
  const key = isDefault ? "default" : JSON.stringify(options);

  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("sv-SE", options);
    formatterCache.set(key, formatter);
  }
  return formatter;
};

/**
 * Formats a date string or Date object to a readable Swedish format.
 * Example: "måndag 12 maj 2024" or "12 maj"
 */
export const formatDate = (
  date: string | Date | undefined,
  options: Intl.DateTimeFormatOptions = DEFAULT_OPTIONS
) => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return getFormatter(options).format(d);
};

/**
 * Formats a date to a short Swedish format (day and month).
 * Example: "12 maj"
 */
export const formatShortDate = (date: string | Date | undefined) => {
  return formatDate(date, SHORT_DATE_OPTIONS);
};

/**
 * Formats a date to include the weekday.
 * Example: "måndag 12 maj"
 */
export const formatFullDate = (date: string | Date | undefined) => {
  return formatDate(date, FULL_DATE_OPTIONS);
};

/**
 * Formats a date to a time string.
 * Example: "14:00"
 */
export const formatTime = (date: string | Date | undefined) => {
  return formatDate(date, TIME_OPTIONS);
};

/**
 * Formats a date with relative Swedish labels (Idag/Imorgon) when possible.
 * Matches iOS DateFormattingService.historyDateLabel.
 * Example: "Idag kl 14:00" or "12 maj 2024, 14:00"
 */
export const formatHistoryDateLabel = (date: string | Date | undefined) => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const timeStr = formatTime(d);

  if (isSameDay(d, now)) {
    return `Idag kl ${timeStr}`;
  }
  if (isSameDay(d, tomorrow)) {
    return `Imorgon kl ${timeStr}`;
  }

  // Fallback to medium date with time
  return formatDate(d, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(",", " kl"); // Unify the time separator to " kl" for consistency
};

/**
 * Formats a scoreline with a consistent separator (en-dash).
 * Example: "21–15"
 */
export const formatScore = (s1: number | string, s2: number | string) => {
  return `${s1}–${s2}`;
};

/**
 * Trims and sanitizes a string.
 */
export const sanitizeInput = (val: string | null | undefined, maxLength = 50) => {
  if (!val) return "";
  return val.trim().slice(0, maxLength);
};

/**
 * Returns the ISO week number and year for a given date.
 */
export const getISOWeek = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week: weekNo, year: d.getFullYear() };
};

/**
 * Returns the start and end dates of an ISO week.
 */
export const getISOWeekRange = (week: number, year: number) => {
  const firstThursday = new Date(year, 0, 1);
  while (firstThursday.getDay() !== 4) {
    firstThursday.setDate(firstThursday.getDate() + 1);
  }
  const week1Monday = new Date(firstThursday);
  week1Monday.setDate(firstThursday.getDate() - 3);
  week1Monday.setHours(0, 0, 0, 0);

  const start = new Date(week1Monday);
  start.setDate(week1Monday.getDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
};

export const percent = (wins: number, losses: number) => {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
};

export const formatEloDelta = (delta: number | string) => {
  const numericDelta = Number(delta);
  if (!Number.isFinite(numericDelta) || numericDelta === 0) return "0";
  const roundedDelta = Math.round(numericDelta);
  return roundedDelta > 0 ? `+${roundedDelta}` : `${roundedDelta}`;
};

export const formatMvpDays = (days: number) => {
  if (!days) return "0 dagar";
  if (days >= 365) return `${(days / 365).toFixed(1)} år`;
  return `${days} dagar`;
};

// Optimization: Pre-define options as constants to leverage identity-based cache hits in formatDate
const CHART_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };

export const formatChartTimestamp = (value: string | number, includeTime = false) => {
  if (!value) return "";
  const date = typeof value === "number" ? new Date(value) : value;
  const options = includeTime ? CHART_DATETIME_OPTIONS : DEFAULT_OPTIONS;
  return formatDate(date, options);
};
