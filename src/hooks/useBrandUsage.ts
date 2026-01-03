import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlanLimits, getEffectivePlanLimits, EffectivePlanLimits } from "@/utils/subscriptionLimits";

export interface BrandUsage {
  campaignsUsed: number;
  campaignsLimit: number;
  boostsUsed: number;
  boostsLimit: number;
  hiresUsed: number;
  hiresLimit: number;
  loading: boolean;
  error: string | null;
  canCreateCampaign: boolean;
  canCreateBoost: boolean;
  canHireCreator: boolean;
  refetch: () => void;
  // Custom plan info
  isCustomPlan: boolean;
  customPlanName: string | null;
}

export function useBrandUsage(brandId: string | undefined, plan: string | null | undefined): BrandUsage {
  const [campaignsUsed, setCampaignsUsed] = useState(0);
  const [boostsUsed, setBoostsUsed] = useState(0);
  const [hiresUsed, setHiresUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [effectiveLimits, setEffectiveLimits] = useState<EffectivePlanLimits>({
    ...getPlanLimits(plan),
    isCustom: false,
    customPlanName: null,
  });

  const fetchUsage = async () => {
    if (!brandId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch effective limits (checks for custom plan)
      const limits = await getEffectivePlanLimits(brandId, plan);
      setEffectiveLimits(limits);

      // Count campaigns with status in ['active', 'draft']
      const { count: campaignCount, error: campaignError } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .in("status", ["active", "draft"]);

      if (campaignError) throw campaignError;

      // Count active boosts (bounty campaigns that are active or approved)
      const { count: boostCount, error: boostError } = await supabase
        .from("bounty_campaigns")
        .select("*", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .in("status", ["active", "approved", "pending_review"]);

      if (boostError) throw boostError;

      // Get active campaigns for hire counting
      const { data: activeCampaigns, error: activeCampaignsError } = await supabase
        .from("campaigns")
        .select("id")
        .eq("brand_id", brandId)
        .eq("status", "active");

      if (activeCampaignsError) throw activeCampaignsError;

      // Get active boosts for hire counting
      const { data: activeBoosts, error: activeBoostsError } = await supabase
        .from("bounty_campaigns")
        .select("id")
        .eq("brand_id", brandId)
        .in("status", ["active", "approved"]);

      if (activeBoostsError) throw activeBoostsError;

      // Count campaign_submissions with status='approved' for active campaigns
      let campaignHireCount = 0;
      const activeCampaignIds = activeCampaigns?.map((c) => c.id) || [];
      if (activeCampaignIds.length > 0) {
        const { count, error: submissionsError } = await supabase
          .from("campaign_submissions")
          .select("*", { count: "exact", head: true })
          .in("campaign_id", activeCampaignIds)
          .eq("status", "approved");

        if (submissionsError) throw submissionsError;
        campaignHireCount = count || 0;
      }

      // Count bounty_applications with status='accepted' for active boosts
      let boostHireCount = 0;
      const activeBoostIds = activeBoosts?.map((b) => b.id) || [];
      if (activeBoostIds.length > 0) {
        const { count, error: applicationsError } = await supabase
          .from("bounty_applications")
          .select("*", { count: "exact", head: true })
          .in("bounty_campaign_id", activeBoostIds)
          .eq("status", "accepted");

        if (applicationsError) throw applicationsError;
        boostHireCount = count || 0;
      }

      setCampaignsUsed(campaignCount || 0);
      setBoostsUsed(boostCount || 0);
      setHiresUsed(campaignHireCount + boostHireCount);
    } catch (err: any) {
      console.error("Error fetching brand usage:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [brandId, plan]);

  // Computed boolean helpers
  const canCreateCampaign = useMemo(() => campaignsUsed < effectiveLimits.campaigns, [campaignsUsed, effectiveLimits.campaigns]);
  const canCreateBoost = useMemo(() => boostsUsed < effectiveLimits.boosts, [boostsUsed, effectiveLimits.boosts]);
  const canHireCreator = useMemo(() => hiresUsed < effectiveLimits.hires, [hiresUsed, effectiveLimits.hires]);

  return {
    campaignsUsed,
    campaignsLimit: effectiveLimits.campaigns,
    boostsUsed,
    boostsLimit: effectiveLimits.boosts,
    hiresUsed,
    hiresLimit: effectiveLimits.hires,
    loading,
    error,
    canCreateCampaign,
    canCreateBoost,
    canHireCreator,
    refetch: fetchUsage,
    isCustomPlan: effectiveLimits.isCustom,
    customPlanName: effectiveLimits.customPlanName,
  };
}
