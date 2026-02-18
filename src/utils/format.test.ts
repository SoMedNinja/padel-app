import { describe, it, expect } from 'vitest';
import { getISOWeek, getISOWeekRange, percent, formatEloDelta, formatScore } from './format';

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

describe('formatScore', () => {
  it('should format numeric scores correctly', () => {
    expect(formatScore(1, 2)).toBe('1–2');
    expect(formatScore(0, 0)).toBe('0–0');
    expect(formatScore(21, 15)).toBe('21–15');
  });

  it('should format string scores correctly', () => {
    expect(formatScore('1', '2')).toBe('1–2');
    expect(formatScore('21', '15')).toBe('21–15');
  });

  it('should format mixed input types correctly', () => {
    expect(formatScore(1, '2')).toBe('1–2');
    expect(formatScore('1', 2)).toBe('1–2');
  });

  it('should use en-dash as separator', () => {
    const result = formatScore(5, 7);
    expect(result).toContain('–'); // en-dash
    expect(result).not.toContain('-'); // hyphen
    expect(result.charCodeAt(1)).toBe(8211); // en-dash char code
  });
});
