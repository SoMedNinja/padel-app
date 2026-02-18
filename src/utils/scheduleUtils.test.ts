import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeVoteSlots, buildUpcomingWeeks } from './scheduleUtils';
import { AvailabilityPollDay } from '../types';

describe('normalizeVoteSlots', () => {
  const mockDay: AvailabilityPollDay = {
    id: 'day1',
    poll_id: 'poll1',
    date: '2024-01-01',
    votes: [
      {
        id: 'vote1',
        poll_day_id: 'day1',
        profile_id: 'user1',
        slot: 'morning',
        created_at: '2024-01-01',
      },
      {
        id: 'vote2',
        poll_day_id: 'day1',
        profile_id: 'user2',
        slot_preferences: ['evening', 'day'],
        created_at: '2024-01-01',
      },
      {
        id: 'vote3',
        poll_day_id: 'day1',
        profile_id: 'user3',
        slot: 'morning',
        slot_preferences: ['day'],
        created_at: '2024-01-01',
      },
      {
        id: 'vote4',
        poll_day_id: 'day1',
        profile_id: 'user4',
        // No slot or preferences
        created_at: '2024-01-01',
      }
    ]
  };

  it('should return null if userId is not provided', () => {
    expect(normalizeVoteSlots(mockDay, undefined)).toBeNull();
  });

  it('should return null if no vote found for user', () => {
    expect(normalizeVoteSlots(mockDay, 'non-existent-user')).toBeNull();
  });

  it('should return legacy slot if preferences are missing', () => {
    expect(normalizeVoteSlots(mockDay, 'user1')).toEqual(['morning']);
  });

  it('should return preferences if present', () => {
    expect(normalizeVoteSlots(mockDay, 'user2')).toEqual(['evening', 'day']);
  });

  it('should prioritize preferences over legacy slot', () => {
    expect(normalizeVoteSlots(mockDay, 'user3')).toEqual(['day']);
  });

  it('should return empty array if no slot or preferences', () => {
    expect(normalizeVoteSlots(mockDay, 'user4')).toEqual([]);
  });

  it('should return legacy slot if preferences are empty array', () => {
     const dayWithEmptyPref: AvailabilityPollDay = {
       ...mockDay,
       votes: [{
         id: 'vote5',
         poll_day_id: 'day1',
         profile_id: 'user5',
         slot: 'morning',
         slot_preferences: [],
         created_at: '2024-01-01'
       }]
     };
     expect(normalizeVoteSlots(dayWithEmptyPref, 'user5')).toEqual(['morning']);
  });
});

describe('buildUpcomingWeeks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate default number of weeks (26) starting from current date', () => {
    // 2024-01-01 is a Monday, Week 1
    vi.setSystemTime(new Date('2024-01-01T12:00:00'));

    const weeks = buildUpcomingWeeks();

    expect(weeks).toHaveLength(26);

    // First week should be Week 1 of 2024
    expect(weeks[0]).toEqual({
      key: '2024-W01',
      label: 'Vecka 1 (2024)',
      week: 1,
      year: 2024
    });

    // Second week should be Week 2 of 2024
    expect(weeks[1]).toEqual({
      key: '2024-W02',
      label: 'Vecka 2 (2024)',
      week: 2,
      year: 2024
    });

    // 26th week should be Week 26 of 2024
    expect(weeks[25]).toEqual({
      key: '2024-W26',
      label: 'Vecka 26 (2024)',
      week: 26,
      year: 2024
    });
  });

  it('should respect custom count', () => {
    vi.setSystemTime(new Date('2024-01-01T12:00:00'));
    const weeks = buildUpcomingWeeks(5);
    expect(weeks).toHaveLength(5);
    expect(weeks[4].week).toBe(5);
  });

  it('should handle year transition', () => {
    // 2023-12-25 is Monday, Week 52 of 2023
    vi.setSystemTime(new Date('2023-12-25T12:00:00'));

    const weeks = buildUpcomingWeeks(3);

    // Week 1: 2023-W52
    expect(weeks[0]).toEqual({
      key: '2023-W52',
      label: 'Vecka 52 (2023)',
      week: 52,
      year: 2023
    });

    // Week 2: 2024-W01 (starts Jan 1st 2024)
    expect(weeks[1]).toEqual({
      key: '2024-W01',
      label: 'Vecka 1 (2024)',
      week: 1,
      year: 2024
    });

    // Week 3: 2024-W02
    expect(weeks[2]).toEqual({
      key: '2024-W02',
      label: 'Vecka 2 (2024)',
      week: 2,
      year: 2024
    });
  });

  it('should handle end of year 2024', () => {
    // 2024-12-30 is Monday, which is Week 1 of 2025
    vi.setSystemTime(new Date('2024-12-30T12:00:00'));

    const weeks = buildUpcomingWeeks(2);

    expect(weeks[0]).toEqual({
      key: '2025-W01',
      label: 'Vecka 1 (2025)',
      week: 1,
      year: 2025
    });

    // Next week: 2025-01-06 (Monday), Week 2 of 2025
    expect(weeks[1]).toEqual({
      key: '2025-W02',
      label: 'Vecka 2 (2025)',
      week: 2,
      year: 2025
    });
  });

  it('should handle mid-week start correctly', () => {
    // 2024-05-08 is Wednesday, Week 19
    vi.setSystemTime(new Date('2024-05-08T12:00:00'));

    const weeks = buildUpcomingWeeks(2);

    // Should identify Week 19
    expect(weeks[0]).toEqual({
      key: '2024-W19',
      label: 'Vecka 19 (2024)',
      week: 19,
      year: 2024
    });

    // Next week is Week 20
    expect(weeks[1]).toEqual({
      key: '2024-W20',
      label: 'Vecka 20 (2024)',
      week: 20,
      year: 2024
    });
  });
});
