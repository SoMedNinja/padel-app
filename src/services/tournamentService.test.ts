import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tournamentService } from './tournamentService';
import { supabase } from '../supabaseClient';
import { TournamentCreate } from '../types';

// Mock supabase client
vi.mock('../supabaseClient', () => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));

  return {
    supabase: {
      from: mockFrom,
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'admin-user' } } }, error: null }),
      },
    },
  };
});

// Mock requireAdmin
vi.mock('./authUtils', () => ({
  ensureAuthSessionReady: vi.fn(),
  requireAdmin: vi.fn(),
}));

describe('tournamentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTournament', () => {
    it('should create a tournament successfully', async () => {
      const mockData = { id: '123', name: 'Test Tournament' };
      // Access the mock functions via the mocked module or by redefining them here if accessible
      // Since vi.mock factory is hoisted, we can't easily access the inner mocks unless we extract them or use calls

      // Let's redefine the implementation for this test
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn(() => ({ single: mockSingle }));
      const mockInsert = vi.fn(() => ({ select: mockSelect }));
      (supabase.from as any).mockReturnValue({ insert: mockInsert });

      const input: TournamentCreate = {
        name: 'Test Tournament',
        location: 'Stockholm',
        created_by: 'user-123',
      };

      const result = await tournamentService.createTournament(input);

      expect(supabase.from).toHaveBeenCalledWith('mexicana_tournaments');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Tournament',
        location: 'Stockholm',
      }));
      expect(result).toEqual(mockData);
    });

    it('should trim name and location', async () => {
      const mockData = { id: '123', name: 'Test Tournament' };
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn(() => ({ single: mockSingle }));
      const mockInsert = vi.fn(() => ({ select: mockSelect }));
      (supabase.from as any).mockReturnValue({ insert: mockInsert });

      const input: TournamentCreate = {
        name: '  Test Tournament  ',
        location: '  Stockholm  ',
      };

      await tournamentService.createTournament(input);

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Tournament',
        location: 'Stockholm',
      }));
    });

    it('should remove id and created_at if present in input', async () => {
      const mockData = { id: '123', name: 'Test Tournament' };
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn(() => ({ single: mockSingle }));
      const mockInsert = vi.fn(() => ({ select: mockSelect }));
      (supabase.from as any).mockReturnValue({ insert: mockInsert });

      const input: TournamentCreate = {
        name: 'Test Tournament',
        id: 'bad-id',
        created_at: 'bad-date',
      };

      await tournamentService.createTournament(input);

      expect(mockInsert).toHaveBeenCalledWith(expect.not.objectContaining({
        id: 'bad-id',
        created_at: 'bad-date',
      }));
    });

    it('should throw error if name is missing', async () => {
      const input = { name: '' } as any;
      await expect(tournamentService.createTournament(input)).rejects.toThrow("Turneringsnamn får inte vara tomt");
    });
  });

  describe('deleteTournament', () => {
    it('should delete tournament and all child rows', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn(() => ({ eq: mockEq }));
      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await tournamentService.deleteTournament('tourney-123');

      expect(supabase.from).toHaveBeenCalledWith('mexicana_participants');
      expect(supabase.from).toHaveBeenCalledWith('mexicana_rounds');
      expect(supabase.from).toHaveBeenCalledWith('mexicana_results');
      expect(supabase.from).toHaveBeenCalledWith('mexicana_tournaments');

      expect(mockEq).toHaveBeenCalledWith('tournament_id', 'tourney-123');
      expect(mockEq).toHaveBeenCalledWith('id', 'tourney-123');
      expect(mockDelete).toHaveBeenCalledTimes(4);
    });

    it('should throw error if any deletion fails', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: new Error('Delete failed') });
      const mockDelete = vi.fn(() => ({ eq: mockEq }));
      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await expect(tournamentService.deleteTournament('tourney-123')).rejects.toThrow('Delete failed');
    });
  });
});
