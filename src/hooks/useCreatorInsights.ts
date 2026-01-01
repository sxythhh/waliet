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
      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, email, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Fetch all earnings
      const { data: earnings } = await supabase
        .from("wallet_transactions")
        .select("user_id, amount, created_at")
        .eq("type", "earning");

      // Fetch submissions
      const { data: submissions } = await supabase
        .from("campaign_submissions")
        .select("creator_id, status, platform, created_at");

      // Fetch social accounts
      const { data: socialAccounts } = await supabase
        .from("social_accounts")
        .select("user_id, platform");

      // Process each creator
      const typedSubmissions = submissions as unknown as Array<{creator_id: string; status: string; platform: string; created_at: string}>;
      const creatorInsights: CreatorInsight[] = profiles.map((profile) => {
        const userEarnings = earnings?.filter((e) => e.user_id === profile.id) || [];
        const userSubmissions =
          typedSubmissions?.filter((s) => s.creator_id === profile.id) || [];
        const userSocialAccounts =
          socialAccounts?.filter((a) => a.user_id === profile.id) || [];

        const totalEarnings = userEarnings.reduce(
          (sum, e) => sum + Math.abs(e.amount),
          0
        );
        const totalSubmissions = userSubmissions.length;
        const approvedSubmissions = userSubmissions.filter(
          (s) => s.status === "approved"
        ).length;
        const approvalRate =
          totalSubmissions > 0
            ? (approvedSubmissions / totalSubmissions) * 100
            : 0;

        // Platform breakdown
        const platformCounts: Record<string, number> = {};
        userSubmissions.forEach((s) => {
          platformCounts[s.platform] = (platformCounts[s.platform] || 0) + 1;
        });
        const platformBreakdown = Object.entries(platformCounts).map(
          ([platform, count]) => ({ platform, count })
        );

        // Calculate last active
        const submissionDates = userSubmissions
          .map((s) => new Date(s.created_at))
          .filter((d) => !isNaN(d.getTime()));
        const lastActive =
          submissionDates.length > 0
            ? new Date(Math.max(...submissionDates.map((d) => d.getTime())))
                .toISOString()
            : null;

        // Retention status based on last activity
        const now = new Date();
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
            (now.getTime() - new Date(profile.created_at).getTime()) /
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
          (now.getTime() - new Date(profile.created_at).getTime()) /
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

        // Generate sparkline (random for now, would be real data)
        const sparkline = Array.from(
          { length: 7 },
          () => Math.random() * earningsVelocity
        );

        return {
          id: profile.id,
          username: profile.username || "Unknown",
          email: profile.email || "",
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
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

      // Calculate stats
      const activeCount = creatorInsights.filter(
        (c) => c.retentionStatus === "active"
      ).length;
      const atRiskCount = creatorInsights.filter(
        (c) => c.retentionStatus === "at-risk"
      ).length;
      const dormantCount = creatorInsights.filter(
        (c) => c.retentionStatus === "dormant"
      ).length;
      const churnedCount = creatorInsights.filter(
        (c) => c.retentionStatus === "churned"
      ).length;
      const avgPerformance =
        creatorInsights.reduce((sum, c) => sum + c.performanceScore, 0) /
        (creatorInsights.length || 1);
      const avgFraudRisk =
        creatorInsights.reduce((sum, c) => sum + c.fraudRiskScore, 0) /
        (creatorInsights.length || 1);

      setStats({
        total: creatorInsights.length,
        active: activeCount,
        atRisk: atRiskCount,
        dormant: dormantCount,
        churned: churnedCount,
        avgPerformanceScore: Math.round(avgPerformance),
        avgFraudRiskScore: Math.round(avgFraudRisk),
      });

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
