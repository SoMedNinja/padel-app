import { describe, it, expect, vi } from 'vitest';
import {
  getTeamAverageElo,
  getFairnessScore,
  getRotationRounds,
  buildRotationSchedule,
} from './rotation';
import { GUEST_ID } from './guest';
import { ELO_BASELINE } from './elo';

// Mock getExpectedScore and ELO_BASELINE if necessary
// But since getExpectedScore is deterministic, we can use the real implementation or mock it for simplicity.
// For now, let's just mock getExpectedScore to have predictable results for fairness.
vi.mock('./elo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./elo')>();
  return {
    ...actual,
    // Keep ELO_BASELINE from actual or mock it here if needed.
    // Let's use actual implementation for getExpectedScore unless tests fail due to float precision.
  };
});

describe('getTeamAverageElo', () => {
  const eloMap = {
    'p1': 1200,
    'p2': 800,
    'p3': 1000,
  };

  it('calculates average elo correctly for standard players', () => {
    expect(getTeamAverageElo(['p1', 'p2'], eloMap)).toBe(1000); // (1200 + 800) / 2
    expect(getTeamAverageElo(['p1', 'p3'], eloMap)).toBe(1100); // (1200 + 1000) / 2
  });

  it('ignores guest players in calculation', () => {
    expect(getTeamAverageElo(['p1', GUEST_ID], eloMap)).toBe(1200); // Only p1
    expect(getTeamAverageElo([GUEST_ID, 'p2'], eloMap)).toBe(800); // Only p2
  });

  it('returns ELO_BASELINE if no valid players', () => {
    expect(getTeamAverageElo([GUEST_ID], eloMap)).toBe(ELO_BASELINE);
    expect(getTeamAverageElo([], eloMap)).toBe(ELO_BASELINE);
  });
});

describe('getFairnessScore', () => {
  it('returns 100 for 50% win probability', () => {
    expect(getFairnessScore(0.5)).toBe(100);
  });

  it('returns 0 for 0% or 100% win probability', () => {
    expect(getFairnessScore(0)).toBe(0);
    expect(getFairnessScore(1)).toBe(0);
  });

  it('returns intermediate values correctly', () => {
    // Math.round((1 - Math.abs(0.5 - 0.6) * 2) * 100)
    // 1 - (0.1 * 2) = 0.8 -> 80
    expect(getFairnessScore(0.6)).toBe(80);
    expect(getFairnessScore(0.4)).toBe(80);
  });
});

describe('getRotationRounds', () => {
  it('returns correct rounds for known player counts', () => {
    expect(getRotationRounds(5)).toBe(5);
    expect(getRotationRounds(6)).toBe(3);
    expect(getRotationRounds(7)).toBe(7);
    expect(getRotationRounds(8)).toBe(4);
  });

  it('calculates rounds for other player counts', () => {
    expect(getRotationRounds(4)).toBe(2); // Math.ceil(4/2)
    expect(getRotationRounds(9)).toBe(5); // Math.ceil(9/2)
    expect(getRotationRounds(10)).toBe(5); // Math.ceil(10/2)
  });
});

describe('buildRotationSchedule', () => {
  const eloMap = {
    'p1': 1000,
    'p2': 1000,
    'p3': 1000,
    'p4': 1000,
    'p5': 1000,
    'p6': 1000,
    'p7': 1000,
    'p8': 1000,
  };

  it('generates schedule for 4 players', () => {
    const pool = ['p1', 'p2', 'p3', 'p4'];
    const result = buildRotationSchedule(pool, eloMap);

    // 4 players -> 2 rounds
    expect(result.rounds).toHaveLength(2);
    expect(result.averageFairness).toBeGreaterThan(0);

    // Each round should have teamA and teamB with 2 players each
    result.rounds.forEach(round => {
      expect(round.teamA).toHaveLength(2);
      expect(round.teamB).toHaveLength(2);
      expect(round.rest).toHaveLength(0);
    });
  });

  it('generates schedule for 5 players', () => {
    const pool = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const result = buildRotationSchedule(pool, eloMap);

    // 5 players -> 5 rounds
    expect(result.rounds).toHaveLength(5);

    // Each round should have 1 player resting
    result.rounds.forEach(round => {
      expect(round.teamA).toHaveLength(2);
      expect(round.teamB).toHaveLength(2);
      expect(round.rest).toHaveLength(1);
    });

    // Verify all players play equal number of games (4 games each)
    const gamesPlayed: Record<string, number> = {};
    pool.forEach(p => gamesPlayed[p] = 0);

    result.rounds.forEach(round => {
      [...round.teamA, ...round.teamB].forEach(p => gamesPlayed[p]++);
    });

    // Target games for 5 players is (4 * 5) / 5 = 4
    expect(Object.values(gamesPlayed).every(count => count === 4)).toBe(true);
  });

  it('generates schedule for 8 players', () => {
    const pool = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const result = buildRotationSchedule(pool, eloMap);

    // 8 players -> 4 rounds
    expect(result.rounds).toHaveLength(4);

    // Each round should have 4 players resting
    result.rounds.forEach(round => {
      expect(round.rest).toHaveLength(4);
    });

    // Verify all players play equal number of games (2 games each)
    // Target games for 8 players is (4 * 4) / 8 = 2
    const gamesPlayed: Record<string, number> = {};
    pool.forEach(p => gamesPlayed[p] = 0);

    result.rounds.forEach(round => {
      [...round.teamA, ...round.teamB].forEach(p => gamesPlayed[p]++);
    });

    expect(Object.values(gamesPlayed).every(count => count === 2)).toBe(true);
  });

  it('prioritizes fairness with different ELOs', () => {
    // Setup ELOs to force specific pairings for fairness
    // p1 & p2 are strong (2000), p3 & p4 are weak (1000)
    // Fair match: [p1, p3] vs [p2, p4] or [p1, p4] vs [p2, p3] -> Avg 1500 vs 1500
    // Unfair match: [p1, p2] vs [p3, p4] -> Avg 2000 vs 1000

    const unevenEloMap = {
      'p1': 2000,
      'p2': 2000,
      'p3': 1000,
      'p4': 1000,
    };
    const pool = ['p1', 'p2', 'p3', 'p4'];
    const result = buildRotationSchedule(pool, unevenEloMap);

    // Check rounds for fairness
    result.rounds.forEach(round => {
      // We expect fairness to be high
      expect(round.fairness).toBeGreaterThan(80);

      // Check that team averages are close
      const teamAElo = getTeamAverageElo(round.teamA, unevenEloMap);
      const teamBElo = getTeamAverageElo(round.teamB, unevenEloMap);
      const diff = Math.abs(teamAElo - teamBElo);
      expect(diff).toBeLessThan(100); // Should be very close
    });
  });
});
