import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeVoteSlots, computeEmailAvailability } from './scheduleUtils';
import { AvailabilityPollDay, AvailabilityPoll, AvailabilityPollMailLog } from '../types';

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

describe('computeEmailAvailability', () => {
  const basePoll: AvailabilityPoll = {
    id: 'poll1',
    created_by: 'user1',
    week_year: 2024,
    week_number: 1,
    start_date: '2024-01-01',
    end_date: '2024-01-07',
    status: 'open',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return canSend: true when mail_logs is empty or undefined', () => {
    expect(computeEmailAvailability(basePoll)).toEqual({
      canSend: true,
      helper: 'Inga utskick ännu.',
    });

    const pollWithEmptyLogs = { ...basePoll, mail_logs: [] };
    expect(computeEmailAvailability(pollWithEmptyLogs)).toEqual({
      canSend: true,
      helper: 'Inga utskick ännu.',
    });
  });

  it('should return canSend: false when mail_logs has 2 or more entries (max limit)', () => {
    const logs: AvailabilityPollMailLog[] = [
      { id: '1', poll_id: 'poll1', sent_by: 'user1', sent_at: '2024-01-02T10:00:00Z' },
      { id: '2', poll_id: 'poll1', sent_by: 'user1', sent_at: '2024-01-01T10:00:00Z' },
    ];
    const pollWithTwoLogs = { ...basePoll, mail_logs: logs };
    expect(computeEmailAvailability(pollWithTwoLogs)).toEqual({
      canSend: false,
      helper: 'Max 2 mail redan skickade för denna omröstning.',
    });
  });

  it('should return canSend: false and wait time when last email sent less than 24h ago', () => {
    const sentAt = new Date('2024-01-01T10:00:00Z');
    // 2 hours later
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);

    const logs: AvailabilityPollMailLog[] = [
      { id: '1', poll_id: 'poll1', sent_by: 'user1', sent_at: sentAt.toISOString() },
    ];
    const poll = { ...basePoll, mail_logs: logs };

    // Expected remaining: 24 - 2 = 22 hours
    expect(computeEmailAvailability(poll)).toEqual({
      canSend: false,
      helper: 'Vänta cirka 22h till nästa utskick.',
    });
  });

  it('should return canSend: true when last email sent more than 24h ago', () => {
    const sentAt = new Date('2024-01-01T10:00:00Z');
    // 25 hours later
    const now = new Date('2024-01-02T11:00:00Z');
    vi.setSystemTime(now);

    const logs: AvailabilityPollMailLog[] = [
      { id: '1', poll_id: 'poll1', sent_by: 'user1', sent_at: sentAt.toISOString() },
    ];
    const poll = { ...basePoll, mail_logs: logs };

    expect(computeEmailAvailability(poll)).toEqual({
      canSend: true,
      helper: 'Du kan skicka påminnelse nu.',
    });
  });
});
