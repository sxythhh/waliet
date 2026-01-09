import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useReferralTracking } from './useReferralTracking';
import { supabase } from '@/integrations/supabase/client';

beforeEach(() => {
  vi.clearAllMocks();
  // Reset localStorage mock
  vi.mocked(window.localStorage.getItem).mockReturnValue(null);
  vi.mocked(window.localStorage.setItem).mockImplementation(() => {});
  vi.mocked(window.localStorage.removeItem).mockImplementation(() => {});
  vi.mocked(window.sessionStorage.getItem).mockReturnValue(null);
  vi.mocked(window.sessionStorage.setItem).mockImplementation(() => {});
  // Reset location.search
  Object.defineProperty(window, 'location', {
    value: { search: '', origin: 'http://localhost:3000', href: 'http://localhost:3000' },
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useReferralTracking', () => {
  describe('FIX: Referral Code Validation', () => {
    it('should reject invalid referral code formats', async () => {
      // SQL injection attempt
      Object.defineProperty(window, 'location', {
        value: { search: "?ref='; DROP TABLE--", origin: 'http://localhost:3000' },
        writable: true,
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderHook(() => useReferralTracking());

      await new Promise(r => setTimeout(r, 100));

      // FIX VERIFIED: Invalid codes are rejected and not stored
      expect(window.localStorage.setItem).not.toHaveBeenCalledWith('referral_code', expect.anything());
      expect(consoleSpy).toHaveBeenCalledWith('Invalid referral code format:', expect.anything());

      consoleSpy.mockRestore();
    });

    it('should accept valid alphanumeric referral codes', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?ref=ABC123', origin: 'http://localhost:3000' },
        writable: true,
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: {}, error: null });

      renderHook(() => useReferralTracking());

      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith('referral_code', 'ABC123');
      }, { timeout: 2000 });
    });
  });

  describe('FIX: Click Tracking Debounce', () => {
    it('should only track clicks once per session', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?ref=ABC123', origin: 'http://localhost:3000' },
        writable: true,
      });

      const invokeMock = vi.fn().mockResolvedValue({ data: {}, error: null });
      vi.mocked(supabase.functions.invoke).mockImplementation(invokeMock);

      // First mount - should track
      const { unmount: unmount1 } = renderHook(() => useReferralTracking());
      await waitFor(() => {
        expect(invokeMock).toHaveBeenCalledTimes(1);
      });

      // Mark as already tracked
      vi.mocked(window.sessionStorage.getItem).mockReturnValue('true');
      unmount1();

      // Second mount - should NOT track (already in sessionStorage)
      renderHook(() => useReferralTracking());
      await new Promise(r => setTimeout(r, 100));

      // FIX VERIFIED: Only called once due to sessionStorage debounce
      expect(invokeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('FIX: Exact Match for Referrer Lookup', () => {
    it('should use exact match (eq) instead of case-insensitive (ilike)', async () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue('ABC123');

      const eqMock = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'referrer-123', referral_code: 'ABC123' },
          error: null,
        }),
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { select: selectMock } as any;
        }
        if (table === 'referrals') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as any;
        }
        return {} as any;
      });

      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useReferralTracking());

      await act(async () => {
        await result.current.trackReferral('new-user-123');
      });

      // FIX VERIFIED: Uses eq() for exact match
      expect(eqMock).toHaveBeenCalledWith('referral_code', 'ABC123');
    });
  });

  describe('FIX: Atomic Referral Count Increment', () => {
    it('should use RPC for atomic increment', async () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue('ABC123');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'referrer-123', referral_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'referrals') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as any;
        }
        return {} as any;
      });

      const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase.rpc).mockImplementation(rpcMock);

      const { result } = renderHook(() => useReferralTracking());

      await act(async () => {
        await result.current.trackReferral('new-user-123');
      });

      // FIX VERIFIED: Uses RPC for atomic increment
      expect(rpcMock).toHaveBeenCalledWith('increment_referral_count', {
        referrer_user_id: 'referrer-123'
      });
    });
  });

  describe('Self-Referral Prevention', () => {
    it('should prevent self-referral', async () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue('MYCODE12');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'user-123', referral_code: 'MYCODE12' }, // Same as newUserId
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useReferralTracking());

      await act(async () => {
        const response = await result.current.trackReferral('user-123');
        expect(response.success).toBe(false);
        expect(response.error).toBe('You cannot use your own referral code');
      });

      expect(window.localStorage.removeItem).toHaveBeenCalledWith('referral_code');
    });
  });

  describe('Duplicate Referral Handling', () => {
    it('should handle 23505 error code correctly', async () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue('ABC12345');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'referrer-123', referral_code: 'ABC12345' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'referrals') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Duplicate key' },
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useReferralTracking());

      await act(async () => {
        const response = await result.current.trackReferral('new-user-123');
        expect(response.success).toBe(false);
        expect(response.error).toBe('You have already been referred');
      });

      expect(window.localStorage.removeItem).toHaveBeenCalledWith('referral_code');
    });
  });

  describe('Edge Case: Empty Referral Code', () => {
    it('should not track empty referral code', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?ref=', origin: 'http://localhost:3000' },
        writable: true,
      });

      const invokeMock = vi.fn();
      vi.mocked(supabase.functions.invoke).mockImplementation(invokeMock);

      renderHook(() => useReferralTracking());

      await new Promise(r => setTimeout(r, 100));

      // Empty ref param should not trigger tracking or storage
      expect(invokeMock).not.toHaveBeenCalled();
      expect(window.localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Edge Case: No Stored Referral Code', () => {
    it('should return early when no referral code in localStorage', async () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue(null);

      const fromMock = vi.fn();
      vi.mocked(supabase.from).mockImplementation(fromMock);

      const { result } = renderHook(() => useReferralTracking());

      await act(async () => {
        const response = await result.current.trackReferral('new-user-123');
        expect(response.success).toBe(false);
      });

      // Should not make any database calls
      expect(fromMock).not.toHaveBeenCalled();
    });
  });

  describe('Edge Case: Invalid Referrer', () => {
    it('should handle non-existent referral code', async () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue('INVALID1');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null, // No referrer found
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useReferralTracking());

      await act(async () => {
        const response = await result.current.trackReferral('new-user-123');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Invalid referral code');
      });

      expect(window.localStorage.removeItem).toHaveBeenCalledWith('referral_code');
    });
  });
});
