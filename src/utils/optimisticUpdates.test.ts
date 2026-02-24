import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createOptimisticMatch, performOptimisticMatchUpdate } from './optimisticUpdates';
import { MatchCreateData, MatchCreateInput } from '../services/matchService';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { Match } from '../types';

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

describe('performOptimisticMatchUpdate', () => {
    it('should update all relevant queries including variations and infinite queries', () => {
        const queryClient = new QueryClient();

        // Key used by useEloStats
        const complexKey = queryKeys.matches({ type: 'all', limit: 5000 });
        // Key targeted by default logic
        const targetKey = queryKeys.matches({ type: 'all' });
        // Infinite query key
        const infiniteKey = queryKeys.matchesInfinite({ type: 'all' });

        // Filtered keys
        const shortKey = queryKeys.matches({ type: 'short' });
        const tournamentKey = queryKeys.matches({ type: 'tournaments' });

        // Seed data
        const initialData: Match[] = [];
        queryClient.setQueryData(complexKey, initialData);
        queryClient.setQueryData(targetKey, initialData);
        queryClient.setQueryData(shortKey, initialData);
        queryClient.setQueryData(tournamentKey, initialData);

        // Infinite data structure
        const initialInfiniteData = {
            pages: [[]],
            pageParams: [null],
        };
        queryClient.setQueryData(infiniteKey, initialInfiniteData);

        // Simulate input: Long match (6-4), not tournament
        const input: MatchCreateInput = {
            team1: ['Player A'],
            team2: ['Player B'],
            team1_sets: 6,
            team2_sets: 4,
            source_tournament_id: null,
        };

        // Run the fix (using the actual imported function)
        performOptimisticMatchUpdate(queryClient, input);

        // Verify updates

        // Should update:
        expect(queryClient.getQueryData<Match[]>(targetKey)).toHaveLength(1);
        expect(queryClient.getQueryData<Match[]>(complexKey)).toHaveLength(1);

        const infiniteData = queryClient.getQueryData<any>(infiniteKey);
        expect(infiniteData.pages[0]).toHaveLength(1);

        // Should NOT update (because filter mismatch):
        expect(queryClient.getQueryData<Match[]>(shortKey)).toHaveLength(0); // 6-4 is not short
        expect(queryClient.getQueryData<Match[]>(tournamentKey)).toHaveLength(0); // not tournament
    });
});
