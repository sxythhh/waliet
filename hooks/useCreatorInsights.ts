import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CreatorInsight {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  // Performance metrics
  totalEarnings: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  approvalRate: number;
  // Engagement
  platformBreakdown: { platform: string; count: number }[];
  // Scores
  performanceScore: number;
  fraudRiskScore: number;
  retentionStatus: "active" | "at-risk" | "dormant" | "churned";
  // Activity
  lastActive: string | null;
  earningsVelocity: number; // monthly average
  sparkline: number[];
}

interface UseCreatorInsightsResult {
  loading: boolean;
  creators: CreatorInsight[];
  stats: {
    total: number;
    active: number;
    atRisk: number;
    dormant: number;
    churned: number;
    avgPerformanceScore: number;
    avgFraudRiskScore: number;
  };
  refetch: () => Promise<void>;
}

export function useCreatorInsights(): UseCreatorInsightsResult {
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<CreatorInsight[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    atRisk: 0,
    dormant: 0,
    churned: 0,
    avgPerformanceScore: 0,
    avgFraudRiskScore: 0,
  });

  const fetchCreators = async () => {
    setLoading(true);

    try {
      // Use optimized RPC function instead of multiple N+1 queries
      const { data: insightsData, error: insightsError } = await supabase
        .rpc('get_creator_insights', { p_limit: 100, p_offset: 0 });

      if (insightsError) {
        console.error("Error fetching creator insights:", insightsError);
        setLoading(false);
        return;
      }

      // Fetch stats using optimized RPC
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_creator_insights_stats');

      const now = new Date();

      // Process the data from RPC
      const creatorInsights: CreatorInsight[] = (insightsData || []).map((row: any) => {
        const totalEarnings = Number(row.total_earnings) || 0;
        const totalSubmissions = Number(row.total_submissions) || 0;
        const approvedSubmissions = Number(row.approved_submissions) || 0;
        const approvalRate = Number(row.approval_rate) || 0;
        const lastActive = row.last_active;
        
        // Parse platform breakdown from JSONB
        const platformBreakdown = Array.isArray(row.platform_breakdown) 
          ? row.platform_breakdown.map((p: any) => ({
              platform: p.platform,
              count: Number(p.count) || 0
            }))
          : [];

        // Retention status based on last activity
        const daysSinceActive = lastActive
          ? Math.floor(
              (now.getTime() - new Date(lastActive).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 999;

        let retentionStatus: CreatorInsight["retentionStatus"];
        if (daysSinceActive <= 14) retentionStatus = "active";
        else if (daysSinceActive <= 30) retentionStatus = "at-risk";
        else if (daysSinceActive <= 90) retentionStatus = "dormant";
        else retentionStatus = "churned";

        // Calculate monthly earnings velocity
        const monthsActive = Math.max(
          1,
          Math.ceil(
            (now.getTime() - new Date(row.created_at).getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          )
        );
        const earningsVelocity = totalEarnings / monthsActive;

        // Performance score (0-100)
        const earningsScore = Math.min(100, totalEarnings / 100);
        const engagementScore = Math.min(100, totalSubmissions * 10);
        const consistencyScore = approvalRate;
        const performanceScore = Math.round(
          (earningsScore * 0.4 + engagementScore * 0.3 + consistencyScore * 0.3)
        );

        // Fraud risk score (0-100) - higher is more risky
        const accountAge =
          (now.getTime() - new Date(row.created_at).getTime()) /
          (1000 * 60 * 60 * 24);
        const newAccountRisk = accountAge < 7 ? 30 : accountAge < 30 ? 15 : 0;
        const velocityRisk =
          earningsVelocity > 1000 && accountAge < 30 ? 30 : 0;
        const rejectionRisk =
          totalSubmissions > 5 && approvalRate < 30 ? 25 : 0;
        const fraudRiskScore = Math.min(
          100,
          newAccountRisk + velocityRisk + rejectionRisk
        );

        // Generate sparkline (simplified, would be real data in production)
        const sparkline = Array.from(
          { length: 7 },
          () => Math.random() * earningsVelocity
        );

        return {
          id: row.id,
          username: row.username || "Unknown",
          email: row.email || "",
          avatar_url: row.avatar_url,
          created_at: row.created_at,
          totalEarnings,
          totalSubmissions,
          approvedSubmissions,
          approvalRate,
          platformBreakdown,
          performanceScore,
          fraudRiskScore,
          retentionStatus,
          lastActive,
          earningsVelocity,
          sparkline,
        };
      });

      // Use stats from RPC if available, otherwise calculate from data
      if (statsData && statsData.length > 0) {
        const s = statsData[0];
        setStats({
          total: Number(s.total_creators) || creatorInsights.length,
          active: Number(s.active_creators) || creatorInsights.filter(c => c.retentionStatus === "active").length,
          atRisk: Number(s.at_risk_creators) || creatorInsights.filter(c => c.retentionStatus === "at-risk").length,
          dormant: Number(s.dormant_creators) || creatorInsights.filter(c => c.retentionStatus === "dormant").length,
          churned: Number(s.churned_creators) || creatorInsights.filter(c => c.retentionStatus === "churned").length,
          avgPerformanceScore: Math.round(
            creatorInsights.reduce((sum, c) => sum + c.performanceScore, 0) /
              (creatorInsights.length || 1)
          ),
          avgFraudRiskScore: Math.round(
            creatorInsights.reduce((sum, c) => sum + c.fraudRiskScore, 0) /
              (creatorInsights.length || 1)
          ),
        });
      } else {
        // Fallback to calculating from data
        const activeCount = creatorInsights.filter(c => c.retentionStatus === "active").length;
        const atRiskCount = creatorInsights.filter(c => c.retentionStatus === "at-risk").length;
        const dormantCount = creatorInsights.filter(c => c.retentionStatus === "dormant").length;
        const churnedCount = creatorInsights.filter(c => c.retentionStatus === "churned").length;
        const avgPerformance = creatorInsights.reduce((sum, c) => sum + c.performanceScore, 0) / (creatorInsights.length || 1);
        const avgFraudRisk = creatorInsights.reduce((sum, c) => sum + c.fraudRiskScore, 0) / (creatorInsights.length || 1);

        setStats({
          total: creatorInsights.length,
          active: activeCount,
          atRisk: atRiskCount,
          dormant: dormantCount,
          churned: churnedCount,
          avgPerformanceScore: Math.round(avgPerformance),
          avgFraudRiskScore: Math.round(avgFraudRisk),
        });
      }

      setCreators(creatorInsights);
    } catch (error) {
      console.error("Error fetching creator insights:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  return { loading, creators, stats, refetch: fetchCreators };
}
