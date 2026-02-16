import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    getSession: vi.fn(),
    insert: vi.fn(),
    from: vi.fn(),
  }
});

vi.mock('../supabaseClient', () => {
    // Configure the 'from' mock to return a chainable object
    mocks.from.mockReturnValue({
        insert: mocks.insert,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
    });

    return {
        supabase: {
            auth: {
                getSession: mocks.getSession,
            },
            from: mocks.from,
        },
    };
});

import { matchService } from './matchService';

describe('matchService', () => {
  describe('createMatch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default successful session
        mocks.getSession.mockResolvedValue({
            data: { session: { user: { id: 'test-user-id' } } },
            error: null
        });

        // Setup default insert mock
        mocks.insert.mockResolvedValue({ error: null });

        // Ensure 'from' returns the builder with 'insert'
        mocks.from.mockReturnValue({
             insert: mocks.insert,
             select: vi.fn().mockReturnThis(),
             eq: vi.fn().mockReturnThis(),
             in: vi.fn().mockReturnThis(),
             single: vi.fn().mockReturnThis(),
             update: vi.fn().mockReturnThis(),
             delete: vi.fn().mockReturnThis(),
         });
    });

    it('should throw error for invalid team1 sets (negative)', async () => {
      const match = { team1_sets: -1, team2_sets: 6, team1: ['Player A'], team2: ['Player B'] };
      await expect(matchService.createMatch(match)).rejects.toThrow('Ogiltigt resultat för Lag 1');
    });

    it('should throw error for invalid team1 sets (string)', async () => {
        const match = { team1_sets: "invalid", team2_sets: 6, team1: ['Player A'], team2: ['Player B'] };
        await expect(matchService.createMatch(match)).rejects.toThrow('Ogiltigt resultat för Lag 1');
      });

    it('should throw error for invalid team2 sets (negative)', async () => {
        const match = { team1_sets: 6, team2_sets: -1, team1: ['Player A'], team2: ['Player B'] };
        await expect(matchService.createMatch(match)).rejects.toThrow('Ogiltigt resultat för Lag 2');
    });

    it('should throw error for invalid team2 sets (string)', async () => {
      const match = { team1_sets: 6, team2_sets: 'invalid', team1: ['Player A'], team2: ['Player B'] };
      await expect(matchService.createMatch(match)).rejects.toThrow('Ogiltigt resultat för Lag 2');
    });

    it('should throw error for long team1 name', async () => {
      const longName = 'a'.repeat(51);
      const match = { team1_sets: 6, team2_sets: 4, team1: [longName], team2: ['Player B'] };
      await expect(matchService.createMatch(match)).rejects.toThrow('Namn i Lag 1 är för långt (max 50 tecken)');
    });

    it('should throw error for long team2 name', async () => {
        const longName = 'a'.repeat(51);
        const match = { team1_sets: 6, team2_sets: 4, team1: ['Player A'], team2: [longName] };
        await expect(matchService.createMatch(match)).rejects.toThrow('Namn i Lag 2 är för långt (max 50 tecken)');
    });

     it('should throw error for long tournament id', async () => {
        const longId = 'a'.repeat(51);
        const match = { team1_sets: 6, team2_sets: 4, team1: ['Player A'], team2: ['Player B'], source_tournament_id: longId };
        await expect(matchService.createMatch(match)).rejects.toThrow('Ogiltigt turnerings-ID');
    });
  });
});
