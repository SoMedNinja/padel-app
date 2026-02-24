import { vi, describe, it, expect, beforeEach } from 'vitest';
import { profileService } from './profileService';

const mocks = vi.hoisted(() => {
  return {
    select: vi.fn(),
    from: vi.fn(),
    getSession: vi.fn(),
  };
});

vi.mock('../supabaseClient', () => {
  return {
    supabase: {
      from: mocks.from,
      auth: {
        getSession: mocks.getSession,
      },
    },
  };
});

describe('profileService', () => {
  describe('getProfiles', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.getSession.mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
      });
      // Allow chaining
      mocks.from.mockReturnValue({
        select: mocks.select,
      });
      mocks.select.mockResolvedValue({ data: [], error: null });
    });

    it('should select specific columns instead of *', async () => {
      await profileService.getProfiles();

      expect(mocks.from).toHaveBeenCalledWith('profiles');
      // The expected optimization:
      expect(mocks.select).toHaveBeenCalledWith(
        'id, name, avatar_url, is_admin, is_approved, is_deleted, is_regular, featured_badge_id, created_at'
      );
    });
  });
});
