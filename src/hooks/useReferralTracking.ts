import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useReferralTracking = () => {
  useEffect(() => {
    // Check for referral code in URL on mount
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    
    if (referralCode) {
      // Store referral code in localStorage for later use during signup
      localStorage.setItem('referral_code', referralCode);
    }
  }, []);

  const trackReferral = async (newUserId: string) => {
    const referralCode = localStorage.getItem('referral_code');
    
    if (!referralCode) return;

    // Find the referrer by referral code
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode)
      .single();

    if (!referrer) {
      localStorage.removeItem('referral_code');
      return;
    }

    // Create referral record
    await supabase
      .from("referrals")
      .insert({
        referrer_id: referrer.id,
        referred_id: newUserId,
        referral_code: referralCode,
        status: 'pending',
      });

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
  };

  return { trackReferral };
};
