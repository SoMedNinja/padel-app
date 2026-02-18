import { describe, it, expect } from 'vitest';
import { normalizeVoteSlots } from './scheduleUtils';
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
