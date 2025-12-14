import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingStatus {
  isLoading: boolean;
  completedCount: number;
  totalCount: number;
  shouldShowOnboarding: boolean;
}

export function useOnboardingStatus(): OnboardingStatus {
  const [isLoading, setIsLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const totalCount = 8;

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    setIsLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // Fetch social accounts with demographics
      const { data: socialAccounts } = await supabase
        .from("social_accounts")
        .select(`
          *,
          demographic_submissions(status)
        `)
        .eq("user_id", session.user.id)
        .eq("is_verified", true);

      // Fetch joined campaigns
      const { data: joinedCampaigns } = await supabase
        .from("campaign_submissions")
        .select("campaign_id")
        .eq("creator_id", session.user.id);

      // Calculate completed tasks (same logic as ProfileTab)
      let completed = 0;

      // 1. Add basic profile info
      if (profile?.full_name && profile?.username) completed++;

      // 2. Update your profile description
      if (profile?.bio && profile.bio.length > 10) completed++;

      // 3. Add your location
      if (profile?.country) completed++;

      // 4. Add phone number
      if (profile?.phone_number) completed++;

      // 5. Connect a social account
      if (socialAccounts && socialAccounts.length > 0) completed++;

      // 6. Submit demographics
      if (socialAccounts?.some(a => 
        a.demographic_submissions?.some((d: { status: string }) => d.status === 'approved')
      )) completed++;

      // 7. Join your first campaign
      if (joinedCampaigns && joinedCampaigns.length > 0) completed++;

      // 8. Earn your first payout
      if ((profile?.total_earnings || 0) > 0) completed++;

      setCompletedCount(completed);
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    }
    
    setIsLoading(false);
  };

  return {
    isLoading,
    completedCount,
    totalCount,
    shouldShowOnboarding: !isLoading && completedCount === 0
  };
}
