import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tournamentService } from './tournamentService';
import { supabase } from '../supabaseClient';
import { GUEST_ID } from '../utils/guest';

// Mock supabase client
vi.mock('../supabaseClient', () => {
  const mockSingle = vi.fn();
  const mockOrder = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockSelect = vi.fn().mockReturnThis();
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    order: mockOrder,
    eq: mockEq,
    single: mockSingle,
    then: (resolve: any) => resolve({ data: [], error: null }),
  });

  return {
    supabase: {
      from: mockFrom,
    },
  };
});

// Mock requireAdmin and ensureAuthSessionReady
vi.mock('./authUtils', () => ({
  ensureAuthSessionReady: vi.fn(),
  requireAdmin: vi.fn(),
}));

describe('tournamentService Performance Benchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const MOCK_PARTICIPANTS_COUNT = 100;
  const MOCK_ROUNDS_COUNT = 1000;

  const mockParticipants = Array.from({ length: MOCK_PARTICIPANTS_COUNT }).map((_, i) => ({
    profile_id: `user-${i}`,
  }));

  const mockRounds = Array.from({ length: MOCK_ROUNDS_COUNT }).map((_, i) => ({
    id: `round-${i}`,
    round_number: i + 1,
    team1_ids: [`user-${i % MOCK_PARTICIPANTS_COUNT}`, `user-${(i + 1) % MOCK_PARTICIPANTS_COUNT}`],
    team2_ids: [`user-${(i + 2) % MOCK_PARTICIPANTS_COUNT}`, `user-${(i + 3) % MOCK_PARTICIPANTS_COUNT}`],
    resting_ids: [],
    team1_score: 10,
    team2_score: 8,
  }));

  it('Benchmark: getTournamentDetails with large dataset', async () => {
    // Setup mock return values
    const mockFrom = supabase.from as any;

    // We need to intercept the calls based on table name
    mockFrom.mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      if (table === 'mexicana_participants') {
        builder.then = (resolve: any) => resolve({ data: mockParticipants, error: null });
      } else if (table === 'mexicana_rounds') {
        builder.then = (resolve: any) => resolve({ data: mockRounds, error: null });
      } else {
        builder.then = (resolve: any) => resolve({ data: [], error: null });
      }
      return builder;
    });

    const start = performance.now();
    const details = await tournamentService.getTournamentDetails('bench-tournament-id');
    const end = performance.now();

    expect(details.participants).toHaveLength(MOCK_PARTICIPANTS_COUNT);
    expect(details.rounds).toHaveLength(MOCK_ROUNDS_COUNT);

    console.log(`\nBenchmark Result - getTournamentDetails: ${(end - start).toFixed(4)}ms`);
    console.log(`Processed ${details.participants.length} participants and ${details.rounds.length} rounds.`);
  });

  it('Benchmark: getTournamentParticipants with large dataset', async () => {
    // Setup mock return values
    const mockFrom = supabase.from as any;

    // We need to intercept the calls based on table name
    mockFrom.mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      if (table === 'mexicana_participants') {
        builder.then = (resolve: any) => resolve({ data: mockParticipants, error: null });
      } else {
        builder.then = (resolve: any) => resolve({ data: [], error: null });
      }
      return builder;
    });

    const start = performance.now();
    const participants = await tournamentService.getTournamentParticipants('bench-tournament-id');
    const end = performance.now();

    expect(participants).toHaveLength(MOCK_PARTICIPANTS_COUNT);

    console.log(`\nBenchmark Result - getTournamentParticipants: ${(end - start).toFixed(4)}ms`);
    console.log(`Processed ${participants.length} participants.`);
  });
});
