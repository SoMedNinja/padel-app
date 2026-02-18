import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getISOWeek, getISOWeekRange, percent, formatEloDelta, formatHistoryDateLabel, formatShortDate, formatFullDate, formatChartTimestamp, sanitizeInput } from './format';

describe('ISO Week Utilities', () => {
  describe('getISOWeek', () => {
    it('should return correct week for standard dates', () => {
      expect(getISOWeek(new Date(2024, 0, 1))).toEqual({ week: 1, year: 2024 }); // Monday
      expect(getISOWeek(new Date(2024, 0, 4))).toEqual({ week: 1, year: 2024 }); // Thursday
      expect(getISOWeek(new Date(2024, 0, 7))).toEqual({ week: 1, year: 2024 }); // Sunday
      expect(getISOWeek(new Date(2024, 0, 8))).toEqual({ week: 2, year: 2024 }); // Monday
    });

    it('should handle year boundaries correctly', () => {
      // 2023-12-31 is Sunday and belongs to week 52 of 2023
      expect(getISOWeek(new Date(2023, 11, 31))).toEqual({ week: 52, year: 2023 });

      // 2024-12-30 is Monday and belongs to week 1 of 2025 (actually let's check)
      // 2025-01-01 is Wednesday. 2025-01-02 is Thursday.
      // So week 1 of 2025 starts on 2024-12-30.
      expect(getISOWeek(new Date(2024, 11, 30))).toEqual({ week: 1, year: 2025 });
    });
  });

  describe('getISOWeekRange', () => {
    it('should return correct range for week 1 of 2024', () => {
      const { start, end } = getISOWeekRange(1, 2024);
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1); // Monday

      expect(end.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(0);
      expect(end.getDate()).toBe(8); // Next Monday
    });

    it('should return correct range for week 52 of 2023', () => {
      const { start, end } = getISOWeekRange(52, 2023);
      // Week 1 of 2023 started Jan 2nd.
      // 51 weeks later: Jan 2 + 51 * 7 = Jan 2 + 357.
      // 357 / 365 ... let's just calculate:
      // Week 52 of 2023 starts on Dec 25.
      expect(start.getFullYear()).toBe(2023);
      expect(start.getMonth()).toBe(11); // December
      expect(start.getDate()).toBe(25);

      expect(end.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(0);
      expect(end.getDate()).toBe(1);
    });

    it('should return correct range for week 1 of 2025', () => {
      const { start, end } = getISOWeekRange(1, 2025);
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(11);
      expect(start.getDate()).toBe(30);

      expect(end.getFullYear()).toBe(2025);
      expect(end.getMonth()).toBe(0);
      expect(end.getDate()).toBe(6);
    });
  });
});

describe('Percent', () => {
  it('should handle zero total', () => {
    expect(percent(0, 0)).toBe(0);
  });

  it('should calculate 100% correctly', () => {
    expect(percent(5, 0)).toBe(100);
  });

  it('should calculate 0% correctly', () => {
    expect(percent(0, 5)).toBe(0);
  });

  it('should calculate 50% correctly', () => {
    expect(percent(1, 1)).toBe(50);
  });

  it('should round correctly', () => {
    expect(percent(1, 2)).toBe(33); // 1/3 = 0.333... -> 33
    expect(percent(2, 1)).toBe(67); // 2/3 = 0.666... -> 67
  });
});

describe('formatEloDelta', () => {
  it('should format positive integers', () => {
    expect(formatEloDelta(5)).toBe('+5');
    expect(formatEloDelta(100)).toBe('+100');
  });

  it('should format negative integers', () => {
    expect(formatEloDelta(-5)).toBe('-5');
    expect(formatEloDelta(-100)).toBe('-100');
  });

  it('should format zero', () => {
    expect(formatEloDelta(0)).toBe('0');
    expect(formatEloDelta(-0)).toBe('0');
  });

  it('should round floats', () => {
    expect(formatEloDelta(5.6)).toBe('+6');
    expect(formatEloDelta(5.4)).toBe('+5');
    expect(formatEloDelta(-5.6)).toBe('-6');
    expect(formatEloDelta(-5.4)).toBe('-5');
  });

  it('should handle small floats rounding to zero', () => {
    expect(formatEloDelta(0.4)).toBe('0');
    expect(formatEloDelta(-0.4)).toBe('0');
  });

  it('should handle string inputs', () => {
    expect(formatEloDelta('5')).toBe('+5');
    expect(formatEloDelta('-5')).toBe('-5');
    expect(formatEloDelta('0')).toBe('0');
    expect(formatEloDelta('5.6')).toBe('+6');
  });

  it('should handle invalid inputs gracefully', () => {
    expect(formatEloDelta(NaN)).toBe('0');
    expect(formatEloDelta(Infinity)).toBe('0');
    expect(formatEloDelta(-Infinity)).toBe('0');
    expect(formatEloDelta('')).toBe('0');
    expect(formatEloDelta('abc')).toBe('0');
  });
});

describe('formatHistoryDateLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set system time to Friday, May 10, 2024 at 12:00:00
    vi.setSystemTime(new Date('2024-05-10T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return empty string for empty inputs', () => {
    expect(formatHistoryDateLabel(undefined)).toBe('');
    expect(formatHistoryDateLabel(null as any)).toBe('');
    expect(formatHistoryDateLabel('')).toBe('');
  });

  it('should return empty string for invalid dates', () => {
    expect(formatHistoryDateLabel('invalid-date')).toBe('');
  });

  it('should format today correctly', () => {
    const today = new Date('2024-05-10T15:30:00');
    expect(formatHistoryDateLabel(today)).toBe('Idag kl 15:30');
  });

  it('should format tomorrow correctly', () => {
    const tomorrow = new Date('2024-05-11T10:00:00');
    expect(formatHistoryDateLabel(tomorrow)).toBe('Imorgon kl 10:00');
  });

  it('should format other dates with full date and time', () => {
    // Standard date formatting in sv-SE is typically "d MMM yyyy HH:mm" or similar
    // The implementation relies on Intl.DateTimeFormat with sv-SE locale.
    // We check if the result contains the key parts.
    const date = new Date('2024-05-15T14:00:00');
    const result = formatHistoryDateLabel(date);

    // Expect "15 maj 2024 14:00" or similar.
    expect(result).toMatch(/15 maj 2024.*14:00/);
  });

  it('should handle string inputs', () => {
    expect(formatHistoryDateLabel('2024-05-10T15:30:00')).toBe('Idag kl 15:30');
  });
});

describe('formatShortDate', () => {
  it('should format valid Date object correctly', () => {
    // 2024-05-12 is May 12th. In Swedish: "12 maj"
    const date = new Date('2024-05-12T12:00:00');
    const result = formatShortDate(date);
    // Expect 12 maj
    expect(result).toMatch(/12 maj/);
  });

  it('should format valid date string correctly', () => {
    const result = formatShortDate('2024-05-12');
    expect(result).toMatch(/12 maj/);
  });

  it('should return empty string for undefined input', () => {
    expect(formatShortDate(undefined)).toBe('');
  });

  it('should return empty string for invalid date string', () => {
    expect(formatShortDate('invalid-date')).toBe('');
  });
});

describe('formatFullDate', () => {
  it('should format valid Date object correctly', () => {
    // 2024-05-13 is a Monday
    const date = new Date('2024-05-13T12:00:00');
    expect(formatFullDate(date)).toMatch(/måndag 13 maj/);
  });

  it('should format valid date string correctly', () => {
    expect(formatFullDate('2024-05-13')).toMatch(/måndag 13 maj/);
  });

  it('should return empty string for undefined input', () => {
    expect(formatFullDate(undefined)).toBe('');
  });

  it('should return empty string for invalid date', () => {
    expect(formatFullDate('invalid-date')).toBe('');
  });
});

describe('formatChartTimestamp', () => {
  it('should format timestamp (number) without time by default', () => {
    const timestamp = new Date('2024-05-12T12:00:00').getTime();
    expect(formatChartTimestamp(timestamp)).toBe('12 maj 2024');
  });

  it('should format date string without time by default', () => {
    expect(formatChartTimestamp('2024-05-12T12:00:00')).toBe('12 maj 2024');
  });

  it('should include time when requested', () => {
    const timestamp = new Date('2024-05-12T12:00:00').getTime();
    // Swedish locale time format is typically HH:mm
    expect(formatChartTimestamp(timestamp, true)).toMatch(/12 maj 2024.*12:00/);
  });

  it('should handle zero, empty string, and invalid inputs', () => {
    expect(formatChartTimestamp(0)).toBe('');
    expect(formatChartTimestamp('')).toBe('');
    expect(formatChartTimestamp(null as any)).toBe('');
    expect(formatChartTimestamp(undefined as any)).toBe('');
  });
});

describe('sanitizeInput', () => {
  it('should return empty string for null/undefined', () => {
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeInput(undefined)).toBe('');
  });

  it('should trim whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('should truncate to default max length (50)', () => {
    const longString = 'a'.repeat(60);
    expect(sanitizeInput(longString)).toBe('a'.repeat(50));
    expect(sanitizeInput(longString).length).toBe(50);
  });

  it('should truncate to custom max length', () => {
    const longString = 'a'.repeat(20);
    expect(sanitizeInput(longString, 10)).toBe('a'.repeat(10));
    expect(sanitizeInput(longString, 10).length).toBe(10);
  });

  it('should handle strings shorter than max length', () => {
    const shortString = 'short';
    expect(sanitizeInput(shortString)).toBe(shortString);
  });

  it('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });
});
