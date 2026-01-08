import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PLAN_LIMITS,
  UNLIMITED,
  isUnlimited,
  getPlanLimits,
  getEffectivePlanLimits,
  canCreateCampaign,
  canCreateBoost,
  canHireCreator,
  canCreateWithLimit,
  getRemainingCount,
  formatLimit,
} from './subscriptionLimits';
import { supabase } from '@/integrations/supabase/client';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('subscriptionLimits', () => {
  describe('UNLIMITED constant', () => {
    it('should be -1 sentinel value', () => {
      expect(UNLIMITED).toBe(-1);
    });
  });

  describe('isUnlimited', () => {
    it('should return true for UNLIMITED (-1)', () => {
      expect(isUnlimited(UNLIMITED)).toBe(true);
      expect(isUnlimited(-1)).toBe(true);
    });

    it('should return false for regular limits', () => {
      expect(isUnlimited(0)).toBe(false);
      expect(isUnlimited(1)).toBe(false);
      expect(isUnlimited(100)).toBe(false);
    });
  });

  describe('PLAN_LIMITS constant', () => {
    it('should define sensible limits for all plans', () => {
      expect(PLAN_LIMITS.starter.campaigns).toBe(1);
      expect(PLAN_LIMITS.starter.boosts).toBe(1);
      expect(PLAN_LIMITS.starter.hires).toBe(10);

      expect(PLAN_LIMITS.growth.campaigns).toBe(5);
      expect(PLAN_LIMITS.growth.boosts).toBe(3);
      expect(PLAN_LIMITS.growth.hires).toBe(30);

      // FIX VERIFIED: Enterprise uses -1 sentinel instead of Infinity
      expect(PLAN_LIMITS.enterprise.campaigns).toBe(UNLIMITED);
      expect(PLAN_LIMITS.enterprise.boosts).toBe(UNLIMITED);
      expect(PLAN_LIMITS.enterprise.hires).toBe(UNLIMITED);
    });

    it('should serialize to JSON correctly - FIX VERIFIED', () => {
      // FIX: Using -1 instead of Infinity means JSON serialization works
      const serialized = JSON.stringify(PLAN_LIMITS.enterprise);
      const parsed = JSON.parse(serialized);

      // -1 serializes correctly (unlike Infinity which becomes null)
      expect(parsed.campaigns).toBe(-1);
      expect(parsed.boosts).toBe(-1);
      expect(parsed.hires).toBe(-1);
    });
  });

  describe('getPlanLimits', () => {
    it('should return correct limits for valid plans', () => {
      expect(getPlanLimits('starter')).toEqual({
        campaigns: 1,
        boosts: 1,
        hires: 10,
      });

      expect(getPlanLimits('growth')).toEqual({
        campaigns: 5,
        boosts: 3,
        hires: 30,
      });

      expect(getPlanLimits('enterprise')).toEqual({
        campaigns: UNLIMITED,
        boosts: UNLIMITED,
        hires: UNLIMITED,
      });
    });

    it('should return zero limits for null plan', () => {
      expect(getPlanLimits(null)).toEqual({
        campaigns: 0,
        boosts: 0,
        hires: 0,
      });
    });

    it('should return zero limits for undefined plan', () => {
      expect(getPlanLimits(undefined)).toEqual({
        campaigns: 0,
        boosts: 0,
        hires: 0,
      });
    });

    it('should handle case-insensitive plan names - FIX VERIFIED', () => {
      // FIX: Plan names are now normalized to lowercase
      expect(getPlanLimits('Starter')).toEqual({
        campaigns: 1,
        boosts: 1,
        hires: 10,
      });

      expect(getPlanLimits('GROWTH')).toEqual({
        campaigns: 5,
        boosts: 3,
        hires: 30,
      });

      expect(getPlanLimits('ENTERPRISE')).toEqual({
        campaigns: UNLIMITED,
        boosts: UNLIMITED,
        hires: UNLIMITED,
      });
    });

    it('should handle whitespace in plan names - FIX VERIFIED', () => {
      // FIX: Plan names are now trimmed
      expect(getPlanLimits(' starter')).toEqual({
        campaigns: 1,
        boosts: 1,
        hires: 10,
      });

      expect(getPlanLimits('starter ')).toEqual({
        campaigns: 1,
        boosts: 1,
        hires: 10,
      });

      expect(getPlanLimits(' starter ')).toEqual({
        campaigns: 1,
        boosts: 1,
        hires: 10,
      });
    });

    it('should return zero limits for unknown plan', () => {
      expect(getPlanLimits('pro')).toEqual({
        campaigns: 0,
        boosts: 0,
        hires: 0,
      });
    });
  });

  describe('getEffectivePlanLimits', () => {
    it('should return standard limits when no custom plan exists', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      } as any);

      const result = await getEffectivePlanLimits('brand-123', 'growth');

      expect(result).toEqual({
        campaigns: 5,
        boosts: 3,
        hires: 30,
        isCustom: false,
        customPlanName: null,
      });
    });

    it('should merge custom plan limits with standard', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            name: 'Premium Custom',
            campaigns_limit: 10,     // Override
            boosts_limit: null,      // Use standard
            hires_limit: -1,         // Unlimited
          },
          error: null,
        }),
      } as any);

      const result = await getEffectivePlanLimits('brand-123', 'growth');

      expect(result).toEqual({
        campaigns: 10,      // Custom override
        boosts: 3,          // Standard (null = use standard)
        hires: UNLIMITED,   // -1 = unlimited (stays as -1)
        isCustom: true,
        customPlanName: 'Premium Custom',
      });
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      } as any);

      const result = await getEffectivePlanLimits('brand-123', 'growth');

      expect(result).toEqual({
        campaigns: 5,
        boosts: 3,
        hires: 30,
        isCustom: false,
        customPlanName: null,
      });
    });
  });

  describe('canCreateCampaign', () => {
    it('should return true when under limit', () => {
      expect(canCreateCampaign('starter', 0)).toBe(true);
      expect(canCreateCampaign('growth', 4)).toBe(true);
      expect(canCreateCampaign('enterprise', 1000)).toBe(true);
    });

    it('should return false when at or over limit', () => {
      expect(canCreateCampaign('starter', 1)).toBe(false);
      expect(canCreateCampaign('starter', 2)).toBe(false);
      expect(canCreateCampaign('growth', 5)).toBe(false);
    });

    it('should return false for negative count - FIX VERIFIED', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // FIX: Negative counts are now rejected and logged
      expect(canCreateCampaign('starter', -1)).toBe(false);
      expect(canCreateCampaign('starter', -100)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Negative campaign count detected:', -1);

      consoleSpy.mockRestore();
    });
  });

  describe('canCreateBoost', () => {
    it('should return true when under limit', () => {
      expect(canCreateBoost('starter', 0)).toBe(true);
      expect(canCreateBoost('growth', 2)).toBe(true);
    });

    it('should return false when at or over limit', () => {
      expect(canCreateBoost('starter', 1)).toBe(false);
      expect(canCreateBoost('growth', 3)).toBe(false);
    });

    it('should return false for negative count - FIX VERIFIED', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(canCreateBoost('starter', -1)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Negative boost count detected:', -1);

      consoleSpy.mockRestore();
    });
  });

  describe('canHireCreator', () => {
    it('should return true when under limit', () => {
      expect(canHireCreator('starter', 9)).toBe(true);
      expect(canHireCreator('growth', 29)).toBe(true);
    });

    it('should return false when at or over limit', () => {
      expect(canHireCreator('starter', 10)).toBe(false);
      expect(canHireCreator('growth', 30)).toBe(false);
    });

    it('should return false for negative count - FIX VERIFIED', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(canHireCreator('starter', -1)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Negative hire count detected:', -1);

      consoleSpy.mockRestore();
    });
  });

  describe('canCreateWithLimit', () => {
    it('should compare current count against limit', () => {
      expect(canCreateWithLimit(5, 10)).toBe(true);
      expect(canCreateWithLimit(10, 10)).toBe(false);
      expect(canCreateWithLimit(11, 10)).toBe(false);
    });

    it('should handle UNLIMITED (-1) limit', () => {
      expect(canCreateWithLimit(999999, UNLIMITED)).toBe(true);
      expect(canCreateWithLimit(0, UNLIMITED)).toBe(true);
    });

    it('should handle zero limit - FEATURE DISABLED', () => {
      expect(canCreateWithLimit(0, 0)).toBe(false);
    });

    it('should reject non-finite values - FIX VERIFIED', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(canCreateWithLimit(NaN, 10)).toBe(false);
      expect(canCreateWithLimit(5, NaN)).toBe(false);
      expect(canCreateWithLimit(Infinity, 10)).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should reject negative counts - FIX VERIFIED', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(canCreateWithLimit(-1, 10)).toBe(false);
      expect(canCreateWithLimit(-100, 10)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Negative count detected:', -1);

      consoleSpy.mockRestore();
    });
  });

  describe('getRemainingCount', () => {
    it('should calculate remaining count correctly', () => {
      expect(getRemainingCount(3, 10)).toBe(7);
      expect(getRemainingCount(10, 10)).toBe(0);
      expect(getRemainingCount(15, 10)).toBe(0); // Never negative
    });

    it('should return null for unlimited plans', () => {
      expect(getRemainingCount(1000, UNLIMITED)).toBeNull();
    });
  });

  describe('formatLimit', () => {
    it('should format regular limits as numbers', () => {
      expect(formatLimit(1)).toBe('1');
      expect(formatLimit(10)).toBe('10');
      expect(formatLimit(100)).toBe('100');
    });

    it('should format unlimited as "Unlimited"', () => {
      expect(formatLimit(UNLIMITED)).toBe('Unlimited');
    });
  });
});
