import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Referral code format: alphanumeric only, 6-12 characters
const REFERRAL_CODE_REGEX = /^[A-Z0-9]{6,12}$/;

export interface ReferralTrackingResult {
  success: boolean;
  error?: string;
}

/**
 * Validate that a referral code matches expected format
 * Prevents injection attempts and invalid codes from being processed
 */
function isValidReferralCode(code: string): boolean {
  return REFERRAL_CODE_REGEX.test(code.toUpperCase());
}

/**
 * Get a session-specific key for tracking referral clicks
 * This prevents duplicate tracking within the same browser session
 */
function getClickTrackingKey(code: string): string {
  return `referral_click_tracked_${code.toUpperCase()}`;
}

export const useReferralTracking = () => {
  // Track if we've already processed the URL in this component lifecycle
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Only process once per mount
    if (hasProcessedRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');

    // Exit early if no referral code or empty string
    if (!referralCode || referralCode.trim() === '') {
      return;
    }

    const normalizedCode = referralCode.trim().toUpperCase();

    // FIX: Validate referral code format to prevent injection
    if (!isValidReferralCode(normalizedCode)) {
      console.warn('Invalid referral code format:', referralCode);
      return;
    }

    hasProcessedRef.current = true;

    // FIX: Debounce click tracking using sessionStorage
    // This prevents duplicate tracking on page refreshes/navigations
    const clickTrackingKey = getClickTrackingKey(normalizedCode);
    const alreadyTracked = sessionStorage.getItem(clickTrackingKey);

    if (!alreadyTracked) {
      // Track the click via edge function
      const trackClick = async () => {
        try {
          await supabase.functions.invoke('track-referral-click', {
            body: { referral_code: normalizedCode }
          });
          // Mark as tracked for this session
          sessionStorage.setItem(clickTrackingKey, 'true');
        } catch (error) {
          console.error('Failed to track referral click:', error);
          // Don't block the referral code storage on tracking failure
        }
      };
      trackClick();
    }

    // Store referral code in localStorage (uppercase for consistent matching)
    localStorage.setItem('referral_code', normalizedCode);
  }, []);

  const trackReferral = async (newUserId: string): Promise<ReferralTrackingResult> => {
    const referralCode = localStorage.getItem('referral_code');

    if (!referralCode) {
      return { success: false };
    }

    // FIX: Validate the stored code as well (defense in depth)
    if (!isValidReferralCode(referralCode)) {
      localStorage.removeItem('referral_code');
      return { success: false, error: "Invalid referral code format" };
    }

    try {
      // FIX: Use exact match (eq) instead of ilike to prevent multiple matches
      // The code is already normalized to uppercase
      const { data: referrer, error: lookupError } = await supabase
        .from("profiles")
        .select("id, referral_code")
        .eq("referral_code", referralCode)
        .maybeSingle();

      if (lookupError) {
        console.error("Error looking up referrer:", lookupError);
        localStorage.removeItem('referral_code');
        return { success: false, error: "Failed to look up referral code" };
      }

      if (!referrer) {
        localStorage.removeItem('referral_code');
        return { success: false, error: "Invalid referral code" };
      }

      // Prevent self-referral
      if (referrer.id === newUserId) {
        localStorage.removeItem('referral_code');
        return { success: false, error: "You cannot use your own referral code" };
      }

      // Create referral record
      const { error: insertError } = await supabase
        .from("referrals")
        .insert({
          referrer_id: referrer.id,
          referred_id: newUserId,
          referral_code: referralCode,
          status: 'pending',
        });

      if (insertError) {
        // Check if it's a duplicate referral (unique constraint violation)
        if (insertError.code === '23505') {
          localStorage.removeItem('referral_code');
          return { success: false, error: "You have already been referred" };
        }
        throw insertError;
      }

      // FIX: Use atomic increment via RPC instead of read-then-write
      // This prevents the TOCTOU race condition
      const { error: incrementError } = await supabase.rpc('increment_referral_count', {
        referrer_user_id: referrer.id
      });

      if (incrementError) {
        // Log but don't fail the referral - the referral record was created
        console.error("Failed to increment referral count:", incrementError);
        // Fall back to the old method if RPC doesn't exist
        if (incrementError.code === '42883') { // function does not exist
          const { data: currentProfile } = await supabase
            .from("profiles")
            .select("total_referrals")
            .eq("id", referrer.id)
            .single();

          if (currentProfile) {
            await supabase
              .from("profiles")
              .update({ total_referrals: (currentProfile.total_referrals || 0) + 1 })
              .eq("id", referrer.id);
          }
        }
      }

      // Clear referral code from storage
      localStorage.removeItem('referral_code');
      return { success: true };
    } catch (error: unknown) {
      console.error("Error tracking referral:", error);
      localStorage.removeItem('referral_code');
      const errorMessage = error instanceof Error ? error.message : "Failed to process referral";
      return { success: false, error: errorMessage };
    }
  };

  return { trackReferral };
};
