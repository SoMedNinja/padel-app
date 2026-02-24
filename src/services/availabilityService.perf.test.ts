
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { availabilityService } from './availabilityService';
import { supabase } from '../supabaseClient';

// Mock supabase client
vi.mock('../supabaseClient', () => {
  const mockOrder = vi.fn().mockReturnThis();
  const mockGte = vi.fn().mockReturnThis();
  const mockSelect = vi.fn().mockReturnThis();
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    order: mockOrder,
    gte: mockGte,
    // Add then to make it thenable
    then: (resolve: any) => resolve({ data: [], error: null }),
  });

  return {
    supabase: {
      from: mockFrom,
    },
    // Mock key functions if needed
    assertEdgeFunctionAnonKey: vi.fn(),
    buildEdgeFunctionAuthHeaders: vi.fn(),
  };
});

describe('availabilityService performance baseline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPolls should have a gte filter on end_date', async () => {
    await availabilityService.getPolls();

    expect(supabase.from).toHaveBeenCalledWith('availability_polls');

    const mockFrom = supabase.from as any;
    const mockGte = mockFrom().gte;

    expect(mockGte).toHaveBeenCalledWith('end_date', expect.any(String));
  });

  it('getScheduledGames should have a gte filter on date', async () => {
    await availabilityService.getScheduledGames();

    expect(supabase.from).toHaveBeenCalledWith('availability_scheduled_games');

    const mockFrom = supabase.from as any;
    const mockGte = mockFrom().gte;

    expect(mockGte).toHaveBeenCalledWith('date', expect.any(String));
  });
});
