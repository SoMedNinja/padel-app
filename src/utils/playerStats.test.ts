import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { buildMvpSummary, buildComparisonChartData } from './playerStats';
import { Match, PlayerStats, Profile, EloHistoryEntry } from '../types';

// Helper to create a basic match
const createMatch = (
  id: string,
  date: string,
  team1Ids: string[],
  team2Ids: string[],
  team1Sets: number,
  team2Sets: number
): Match => ({
  id,
  created_at: date,
  team1: team1Ids, // simplified for test
  team2: team2Ids,
  team1_ids: team1Ids,
  team2_ids: team2Ids,
  team1_sets: team1Sets,
  team2_sets: team2Sets,
  score_type: 'sets',
});

// Helper to create a player with history
const createPlayer = (
  id: string,
  name: string,
  elo: number,
  history: EloHistoryEntry[] = []
): PlayerStats => ({
  id,
  name,
  elo,
  startElo: 1200,
  wins: 0,
  losses: 0,
  games: 0,
  history,
  partners: {},
  recentResults: [],
});

const createProfile = (id: string, name: string): Profile => ({
  id,
  name,
});

describe('buildMvpSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return empty objects for empty input', () => {
    const result = buildMvpSummary([], [], []);
    expect(result.monthlyMvpDays).toEqual({});
    expect(result.eveningMvpCounts).toEqual({});
  });

  it('should calculate monthly MVP correctly with a single match', () => {
    // Setup date
    const today = new Date('2024-05-15T12:00:00Z');
    vi.setSystemTime(today);

    const matchDate = '2024-05-15T10:00:00Z';
    const matchId = 'm1';
    const p1Id = 'p1';
    const p2Id = 'p2';

    const match = createMatch(matchId, matchDate, [p1Id], [p2Id], 2, 0); // P1 wins

    // Player 1 history: +10 ELO
    const p1History: EloHistoryEntry = {
      matchId,
      date: matchDate,
      timestamp: new Date(matchDate).getTime(),
      delta: 10,
      result: 'W',
      elo: 1210,
    };

    // Player 2 history: -10 ELO
    const p2History: EloHistoryEntry = {
      matchId,
      date: matchDate,
      timestamp: new Date(matchDate).getTime(),
      delta: -10,
      result: 'L',
      elo: 1190,
    };

    const p1 = createPlayer(p1Id, 'Player One', 1210, [p1History]);
    const p2 = createPlayer(p2Id, 'Player Two', 1190, [p2History]);

    const result = buildMvpSummary([match], [createProfile(p1Id, 'Player One'), createProfile(p2Id, 'Player Two')], [p1, p2]);

    // Expect Player One to be MVP for the day (1 win, +10 ELO)
    expect(result.monthlyMvpDays['Player One']).toBe(1);
    // rolling window includes today. Since the loop goes from match date to today (same day), it runs once.
  });

  it('should handle rolling window correctly', () => {
    // Scenario:
    // Match 1 on Jan 1: P1 wins (+10)
    // Match 2 on Jan 20: P1 wins (+10)
    // Current date: Feb 5.
    // Window is 30 days.
    // Jan 1 match falls out of window on Jan 31.

    const jan1 = '2024-01-01T10:00:00Z';
    const jan20 = '2024-01-20T10:00:00Z';
    // const feb5 = '2024-02-05T12:00:00Z';
    // Wait, the function iterates from startDate (Jan 1) to endDate (Feb 5).
    // It checks MVP for *each day*.

    const m1 = createMatch('m1', jan1, ['p1'], ['p2'], 2, 0);
    const m2 = createMatch('m2', jan20, ['p1'], ['p2'], 2, 0);

    const p1History1: EloHistoryEntry = { matchId: 'm1', date: jan1, timestamp: new Date(jan1).getTime(), delta: 10, result: 'W', elo: 1210 };
    const p1History2: EloHistoryEntry = { matchId: 'm2', date: jan20, timestamp: new Date(jan20).getTime(), delta: 10, result: 'W', elo: 1220 };

    const p2History1: EloHistoryEntry = { matchId: 'm1', date: jan1, timestamp: new Date(jan1).getTime(), delta: -10, result: 'L', elo: 1190 };
    const p2History2: EloHistoryEntry = { matchId: 'm2', date: jan20, timestamp: new Date(jan20).getTime(), delta: -10, result: 'L', elo: 1180 };

    const p1 = createPlayer('p1', 'Player One', 1220, [p1History1, p1History2]);
    const p2 = createPlayer('p2', 'Player Two', 1180, [p2History1, p2History2]);

    // Set "today" to enable the loop to go far enough
    vi.setSystemTime(new Date('2024-02-05T12:00:00Z'));

    const result = buildMvpSummary([m1, m2], [], [p1, p2]);

    // Analysis:
    // Jan 1 - Jan 30: Window includes Jan 1 match. P1 has score from match 1. P1 wins MVP. (30 days)
    // Jan 31: Window (Jan 1 00:00 - Jan 31 23:59) - Wait, window is 30 days.
    // Logic: cutoff = dayEndTime - 30 days.
    // If day is Jan 31 (end time), cutoff is Jan 1 end time approximately.
    // Let's rely on the code logic.
    // From Jan 20 onwards, P1 has 2 wins (until Jan 1 drops off).

    // Basically P1 should be MVP for every day from Jan 1 to Feb 5 because P2 has negative scores.
    // total days = 31 (Jan) + 5 (Feb) = 36 days.

    expect(result.monthlyMvpDays['Player One']).toBeGreaterThan(30);
    expect(result.monthlyMvpDays['Player Two']).toBeUndefined();
  });

  it('should correctly calculate evening MVP counts (per day)', () => {
    // Evening MVP requires min games (default 3)
    const date = '2024-06-01';
    const matches: Match[] = [];
    const historyP1: EloHistoryEntry[] = [];
    const historyP2: EloHistoryEntry[] = [];

    // Create 3 matches on the same day, P1 wins all against P2
    for (let i = 1; i <= 3; i++) {
      const time = `${date}T1${i}:00:00Z`;
      const id = `m${i}`;
      matches.push(createMatch(id, time, ['p1'], ['p2'], 2, 0));

      historyP1.push({ matchId: id, date: time, timestamp: new Date(time).getTime(), delta: 10, result: 'W', elo: 1200 + i*10 });
      historyP2.push({ matchId: id, date: time, timestamp: new Date(time).getTime(), delta: -10, result: 'L', elo: 1200 - i*10 });
    }

    const p1 = createPlayer('p1', 'Winner', 1230, historyP1);
    const p2 = createPlayer('p2', 'Loser', 1170, historyP2);

    const result = buildMvpSummary(matches, [], [p1, p2]);

    // P1 played 3 games, won 3. Meets criteria. Should be evening MVP for that day.
    expect(result.eveningMvpCounts['Winner']).toBe(1);
  });

  it('should not award evening MVP if min games not met', () => {
    const date = '2024-06-01';
    const matches: Match[] = [];
    const historyP1: EloHistoryEntry[] = [];
    const historyP2: EloHistoryEntry[] = [];

    // Create 2 matches (min is 3)
    for (let i = 1; i <= 2; i++) {
      const time = `${date}T1${i}:00:00Z`;
      const id = `m${i}`;
      matches.push(createMatch(id, time, ['p1'], ['p2'], 2, 0));

      historyP1.push({ matchId: id, date: time, timestamp: new Date(time).getTime(), delta: 10, result: 'W', elo: 1200 + i*10 });
      historyP2.push({ matchId: id, date: time, timestamp: new Date(time).getTime(), delta: -10, result: 'L', elo: 1200 - i*10 });
    }

    const p1 = createPlayer('p1', 'Winner', 1220, historyP1);
    const p2 = createPlayer('p2', 'Loser', 1180, historyP2);

    const result = buildMvpSummary(matches, [], [p1, p2]);

    expect(result.eveningMvpCounts['Winner']).toBeUndefined();
  });

  it('should respect tie-breaking rules', () => {
    // Tie-breaker: Score > EloGain > EloNet > Wins > Name
    // Let's create a scenario where score is equal.
    // P1: 1 win, 1 game, +10 ELO. WinRate = 1. Score = 10 + 15 + 0.5 = 25.5
    // P2: 1 win, 1 game, +10 ELO. WinRate = 1. Score = 25.5
    // Tie.
    // Next: EloGain (both +10). Tie.
    // Next: EloNet.
    // Set P1 Elo = 1300, P2 Elo = 1200. P1 should win.

    const date = '2024-07-01T10:00:00Z';

    // Match 1: P1 vs P3 (P1 wins, +10)
    const m1 = createMatch('m1', date, ['p1'], ['p3'], 2, 0);
    // Match 2: P2 vs P4 (P2 wins, +10)
    const m2 = createMatch('m2', date, ['p2'], ['p4'], 2, 0);

    const p1Hist: EloHistoryEntry = { matchId: 'm1', date, timestamp: new Date(date).getTime(), delta: 10, result: 'W', elo: 1300 };
    const p2Hist: EloHistoryEntry = { matchId: 'm2', date, timestamp: new Date(date).getTime(), delta: 10, result: 'W', elo: 1200 };

    const p1 = createPlayer('p1', 'Alice', 1300, [p1Hist]);
    const p2 = createPlayer('p2', 'Bob', 1200, [p2Hist]);
    // Dummy opponents
    const p3 = createPlayer('p3', 'Charlie', 1190, []);
    const p4 = createPlayer('p4', 'Dave', 1190, []);

    vi.setSystemTime(new Date(date));

    const result = buildMvpSummary([m1, m2], [], [p1, p2, p3, p4]);

    // P1 has higher EloNet, so P1 (Alice) should win.
    expect(result.monthlyMvpDays['Alice']).toBe(1);
    expect(result.monthlyMvpDays['Bob']).toBeUndefined();
  });

    it('should use provided eloDeltaByMatch for optimization', () => {
    const date = '2024-08-01T10:00:00Z';
    const m1 = createMatch('m1', date, ['p1'], ['p2'], 2, 0);

    // Even if history is empty, if eloDeltaByMatch is provided, evening stats might use it?
    // Wait, buildMvpSummary uses eloDeltaByMatch for evening stats (scorePlayersForMvp),
    // but for monthly stats it constructs `matchDeltaMap` from `allEloPlayers.history`.
    // So to test eloDeltaByMatch usage, we should check evening stats.

    const p1 = createPlayer('p1', 'Alice', 1200, []);
    const p2 = createPlayer('p2', 'Bob', 1200, []);

    // Manually provide deltas
    const deltas = {
      'm1': {
        'p1': 50, // Huge gain
        'p2': -50
      }
    };

    // We need 3 games for evening MVP.
    // Let's make 3 matches.
    const m2 = createMatch('m2', date, ['p1'], ['p2'], 2, 0);
    const m3 = createMatch('m3', date, ['p1'], ['p2'], 2, 0);

    deltas['m2'] = { 'p1': 50, 'p2': -50 };
    deltas['m3'] = { 'p1': 50, 'p2': -50 };

    const matches = [m1, m2, m3];

    const result = buildMvpSummary(matches, [], [p1, p2], deltas);

    // Alice should win evening MVP because of the injected deltas, even though her history is empty.
    expect(result.eveningMvpCounts['Alice']).toBe(1);
  });
});

