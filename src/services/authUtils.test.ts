import { vi, describe, it, expect, beforeEach } from 'vitest';
import { checkIsAdmin } from './authUtils';

// Hoist mocks so they can be used in vi.mock
const mocks = vi.hoisted(() => {
  return {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  }
});

vi.mock('../supabaseClient', () => {
    return {
        supabase: {
            from: mocks.from,
        },
    };
});

describe('authUtils', () => {
  describe('checkIsAdmin', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default chainable mocks
        mocks.from.mockReturnValue({ select: mocks.select });
        mocks.select.mockReturnValue({ eq: mocks.eq });
        mocks.eq.mockReturnValue({ single: mocks.single });
    });

    it('should return false if userId is undefined', async () => {
        const result = await checkIsAdmin(undefined);
        expect(result).toBe(false);
        expect(mocks.from).not.toHaveBeenCalled();
    });

    it('should return true if user is admin', async () => {
        mocks.single.mockResolvedValue({ data: { is_admin: true }, error: null });

        const userId = 'user-123';
        const result = await checkIsAdmin(userId);

        expect(result).toBe(true);
        expect(mocks.from).toHaveBeenCalledWith('profiles');
        expect(mocks.select).toHaveBeenCalledWith('is_admin');
        expect(mocks.eq).toHaveBeenCalledWith('id', userId);
        expect(mocks.single).toHaveBeenCalled();
    });

    it('should return false if user is not admin', async () => {
        mocks.single.mockResolvedValue({ data: { is_admin: false }, error: null });

        const userId = 'user-123';
        const result = await checkIsAdmin(userId);

        expect(result).toBe(false);
    });

    it('should return false if data is null (e.g. user not found)', async () => {
        mocks.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

        const userId = 'user-123';
        const result = await checkIsAdmin(userId);

        expect(result).toBe(false);
    });

    it('should return false if database error occurs', async () => {
        // Even if there is an error, the function just checks `data?.is_admin === true`
        // so it should return false.
        mocks.single.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

        const userId = 'user-123';
        const result = await checkIsAdmin(userId);

        expect(result).toBe(false);
    });
  });
});
