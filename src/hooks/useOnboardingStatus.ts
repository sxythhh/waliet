import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingStatus {
  isLoading: boolean;
  completedCount: number;
  totalCount: number;
  shouldShowOnboarding: boolean;
  markOnboardingComplete: () => Promise<void>;
}

export function useOnboardingStatus(): OnboardingStatus {
  const [isLoading, setIsLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true); // Default to true to prevent flash
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
      // Fetch profile data including onboarding_completed flag
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, onboarding_completed")
        .eq("id", session.user.id)
        .single();

      // If already marked as completed, don't show
      if (profile?.onboarding_completed) {
        setOnboardingCompleted(true);
        setIsLoading(false);
        return;
      }

      setOnboardingCompleted(false);

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

      // 2. Choose content preferences
      if (profile?.content_styles && profile.content_styles.length > 0) completed++;

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

  const markOnboardingComplete = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", session.user.id);

    setOnboardingCompleted(true);
  };

  return {
    isLoading,
    completedCount,
    totalCount,
    shouldShowOnboarding: !isLoading && !onboardingCompleted && completedCount === 0,
    markOnboardingComplete
  };
}
