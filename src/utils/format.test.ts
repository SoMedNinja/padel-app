import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  getISOWeek,
  getISOWeekRange,
  percent,
  formatEloDelta,
  formatDate,
  formatShortDate,
  formatFullDate,
  formatTime,
  formatHistoryDateLabel,
  formatChartTimestamp
} from './format';

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

describe('Date Formatting', () => {
  // 2024-05-12 is a Sunday
  // Time is 12:00 UTC
  const fixedDate = new Date('2024-05-12T12:00:00Z');
  const fixedDateString = '2024-05-12T12:00:00Z';

  describe('formatDate', () => {
    it('should format Date object correctly with default options', () => {
      // "12 maj 2024"
      expect(formatDate(fixedDate)).toBe('12 maj 2024');
    });

    it('should format date string correctly', () => {
      expect(formatDate(fixedDateString)).toBe('12 maj 2024');
    });

    it('should return empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('');
    });

    it('should return empty string for null', () => {
      // @ts-ignore
      expect(formatDate(null)).toBe('');
    });

    it('should return empty string for invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('');
    });

    it('should use custom options', () => {
      const options: Intl.DateTimeFormatOptions = { month: 'long' };
      expect(formatDate(fixedDate, options)).toBe('maj');
    });
  });

  describe('formatShortDate', () => {
    it('should format as "d MMM"', () => {
      expect(formatShortDate(fixedDate)).toBe('12 maj');
    });
  });

  describe('formatFullDate', () => {
    it('should format as "weekday d MMM"', () => {
      expect(formatFullDate(fixedDate)).toBe('söndag 12 maj');
    });
  });

  describe('formatTime', () => {
    it('should format as "HH:mm"', () => {
      // Assuming UTC environment
      expect(formatTime(fixedDate)).toBe('12:00');
    });
  });

  describe('formatHistoryDateLabel', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Idag kl HH:mm" for same day', () => {
      const now = new Date('2024-05-12T10:00:00Z');
      vi.setSystemTime(now);
      expect(formatHistoryDateLabel(fixedDate)).toBe('Idag kl 12:00');
    });

    it('should return "Imorgon kl HH:mm" for next day', () => {
      const now = new Date('2024-05-11T10:00:00Z');
      vi.setSystemTime(now);
      expect(formatHistoryDateLabel(fixedDate)).toBe('Imorgon kl 12:00');
    });

    it('should return full date string for other dates', () => {
      const now = new Date('2024-05-14T10:00:00Z');
      vi.setSystemTime(now);
      const result = formatHistoryDateLabel(fixedDate);
      // Expect "12 maj 2024" and "12:00" to be present
      expect(result).toContain('12 maj 2024');
      expect(result).toContain('12:00');
    });
  });

  describe('formatChartTimestamp', () => {
    it('should format without time', () => {
      expect(formatChartTimestamp(fixedDate)).toBe('12 maj 2024');
    });

    it('should format with time', () => {
      const result = formatChartTimestamp(fixedDate, true);
      expect(result).toContain('12 maj 2024');
      expect(result).toContain('12:00');
    });

    it('should handle timestamp number', () => {
      expect(formatChartTimestamp(fixedDate.getTime())).toBe('12 maj 2024');
    });
  });
});
