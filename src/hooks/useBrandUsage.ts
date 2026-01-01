import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlanLimits } from "@/utils/subscriptionLimits";

export interface BrandUsage {
  boostsUsed: number;
  boostsLimit: number;
  hiresUsed: number;
  hiresLimit: number;
  loading: boolean;
  error: string | null;
}

export function useBrandUsage(brandId: string | undefined, plan: string | null | undefined): BrandUsage {
  const [boostsUsed, setBoostsUsed] = useState(0);
  const [hiresUsed, setHiresUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limits = getPlanLimits(plan);

  useEffect(() => {
    if (!brandId) {
      setLoading(false);
      return;
    }

    const fetchUsage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Count active boosts (bounty campaigns that are active or approved)
        const { count: boostCount, error: boostError } = await supabase
          .from("bounty_campaigns")
          .select("*", { count: "exact", head: true })
          .eq("brand_id", brandId)
          .in("status", ["active", "approved", "pending_review"]);

        if (boostError) throw boostError;

        // Count approved submissions (hires) for this brand's campaigns
        const { data: campaigns, error: campaignsError } = await supabase
          .from("bounty_campaigns")
          .select("id")
          .eq("brand_id", brandId);

        if (campaignsError) throw campaignsError;

        let hireCount = 0;
        if (campaigns && campaigns.length > 0) {
          const campaignIds = campaigns.map((c) => c.id);

          const { count, error: submissionsError } = await supabase
            .from("campaign_submissions")
            .select("*", { count: "exact", head: true })
            .in("campaign_id", campaignIds)
            .eq("status", "approved");

          if (submissionsError) throw submissionsError;
          hireCount = count || 0;
        }

        setBoostsUsed(boostCount || 0);
        setHiresUsed(hireCount);
      } catch (err: any) {
        console.error("Error fetching brand usage:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [brandId]);

  return {
    boostsUsed,
    boostsLimit: limits.boosts,
    hiresUsed,
    hiresLimit: limits.hires,
    loading,
    error,
  };
}