describe('buildComparisonChartData', () => {
  it('should return empty array if no players selected', () => {
    const players = [createPlayer('p1', 'Alice', 1200)];
    const profiles = [createProfile('p1', 'Alice')];
    const result = buildComparisonChartData(players, profiles, []);
    expect(result).toEqual([]);
  });

  it('should return chart data for single player with history', () => {
    const date = '2024-01-01';
    const timestamp = new Date(date).getTime();
    const history: EloHistoryEntry = {
      matchId: 'm1',
      date,
      timestamp,
      delta: 10,
      result: 'W',
      elo: 1210
    };
    const players = [createPlayer('p1', 'Alice', 1210, [history])];
    const profiles = [createProfile('p1', 'Alice')];

    const result = buildComparisonChartData(players, profiles, ['p1']);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date,
      'Alice_elo': 1210,
      'Alice_winRate': 100 // 1 win / 1 game
    });
  });

  it('should return empty array if selected player has no history', () => {
    const players = [createPlayer('p1', 'Alice', 1200, [])];
    const profiles = [createProfile('p1', 'Alice')];

    const result = buildComparisonChartData(players, profiles, ['p1']);
    expect(result).toEqual([]);
  });

  it('should handle multiple matches on same day chronologically', () => {
    const date = '2024-01-01';
    const timestamp = new Date(date).getTime();

    // Match 1 (m1): P1 wins, ELO 1210
    // Match 2 (m2): P1 loses, ELO 1200

    // Note: buildComparisonChartData uses matchId localeCompare if timestamps are equal
    // so m1 comes before m2

    const h1: EloHistoryEntry = { matchId: 'm1', date, timestamp, delta: 10, result: 'W', elo: 1210 };
    const h2: EloHistoryEntry = { matchId: 'm2', date, timestamp, delta: -10, result: 'L', elo: 1200 };

    const players = [createPlayer('p1', 'Alice', 1200, [h1, h2])];
    const profiles = [createProfile('p1', 'Alice')];

    const result = buildComparisonChartData(players, profiles, ['p1']);

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe(date);
    expect(result[0]['Alice_elo']).toBe(1210);
    expect(result[0]['Alice_winRate']).toBe(100); // 1/1

    expect(result[1].date).toBe(date);
    expect(result[1]['Alice_elo']).toBe(1200);
    expect(result[1]['Alice_winRate']).toBe(50); // 1/2
  });

  it('should persist state for players not involved in a match', () => {
    // Scenario:
    // T1: P1 plays, P2 idle
    // T2: P2 plays, P1 idle

    const date1 = '2024-01-01';
    const date2 = '2024-01-02';

    const h1: EloHistoryEntry = { matchId: 'm1', date: date1, timestamp: new Date(date1).getTime(), delta: 10, result: 'W', elo: 1210 };
    const h2: EloHistoryEntry = { matchId: 'm2', date: date2, timestamp: new Date(date2).getTime(), delta: 10, result: 'W', elo: 1210 };

    // P1 starts at 1200, ends at 1210
    const p1 = createPlayer('p1', 'Alice', 1210, [h1]);
    // P2 starts at 1200, ends at 1210
    const p2 = createPlayer('p2', 'Bob', 1210, [h2]);

    const profiles = [createProfile('p1', 'Alice'), createProfile('p2', 'Bob')];

    const result = buildComparisonChartData([p1, p2], profiles, ['p1', 'p2']);

    expect(result).toHaveLength(2);

    // T1: Alice plays, Bob idle
    expect(result[0].date).toBe(date1);
    expect(result[0]['Alice_elo']).toBe(1210);
    expect(result[0]['Alice_winRate']).toBe(100);
    expect(result[0]['Bob_elo']).toBe(1200); // Bob start elo
    expect(result[0]['Bob_winRate']).toBe(0); // 0 games

    // T2: Bob plays, Alice idle
    expect(result[1].date).toBe(date2);
    expect(result[1]['Alice_elo']).toBe(1210); // Carried over
    expect(result[1]['Alice_winRate']).toBe(100);
    expect(result[1]['Bob_elo']).toBe(1210); // Updated
    expect(result[1]['Bob_winRate']).toBe(100);
  });

  it('should fallback name to "Okänd" if profile not found', () => {
    const date = '2024-01-01';
    const h1: EloHistoryEntry = { matchId: 'm1', date, timestamp: new Date(date).getTime(), delta: 10, result: 'W', elo: 1210 };
    const p1 = createPlayer('p1', 'Alice', 1210, [h1]);

    // Profile map missing p1
    const result = buildComparisonChartData([p1], [], ['p1']);

    expect(result).toHaveLength(1);
    expect(result[0]['Okänd_elo']).toBe(1210);
  });
});
