import { describe, it, expect } from 'vitest';
import { filterMatches } from './filters';
import { Match, MatchFilter } from '../types';

const createMatch = (overrides: Partial<Match>): Match => ({
  id: 'test-id',
  team1: ['p1'],
  team2: ['p2'],
  team1_ids: ['p1'],
  team2_ids: ['p2'],
  team1_sets: 0,
  team2_sets: 0,
  created_at: new Date().toISOString(),
  score_type: 'sets',
  ...overrides,
});

describe('filterMatches', () => {
  it('should return empty array if no matches provided', () => {
    // @ts-expect-error Testing null input
    expect(filterMatches(null, { type: 'all' })).toEqual([]);
    expect(filterMatches([], { type: 'all' })).toEqual([]);
  });

  it('should return all matches if filter type is all', () => {
    const matches = [createMatch({ id: '1' }), createMatch({ id: '2' })];
    expect(filterMatches(matches, { type: 'all' })).toEqual(matches);
  });

  it('should filter matches by last 7 days', () => {
    const now = new Date();
    const matchToday = createMatch({ id: '1', created_at: now.toISOString() });

    const eightDaysAgo = new Date(now);
    eightDaysAgo.setDate(now.getDate() - 8);
    const matchOld = createMatch({ id: '2', created_at: eightDaysAgo.toISOString() });

    const result = filterMatches([matchToday, matchOld], { type: 'last7' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter matches by last 30 days', () => {
    const now = new Date();
    const matchToday = createMatch({ id: '1', created_at: now.toISOString() });

    const thirtyOneDaysAgo = new Date(now);
    thirtyOneDaysAgo.setDate(now.getDate() - 31);
    const matchOld = createMatch({ id: '2', created_at: thirtyOneDaysAgo.toISOString() });

    const result = filterMatches([matchToday, matchOld], { type: 'last30' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  describe('range filter', () => {
    it('should return empty array if no start date provided', () => {
        const matches = [createMatch({})];
        expect(filterMatches(matches, { type: 'range' })).toEqual([]);
    });

    it('should filter matches within custom range', () => {
        const start = new Date('2023-01-01');
        const end = new Date('2023-01-31');

        const matchIn = createMatch({ id: '1', created_at: '2023-01-15T12:00:00Z' });
        const matchBefore = createMatch({ id: '2', created_at: '2022-12-31T23:59:59Z' });
        const matchAfter = createMatch({ id: '3', created_at: '2023-02-01T00:00:00Z' });

        const result = filterMatches([matchIn, matchBefore, matchAfter], {
            type: 'range',
            startDate: '2023-01-01',
            endDate: '2023-01-31'
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });

    it('should handle range with start date only (implies end is now)', () => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 5);

        const matchRecent = createMatch({ id: '1', created_at: now.toISOString() });
        const matchOld = createMatch({ id: '2', created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() }); // 10 days ago

        const result = filterMatches([matchRecent, matchOld], {
            type: 'range',
            startDate: start.toISOString()
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });
  });

  describe('game type filters', () => {
    it('should filter short matches (sets <= 3)', () => {
        const matchShort = createMatch({ id: '1', score_type: 'sets', team1_sets: 2, team2_sets: 1 }); // max 2
        const matchLong = createMatch({ id: '2', score_type: 'sets', team1_sets: 6, team2_sets: 4 }); // max 6
        const matchPoints = createMatch({ id: '3', score_type: 'points', team1_sets: 0, team2_sets: 0 });

        const result = filterMatches([matchShort, matchLong, matchPoints], { type: 'short' });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });

    it('should filter long matches (sets >= 6)', () => {
        const matchShort = createMatch({ id: '1', score_type: 'sets', team1_sets: 3, team2_sets: 2 });
        const matchLong = createMatch({ id: '2', score_type: 'sets', team1_sets: 6, team2_sets: 7 });
        const matchPoints = createMatch({ id: '3', score_type: 'points', team1_sets: 0, team2_sets: 0 });

        const result = filterMatches([matchShort, matchLong, matchPoints], { type: 'long' });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
    });

    it('should filter tournament matches', () => {
        const matchTournament = createMatch({ id: '1', source_tournament_id: 'some-id' });
        const matchRegular = createMatch({ id: '2', source_tournament_id: null });

        const result = filterMatches([matchTournament, matchRegular], { type: 'tournaments' });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });
  });
});
