import { describe, it, expect } from 'vitest';
import { getISOWeek, getISOWeekRange } from './format';

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
