import { describe, it, expect } from 'vitest';
import { buildPlayerBadgeStats, buildPlayerBadges, getBadgeDescriptionById } from './badges';
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
      cleanSheets: 0,
      nightOwlMatches: 0,
      earlyBirdMatches: 0,
      uniquePartners: 1,
      uniqueOpponents: 2,
      tournamentsPlayed: 0,
      tournamentWins: 0,
      tournamentPodiums: 0,
      americanoWins: 0,
      mexicanoWins: 0,
      totalSetsWon: 0,
      totalSetsLost: 0,
      biggestEloLoss: 0,
      currentLossStreak: 0,
      bestLossStreak: 0,
      guestPartners: 0
    };
    const result = buildPlayerBadges(stats);
    expect(result.totalEarned).toBeGreaterThan(0);
    // Should have earned "Matcher 1" and "Vinster 1"
    const hasMatchBadge = result.earnedBadges.some(b => b.id === 'matches-1');
    const hasWinBadge = result.earnedBadges.some(b => b.id === 'wins-1');
    expect(hasMatchBadge).toBe(true);
    expect(hasWinBadge).toBe(true);
  });

  it('should identify unique merits correctly', () => {
    const p1Stats = {
      matchesPlayed: 100,
      wins: 80,
      losses: 20,
      currentWinStreak: 5,
      bestWinStreak: 10,
      firstWinVsHigherEloAt: null,
      biggestUpsetEloGap: 50,
      currentElo: 1500,
      matchesLast30Days: 10,
      marathonMatches: 5,
      quickWins: 10,
      closeWins: 5,
      cleanSheets: 5,
      nightOwlMatches: 0,
      earlyBirdMatches: 0,
      uniquePartners: 10,
      uniqueOpponents: 20,
      tournamentsPlayed: 0,
      tournamentWins: 0,
      tournamentPodiums: 0,
      americanoWins: 0,
      mexicanoWins: 0,
      totalSetsWon: 100,
      totalSetsLost: 50,
      biggestEloLoss: 20,
      currentLossStreak: 0,
      bestLossStreak: 5,
      guestPartners: 0
    };
    const p2Stats = {
      ...p1Stats,
      matchesPlayed: 50,
      currentElo: 1400
    };

    const allStats = {
      'p1': p1Stats,
      'p2': p2Stats
    };

    const result = buildPlayerBadges(p1Stats, allStats, 'p1');
    const hasKingBadge = result.earnedBadges.some(b => b.id === 'king-of-elo');
    const hasMostActiveBadge = result.earnedBadges.some(b => b.id === 'most-active');

    expect(hasKingBadge).toBe(true);
    expect(hasMostActiveBadge).toBe(true);

    const result2 = buildPlayerBadges(p2Stats, allStats, 'p2');
    const hasKingBadge2 = result2.earnedBadges.some(b => b.id === 'king-of-elo');
    expect(hasKingBadge2).toBe(false);
  });

  it('should return correct badge descriptions', () => {
    expect(getBadgeDescriptionById('matches-1')).toBe('Spela 1 matcher');
    expect(getBadgeDescriptionById('wins-5')).toBe('Vinn 5 matcher');
    expect(getBadgeDescriptionById('king-of-elo')).toBe('Högst ELO just nu (minst 10 spelade matcher)');
    expect(getBadgeDescriptionById('giant-slayer')).toBe('Vinn mot ett lag med högre genomsnittlig ELO');
    expect(getBadgeDescriptionById(null)).toBeNull();
    expect(getBadgeDescriptionById('non-existent')).toBeNull();
  });

  it('should identify other players unique merits', () => {
    const p1Stats = {
      matchesPlayed: 100,
      wins: 80,
      losses: 20,
      currentWinStreak: 5,
      bestWinStreak: 10,
      firstWinVsHigherEloAt: null,
      biggestUpsetEloGap: 50,
      currentElo: 1500,
      matchesLast30Days: 10,
      marathonMatches: 5,
      quickWins: 10,
      closeWins: 5,
      cleanSheets: 5,
      nightOwlMatches: 0,
      earlyBirdMatches: 0,
      uniquePartners: 10,
      uniqueOpponents: 20,
      tournamentsPlayed: 0,
      tournamentWins: 0,
      tournamentPodiums: 0,
      americanoWins: 0,
      mexicanoWins: 0,
      totalSetsWon: 100,
      totalSetsLost: 50,
      biggestEloLoss: 20,
      currentLossStreak: 0,
      bestLossStreak: 5,
      guestPartners: 0
    };
    const p2Stats = {
      ...p1Stats,
      matchesPlayed: 50,
      currentElo: 1600
    };

    const allStats = {
      'p1': p1Stats,
      'p2': p2Stats
    };

    const result = buildPlayerBadges(p1Stats, allStats, 'p1');
    const kingBadge = result.otherUniqueBadges.find(b => b.id === 'king-of-elo');
    expect(kingBadge).toBeDefined();
    expect(kingBadge?.holderId).toBe('p2');
    expect(kingBadge?.holderValue).toBe('1600 ELO');
    expect(result.earnedBadges.some(b => b.id === 'king-of-elo')).toBe(false);
  });

  it('should calculate new negative stats correctly', () => {
    const negativeMatches = [
      {
        id: 'm1',
        created_at: '2024-01-01T10:00:00Z',
        team1: ['Player 1', 'Player 2'],
        team2: ['Player 3', 'Player 4'],
        team1_ids: ['p1', 'p2'],
        team2_ids: ['p3', 'p4'],
        team1_sets: 0,
        team2_sets: 2,
        score_type: 'sets'
      },
      {
        id: 'm2',
        created_at: '2024-01-01T11:00:00Z',
        team1: ['Player 1', 'Player 3'],
        team2: ['Player 2', 'Player 4'],
        team1_ids: ['p1', 'p3'],
        team2_ids: ['p2', 'p4'],
        team1_sets: 1,
        team2_sets: 2,
        score_type: 'sets'
      }
    ] as any[];
    const stats = buildPlayerBadgeStats(negativeMatches, mockProfiles, 'p1', {});
    expect(stats).not.toBeNull();
    if (stats) {
      expect(stats.losses).toBe(2);
      expect(stats.totalSetsLost).toBe(4);
      expect(stats.bestLossStreak).toBe(2);
      expect(stats.biggestEloLoss).toBeGreaterThan(0);
    }
  });

  it('should award new unique merits correctly', () => {
    const p1Stats = {
      matchesPlayed: 20,
      wins: 0,
      losses: 20,
      currentWinStreak: 0,
      bestWinStreak: 0,
      currentLossStreak: 20,
      bestLossStreak: 20,
      firstWinVsHigherEloAt: null,
      biggestUpsetEloGap: 0,
      currentElo: 800,
      biggestEloLoss: 50,
      totalSetsWon: 0,
      totalSetsLost: 40,
      matchesLast30Days: 10,
      marathonMatches: 0,
      quickWins: 0,
      closeWins: 0,
      cleanSheets: 0,
      nightOwlMatches: 0,
      earlyBirdMatches: 0,
      uniquePartners: 5,
      uniqueOpponents: 10,
      tournamentsPlayed: 0,
      tournamentWins: 0,
      tournamentPodiums: 0,
      americanoWins: 0,
      mexicanoWins: 0,
      guestPartners: 0
    };
    const p2Stats = {
      ...p1Stats,
      matchesPlayed: 20,
      wins: 10,
      losses: 10,
      currentElo: 1000,
      biggestEloLoss: 10,
      totalSetsLost: 20,
      bestLossStreak: 5
    };

    const allStats = {
      'p1': p1Stats,
      'p2': p2Stats
    };

    const result = buildPlayerBadges(p1Stats, allStats, 'p1');

    const hasLossMachine = result.earnedBadges.some(b => b.id === 'loss-machine');
    const hasTroughDweller = result.earnedBadges.some(b => b.id === 'trough-dweller');
    const hasBiggestFall = result.earnedBadges.some(b => b.id === 'biggest-fall');
    const hasHardTimes = result.earnedBadges.some(b => b.id === 'hard-times');
    const hasMostGenerous = result.earnedBadges.some(b => b.id === 'most-generous');
    const hasColdStreak = result.earnedBadges.some(b => b.id === 'cold-streak-pro');

    expect(hasLossMachine).toBe(true);
    expect(hasTroughDweller).toBe(true);
    expect(hasBiggestFall).toBe(true);
    expect(hasHardTimes).toBe(true);
    expect(hasMostGenerous).toBe(true);
    expect(hasColdStreak).toBe(true);

    const result2 = buildPlayerBadges(p2Stats, allStats, 'p2');
    expect(result2.earnedBadges.some(b => b.id === 'loss-machine')).toBe(false);
    expect(result2.otherUniqueBadges.some(b => b.id === 'loss-machine' && b.holderId === 'p1')).toBe(true);
  });

  it('should award sets-lost threshold badge', () => {
    const stats = {
      matchesPlayed: 10,
      wins: 0,
      losses: 10,
      currentWinStreak: 0,
      bestWinStreak: 0,
      currentLossStreak: 10,
      bestLossStreak: 10,
      firstWinVsHigherEloAt: null,
      biggestUpsetEloGap: 0,
      currentElo: 900,
      biggestEloLoss: 10,
      totalSetsWon: 5,
      totalSetsLost: 20,
      matchesLast30Days: 5,
      marathonMatches: 0,
      quickWins: 0,
      closeWins: 0,
      cleanSheets: 0,
      nightOwlMatches: 0,
      earlyBirdMatches: 0,
      uniquePartners: 5,
      uniqueOpponents: 5,
      tournamentsPlayed: 0,
      tournamentWins: 0,
      tournamentPodiums: 0,
      americanoWins: 0,
      mexicanoWins: 0,
      guestPartners: 0
    };
    const result = buildPlayerBadges(stats);
    const hasSetsLost10 = result.earnedBadges.some(b => b.id === 'sets-lost-10');
    const hasSetsLost25 = result.earnedBadges.some(b => b.id === 'sets-lost-25');

    expect(hasSetsLost10).toBe(true);
    expect(hasSetsLost25).toBe(false);
  });
});
