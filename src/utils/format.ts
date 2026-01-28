/**
 * Centralized formatting utilities for the application.
 * Ensures consistent Swedish formatting for dates, scores, and other values.
 */

/**
 * Formats a date string or Date object to a readable Swedish format.
 * Example: "måndag 12 maj 2024" or "12 maj"
 */
export const formatDate = (
  date: string | Date | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
) => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", options).format(d);
};

/**
 * Formats a date to a short Swedish format (day and month).
 * Example: "12 maj"
 */
export const formatShortDate = (date: string | Date | undefined) => {
  return formatDate(date, { month: "short", day: "numeric" });
};

/**
 * Formats a date to include the weekday.
 * Example: "måndag 12 maj"
 */
export const formatFullDate = (date: string | Date | undefined) => {
  return formatDate(date, { weekday: "long", day: "numeric", month: "short" });
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
