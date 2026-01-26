import { describe, it, expect } from 'vitest';
import { buildPlayerBadgeStats, buildPlayerBadges } from './badges';
import { ELO_BASELINE } from './elo';

describe('Badges Logic', () => {
  const mockProfiles = [
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' },
    { id: 'p3', name: 'Player 3' },
    { id: 'p4', name: 'Player 4' },
  ] as any[];

  const mockMatches = [
    {
      id: 'm1',
      created_at: new Date().toISOString(),
      team1: ['Player 1', 'Player 2'],
      team2: ['Player 3', 'Player 4'],
      team1_ids: ['p1', 'p2'],
      team2_ids: ['p3', 'p4'],
      team1_sets: 2,
      team2_sets: 0,
      score_type: 'sets'
    }
  ] as any[];

  it('should calculate basic stats correctly', () => {
    const stats = buildPlayerBadgeStats(mockMatches, mockProfiles, 'p1', {});
    expect(stats).not.toBeNull();
    if (stats) {
      expect(stats.matchesPlayed).toBe(1);
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(0);
      expect(stats.currentWinStreak).toBe(1);
    }
  });

  it('should identify quick wins', () => {
    const stats = buildPlayerBadgeStats(mockMatches, mockProfiles, 'p1', {});
    if (stats) {
      expect(stats.quickWins).toBe(1); // 2-0 is <= 3 sets
    }
  });

  it('should identify marathon matches', () => {
    const marathonMatch = [
      {
        id: 'm2',
        created_at: new Date().toISOString(),
        team1: ['Player 1', 'Player 2'],
        team2: ['Player 3', 'Player 4'],
        team1_ids: ['p1', 'p2'],
        team2_ids: ['p3', 'p4'],
        team1_sets: 6,
        team2_sets: 4,
        score_type: 'sets'
      }
    ] as any[];
    const stats = buildPlayerBadgeStats(marathonMatch, mockProfiles, 'p1', {});
    if (stats) {
      expect(stats.marathonMatches).toBe(1);
    }
  });

  it('should build badges correctly from stats', () => {
    const stats = {
      matchesPlayed: 1,
      wins: 1,
      losses: 0,
      currentWinStreak: 1,
      bestWinStreak: 1,
      firstWinVsHigherEloAt: null,
      biggestUpsetEloGap: 0,
      currentElo: 1050,
      matchesLast30Days: 1,
      marathonMatches: 0,
      quickWins: 1,
      closeWins: 0,
      uniquePartners: 1,
      uniqueOpponents: 2,
      tournamentsPlayed: 0,
      tournamentWins: 0,
      tournamentPodiums: 0,
      americanoWins: 0,
      mexicanoWins: 0
    };
    const result = buildPlayerBadges(stats);
    expect(result.totalEarned).toBeGreaterThan(0);
    // Should have earned "Matcher 1" and "Vinster 1"
    const hasMatchBadge = result.earnedBadges.some(b => b.id === 'matches-1');
    const hasWinBadge = result.earnedBadges.some(b => b.id === 'wins-1');
    expect(hasMatchBadge).toBe(true);
    expect(hasWinBadge).toBe(true);
  });
});
