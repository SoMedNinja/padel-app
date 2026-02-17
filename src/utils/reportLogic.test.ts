import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateEveningStats } from './reportLogic';
import { Match, Profile, PlayerStats, MvpScoreResult } from '../types';
import { GUEST_ID } from './guest';

// Mock dependencies
vi.mock('./elo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./elo')>();
  return {
    ...actual,
    calculateEloWithStats: vi.fn(),
  };
});

vi.mock('./mvp', () => ({
  scorePlayersForMvp: vi.fn(),
  getMvpWinner: vi.fn(),
  EVENING_MIN_GAMES: 3,
}));

// Import mocks after definition to use vi.mocked
import { calculateEloWithStats } from './elo';
import { scorePlayersForMvp, getMvpWinner } from './mvp';

const mockCalculateElo = vi.mocked(calculateEloWithStats);
const mockScorePlayersForMvp = vi.mocked(scorePlayersForMvp);
const mockGetMvpWinner = vi.mocked(getMvpWinner);

describe('calculateEveningStats', () => {
  const targetDate = new Date('2023-10-27T12:00:00Z');
  const targetDateISO = targetDate.toISOString().slice(0, 10);
  const otherDateISO = '2023-10-28';

  let matches: Match[];
  let profileMap: Map<string, Profile>;
  let nameToIdMap: Map<string, string>;
  let eloMap: Record<string, number>;

  beforeEach(() => {
    vi.clearAllMocks();

    matches = [];
    profileMap = new Map();
    nameToIdMap = new Map();
    eloMap = {};

    // Default mock returns
    mockCalculateElo.mockReturnValue({
      players: [],
      eloDeltaByMatch: {},
      eloRatingByMatch: {},
    });
    mockScorePlayersForMvp.mockReturnValue([]);
    mockGetMvpWinner.mockReturnValue(null);
  });

  const createMatch = (
    id: string,
    dateISO: string,
    team1Ids: string[],
    team2Ids: string[],
    team1Sets: number,
    team2Sets: number
  ): Match => ({
    id,
    created_at: `${dateISO}T18:00:00Z`,
    team1: [],
    team2: [],
    team1_ids: team1Ids,
    team2_ids: team2Ids,
    team1_sets: team1Sets,
    team2_sets: team2Sets,
  });

  const addProfile = (id: string, name: string) => {
    const profile: Profile = { id, name };
    profileMap.set(id, profile);
    nameToIdMap.set(name, id);
    eloMap[id] = 1000;
    return profile;
  };

  it('should return null if no matches found for the target date', () => {
    matches = [
      createMatch('1', otherDateISO, ['p1', 'p2'], ['p3', 'p4'], 2, 0),
    ];
    addProfile('p1', 'Player 1');

    const result = calculateEveningStats(matches, targetDate, eloMap, profileMap, nameToIdMap);
    expect(result).toBeNull();
  });

  it('should calculate basic stats correctly for evening matches', () => {
    addProfile('p1', 'Player 1');
    addProfile('p2', 'Player 2');
    addProfile('p3', 'Player 3');
    addProfile('p4', 'Player 4');

    matches = [
      // Match 1: p1,p2 win vs p3,p4 (2-0)
      createMatch('1', targetDateISO, ['p1', 'p2'], ['p3', 'p4'], 2, 0),
      // Match 2: p1,p3 win vs p2,p4 (2-1)
      createMatch('2', targetDateISO, ['p1', 'p3'], ['p2', 'p4'], 2, 1),
    ];

    const result = calculateEveningStats(matches, targetDate, eloMap, profileMap, nameToIdMap);

    expect(result).not.toBeNull();
    expect(result?.matches).toBe(2);
    expect(result?.totalSets).toBe(2 + 0 + 2 + 1); // 5

    // Check Player 1: 2 wins, 0 losses
    const p1 = result?.leaders.find(p => p.id === 'p1');
    expect(p1).toBeDefined();
    expect(p1?.games).toBe(2);
    expect(p1?.wins).toBe(2);
    expect(p1?.setsFor).toBe(2 + 2); // 4
    expect(p1?.setsAgainst).toBe(0 + 1); // 1

    // Check Player 2: 1 win, 1 loss
    const p2 = result?.leaders.find(p => p.id === 'p2');
    expect(p2).toBeDefined();
    expect(p2?.games).toBe(2);
    expect(p2?.wins).toBe(1);
    expect(p2?.losses).toBe(1);
  });

  it('should identify MVP correctly based on mocked helper', () => {
    addProfile('p1', 'Player 1');
    matches = [createMatch('1', targetDateISO, ['p1', 'p2'], ['p3', 'p4'], 2, 0)];

    // Mock MVP result
    const mvpResult: MvpScoreResult = {
      id: 'p1',
      name: 'Player 1',
      score: 100,
      wins: 1,
      games: 1,
      winRate: 1,
      periodEloGain: 10,
      eloNet: 1010,
      isEligible: true,
      badgeId: null,
    };
    mockGetMvpWinner.mockReturnValue(mvpResult);

    const result = calculateEveningStats(matches, targetDate, eloMap, profileMap, nameToIdMap);

    expect(result?.mvp).not.toBeNull();
    expect(result?.mvp?.id).toBe('p1');
    expect(mockScorePlayersForMvp).toHaveBeenCalled();
    expect(mockGetMvpWinner).toHaveBeenCalled();
  });

  it('should calculate fun facts correctly', () => {
    addProfile('p1', 'Player 1'); // 2 games, 2 wins, 2 partners (p2, p3)
    addProfile('p2', 'Player 2'); // 2 games, 1 win, 2 partners (p1, p4)
    addProfile('p3', 'Player 3'); // 2 games, 1 win, 2 partners (p4, p1)
    addProfile('p4', 'Player 4'); // 2 games, 0 wins, 2 partners (p3, p2)

    // Add p5 with 1 game, 100% win rate (should be excluded from strongest due to < 2 games)
    addProfile('p5', 'Player 5');

    matches = [
      createMatch('1', targetDateISO, ['p1', 'p2'], ['p3', 'p4'], 2, 0),
      createMatch('2', targetDateISO, ['p1', 'p3'], ['p2', 'p4'], 2, 1),
      createMatch('3', targetDateISO, ['p5', GUEST_ID], ['p4', GUEST_ID], 2, 0), // Dummy match for p5 with guest partner
    ];

    const result = calculateEveningStats(matches, targetDate, eloMap, profileMap, nameToIdMap);

    // Most rotations: p1 has partners p2, p3. p2 has p1, p4.
    // Logic: sort by rotations desc.
    const rotations = result?.funFacts.mostRotations;
    expect(rotations?.[0].rotations).toBeGreaterThan(0);

    // Strongest: p1 (100%), p5 (100% but 1 game -> excluded), p2 (50%), p3 (50%), p4 (0%)
    const strongest = result?.funFacts.strongest;
    expect(strongest).toBeDefined();
    expect(strongest?.length).toBeGreaterThan(0);
    // p1 should be first (100%, 2 games)
    expect(strongest?.[0].id).toBe('p1');
    // p5 should NOT be in strongest because games < 2
    expect(strongest?.find(p => p.id === 'p5')).toBeUndefined();

    // Marathon: max total sets (for + against)
    // p1: (2+0) + (2+1) = 5
    // p2: (2+0) + (1+2) = 5
    // p4: (0+2) + (1+2) + (0+2) = 7 (played 3 matches)
    const marathon = result?.funFacts.marathon;
    expect(marathon).not.toBeNull();
    // p4 played in match 1, 2, 3. sets: match1(0+2) + match2(1+2) + match3(0+2) = 2+3+2 = 7
    // Wait, match 3 teams: p5, p5 vs p4, p4. p4 is in team2. sets: 0-2.
    expect(marathon?.name).toBe('Player 4');
    expect(marathon?.sets).toBe(7);
  });

  it('should skip calculateEloWithStats if elo data is provided', () => {
    addProfile('p1', 'Player 1');
    matches = [createMatch('1', targetDateISO, ['p1', 'p2'], ['p3', 'p4'], 2, 0)];

    const eloPlayers: PlayerStats[] = [];
    const eloDeltaByMatch: Record<string, Record<string, number>> = {
      '1': { 'p1': 10 }
    };

    calculateEveningStats(matches, targetDate, eloMap, profileMap, nameToIdMap, eloPlayers, eloDeltaByMatch);

    expect(mockCalculateElo).not.toHaveBeenCalled();
  });

  it('should ignore guest players in stats', () => {
    addProfile('p1', 'Player 1');

    matches = [
      createMatch('1', targetDateISO, ['p1', GUEST_ID], ['p3', 'p4'], 2, 0)
    ];

    const result = calculateEveningStats(matches, targetDate, eloMap, profileMap, nameToIdMap);

    // Stats for guest should not exist
    const leaders = result?.leaders || [];
    const guestStat = leaders.find(l => l.id === GUEST_ID);
    expect(guestStat).toBeUndefined();

    // p1 should be there
    const p1Stat = leaders.find(l => l.id === 'p1');
    expect(p1Stat).toBeDefined();
  });
});
