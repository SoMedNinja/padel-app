import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createOptimisticMatch } from './optimisticUpdates';
import { MatchCreateData, MatchCreateInput } from '../services/matchService';

describe('createOptimisticMatch', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-05-20T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should create a match object from a single MatchCreateData object', () => {
        const input: MatchCreateData = {
            team1: 'Team A',
            team2: 'Team B',
            team1_sets: 6,
            team2_sets: 4,
        };

        const result = createOptimisticMatch(input);

        expect(result).toMatchObject({
            team1: ['Team A'],
            team2: ['Team B'],
            team1_sets: 6,
            team2_sets: 4,
            created_at: '2024-05-20T12:00:00.000Z',
            created_by: 'current-user-placeholder',
            team1_ids: [],
            team2_ids: [],
            score_type: 'sets',
            team1_serves_first: true,
        });
        expect(result.id).toMatch(/^temp-/);
    });

    it('should create a match object from an array of MatchCreateData objects', () => {
        const input: MatchCreateInput = [{
            team1: 'Team A',
            team2: 'Team B',
            team1_sets: 6,
            team2_sets: 4,
        }];

        const result = createOptimisticMatch(input);

        expect(result).toMatchObject({
            team1: ['Team A'],
            team1_sets: 6,
        });
    });

    it('should handle array inputs for team names', () => {
        const input: MatchCreateData = {
            team1: ['P1', 'P2'],
            team2: ['P3', 'P4'],
            team1_sets: 6,
            team2_sets: 4,
        };

        const result = createOptimisticMatch(input);

        expect(result.team1).toEqual(['P1', 'P2']);
        expect(result.team2).toEqual(['P3', 'P4']);
    });

    it('should use provided optional values', () => {
        const input: MatchCreateData = {
            team1: 'Team A',
            team2: 'Team B',
            team1_sets: 6,
            team2_sets: 4,
            team1_ids: ['id1'],
            team2_ids: ['id2'],
            score_type: 'points',
            score_target: 21,
            team1_serves_first: false,
            source_tournament_id: 'tourney-1',
            source_tournament_type: 'mexicana',
        };

        const result = createOptimisticMatch(input);

        expect(result).toMatchObject({
            team1_ids: ['id1'],
            team2_ids: ['id2'],
            score_type: 'points',
            score_target: 21,
            team1_serves_first: false,
            source_tournament_id: 'tourney-1',
            source_tournament_type: 'mexicana',
        });
    });
});
