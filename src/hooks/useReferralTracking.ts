import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReferralTrackingResult {
  success: boolean;
  error?: string;
}

export const useReferralTracking = () => {
  useEffect(() => {
    // Check for referral code in URL on mount
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');

    if (referralCode) {
      // Track the click via edge function
      const trackClick = async () => {
        try {
          await supabase.functions.invoke('track-referral-click', {
            body: { referral_code: referralCode }
          });
        } catch (error) {
          console.error('Failed to track referral click:', error);
        }
      };
      trackClick();

      // Store referral code in localStorage (uppercase for consistent matching)
      localStorage.setItem('referral_code', referralCode.toUpperCase());
    }
  }, []);

  const trackReferral = async (newUserId: string): Promise<ReferralTrackingResult> => {
    const referralCode = localStorage.getItem('referral_code');

    if (!referralCode) return { success: false };

    try {
      // Find the referrer by referral code (case-insensitive using ilike)
      const { data: referrer, error: lookupError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("referral_code", referralCode)
        .single();

      if (lookupError || !referrer) {
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
          referral_code: referralCode.toUpperCase(),
          status: 'pending',
        });

      if (insertError) {
        // Check if it's a duplicate referral
        if (insertError.code === '23505') {
          localStorage.removeItem('referral_code');
          return { success: false, error: "You have already been referred" };
        }
        throw insertError;
      }

      // Update referrer's total referrals count
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

      // Clear referral code from storage
      localStorage.removeItem('referral_code');
      return { success: true };
    } catch (error: any) {
      console.error("Error tracking referral:", error);
      localStorage.removeItem('referral_code');
      return { success: false, error: error?.message || "Failed to process referral" };
    }
  };

  return { trackReferral };
};
