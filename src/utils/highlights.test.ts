import { describe, it, expect } from 'vitest';
import { findMatchHighlight } from './highlights';
import { Match, PlayerStats } from '../types';

describe('findMatchHighlight', () => {
  const mockMatches: Match[] = [
    {
      id: 'm1',
      created_at: '2024-05-20T10:00:00Z',
      team1: ['Player 1'],
      team2: ['Player 2'],
      team1_ids: ['p1'],
      team2_ids: ['p2'],
      team1_sets: 6,
      team2_sets: 0,
      source_tournament_type: 'standalone',
      created_by: 'u1'
    },
    {
      id: 'm2',
      created_at: '2024-05-21T10:00:00Z',
      team1: ['Player 1'],
      team2: ['Player 2'],
      team1_ids: ['p1'],
      team2_ids: ['p2'],
      team1_sets: 6,
      team2_sets: 5,
      source_tournament_type: 'standalone',
      created_by: 'u1'
    }
  ];

  const mockPlayerStats: PlayerStats[] = [
    {
      id: 'p1',
      name: 'Player 1',
      elo: 1000,
      wins: 1,
      losses: 1,
      games: 2,
      history: [
        { matchId: 'm1', elo: 1020, delta: 20, result: 'W', timestamp: 0, date: '2024-05-20' },
        { matchId: 'm2', elo: 1030, delta: 10, result: 'W', timestamp: 0, date: '2024-05-21' }
      ],
      recentResults: ['W', 'W'],
      partners: {}
    },
    {
      id: 'p2',
      name: 'Player 2',
      elo: 1000,
      wins: 1,
      losses: 1,
      games: 2,
      history: [
        { matchId: 'm1', elo: 980, delta: -20, result: 'L', timestamp: 0, date: '2024-05-20' },
        { matchId: 'm2', elo: 970, delta: -10, result: 'L', timestamp: 0, date: '2024-05-21' }
      ],
      recentResults: ['L', 'L'],
      partners: {}
    }
  ];

  it('should find the latest match highlight', () => {
    const highlight = findMatchHighlight(mockMatches, mockPlayerStats);
    expect(highlight).not.toBeNull();
    expect(highlight?.matchId).toBe('m2');
    expect(highlight?.reason).toBe('thriller'); // 6-5 is a thriller
  });

  it('should return null for empty matches', () => {
    expect(findMatchHighlight([], [])).toBeNull();
  });
});
