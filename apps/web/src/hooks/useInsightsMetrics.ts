"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subDays, differenceInDays, format } from "date-fns";

export interface InsightsMetricsData {
  // Creator Retention
  retention: {
    active: number; // Active in last 14 days
    atRisk: number; // 15-30 days inactive
    dormant: number; // 31-60 days inactive
    churned: number; // 60+ days inactive
    retentionRate: number; // Active / Total %
  };

  // Platform Breakdown
  platformBreakdown: {
    tiktok: number;
    instagram: number;
    youtube: number;
    x: number;
  };

  // Video Performance
  videoPerformance: {
    totalViews: number;
    totalVideos: number;
    avgViewsPerVideo: number;
    totalLikes: number;
    avgEngagementRate: number; // (likes + comments) / views %
  };

  // Submission Quality
  submissionQuality: {
    totalSubmissions: number;
    approved: number;
    rejected: number;
    pending: number;
    approvalRate: number;
  };

  // Payout Efficiency
  payoutEfficiency: {
    avgProcessingDays: number;
    fastestProcessing: number;
    slowestProcessing: number;
    completedThisWeek: number;
    weekOverWeekChange: number;
  };

  // Social Account Coverage
  socialCoverage: {
    creatorsWithAccounts: number;
    totalCreators: number;
    coverageRate: number;
    avgAccountsPerCreator: number;
  };

  // Bounty Campaign Stats
  bountyStats: {
    totalBounties: number;
    activeBounties: number;
    totalApplications: number;
    acceptedApplications: number;
    waitlistedApplications: number;
    acceptanceRate: number;
  };

  // Referral Program
  referralStats: {
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalRewardsEarned: number;
    conversionRate: number;
  };

  // Fraud Response
  fraudResponse: {
    totalFlagged: number;
    evidenceSubmitted: number;
    evidenceResponseRate: number;
    avgResponseTime: number; // hours
  };

  // Weekly Trends
  weeklyTrends: {
    earningsThisWeek: number;
    earningsLastWeek: number;
    earningsChange: number;
    signupsThisWeek: number;
    signupsLastWeek: number;
    signupsChange: number;
  };

  // Trust Score Distribution
  trustDistribution: {
    excellent: number; // 80-100
    good: number; // 60-79
    fair: number; // 40-59
    poor: number; // 0-39
    unscored: number;
    avgScore: number;
  };

  // Campaign Budget Health
  budgetHealth: {
    totalBudget: number;
    totalSpent: number;
    utilizationRate: number;
    campaignsNearBudget: number; // >80% used
    campaignsUnderutilized: number; // <20% used
  };
}

export function useInsightsMetrics() {
  const [metrics, setMetrics] = useState<InsightsMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsightsMetrics();
  }, []);

  const fetchInsightsMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const fourteenDaysAgo = subDays(now, 14);
      const thirtyDaysAgo = subDays(now, 30);
      const sixtyDaysAgo = subDays(now, 60);
      const sevenDaysAgo = subDays(now, 7);
      const fourteenDaysAgoDate = subDays(now, 14);

      // Run all queries in parallel for better performance
      const [
        // Creator activity data
        allProfilesResult,
        recentActivityResult,
        midActivityResult,
        oldActivityResult,

        // Platform breakdown
        platformResult,

        // Video performance
        videoMetricsResult,

        // Submission quality
        submissionsResult,

        // Payout efficiency
        completedPayoutsResult,
        lastWeekPayoutsResult,

        // Social coverage
        socialAccountsResult,
        creatorsWithSocialResult,

        // Bounty stats
        bountyResult,
        bountyAppsResult,

        // Referrals
        referralsResult,
        referralRewardsResult,

        // Fraud response
        fraudFlagsResult,
        evidenceResult,

        // Weekly trends
        thisWeekEarningsResult,
        lastWeekEarningsResult,
        thisWeekSignupsResult,
        lastWeekSignupsResult,

        // Trust scores
        trustScoresResult,

        // Campaign budgets
        campaignBudgetsResult,
      ] = await Promise.all([
        // All profiles
        supabase.from("profiles").select("id, created_at", { count: "exact" }),

        // Recent activity (14 days) - get user_ids with earnings or submissions
        supabase
          .from("wallet_transactions")
          .select("user_id")
          .eq("type", "earning")
          .gte("created_at", fourteenDaysAgo.toISOString()),

        // Mid activity (15-30 days)
        supabase
          .from("wallet_transactions")
          .select("user_id")
          .eq("type", "earning")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .lt("created_at", fourteenDaysAgo.toISOString()),

        // Old activity (31-60 days)
        supabase
          .from("wallet_transactions")
          .select("user_id")
          .eq("type", "earning")
          .gte("created_at", sixtyDaysAgo.toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString()),

        // Platform breakdown from campaign_submissions
        supabase
          .from("campaign_submissions")
          .select("platform")
          .gte("created_at", thirtyDaysAgo.toISOString()),

        // Video performance from video_submissions
        supabase
          .from("video_submissions")
          .select("views, likes, comments, shares, bookmarks")
          .not("views", "is", null),

        // Submission quality
        supabase.from("campaign_submissions").select("status"),

        // Completed payouts with processing time
        supabase
          .from("payout_requests")
          .select("requested_at, processed_at, amount, status")
          .eq("status", "completed")
          .not("processed_at", "is", null)
          .gte("processed_at", thirtyDaysAgo.toISOString()),

        // Last week payouts for comparison
        supabase
          .from("payout_requests")
          .select("id", { count: "exact" })
          .eq("status", "completed")
          .gte("processed_at", fourteenDaysAgoDate.toISOString())
          .lt("processed_at", sevenDaysAgo.toISOString()),

        // Social accounts
        supabase.from("social_accounts").select("user_id, platform"),

        // Creators with social accounts
        supabase
          .from("social_accounts")
          .select("user_id"),

        // Bounty campaigns
        supabase.from("bounty_campaigns").select("id, status"),

        // Bounty applications
        supabase.from("bounty_applications").select("status"),

        // Referrals
        supabase.from("referrals").select("status"),

        // Referral rewards from transactions
        supabase
          .from("wallet_transactions")
          .select("amount")
          .eq("type", "referral"),

        // Fraud flags
        supabase.from("fraud_flags").select("id, status, created_at"),

        // Evidence submissions
        supabase.from("fraud_evidence").select("id, payout_request_id, uploaded_at"),

        // This week earnings
        supabase
          .from("wallet_transactions")
          .select("amount")
          .eq("type", "earning")
          .gte("created_at", sevenDaysAgo.toISOString()),

        // Last week earnings
        supabase
          .from("wallet_transactions")
          .select("amount")
          .eq("type", "earning")
          .gte("created_at", fourteenDaysAgoDate.toISOString())
          .lt("created_at", sevenDaysAgo.toISOString()),

        // This week signups
        supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .gte("created_at", sevenDaysAgo.toISOString()),

        // Last week signups
        supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .gte("created_at", fourteenDaysAgoDate.toISOString())
          .lt("created_at", sevenDaysAgo.toISOString()),

        // Trust scores
        supabase
          .from("profiles")
          .select("trust_score"),

        // Campaign budgets
        supabase
          .from("campaigns")
          .select("budget, budget_used, status")
          .eq("status", "active"),
      ]);

      // Process Creator Retention
      const totalProfiles = allProfilesResult.count || 0;
      const activeUserIds = new Set(recentActivityResult.data?.map((t) => t.user_id) || []);
      const midUserIds = new Set(midActivityResult.data?.map((t) => t.user_id) || []);
      const oldUserIds = new Set(oldActivityResult.data?.map((t) => t.user_id) || []);

      // Remove overlaps
      midUserIds.forEach((id) => {
        if (activeUserIds.has(id)) midUserIds.delete(id);
      });
      oldUserIds.forEach((id) => {
        if (activeUserIds.has(id) || midUserIds.has(id)) oldUserIds.delete(id);
      });

      const activeCount = activeUserIds.size;
      const atRiskCount = midUserIds.size;
      const dormantCount = oldUserIds.size;
      const churnedCount = Math.max(0, totalProfiles - activeCount - atRiskCount - dormantCount);
      const retentionRate = totalProfiles > 0 ? (activeCount / totalProfiles) * 100 : 0;

      // Process Platform Breakdown
      const platformCounts = { tiktok: 0, instagram: 0, youtube: 0, x: 0 };
      platformResult.data?.forEach((s) => {
        const platform = s.platform?.toLowerCase();
        if (platform === "tiktok") platformCounts.tiktok++;
        else if (platform === "instagram") platformCounts.instagram++;
        else if (platform === "youtube") platformCounts.youtube++;
        else if (platform === "x" || platform === "twitter") platformCounts.x++;
      });

      // Process Video Performance
      const videos = videoMetricsResult.data || [];
      const totalViews = videos.reduce((sum, v) => sum + (Number(v.views) || 0), 0);
      const totalLikes = videos.reduce((sum, v) => sum + (Number(v.likes) || 0), 0);
      const totalComments = videos.reduce((sum, v) => sum + (Number(v.comments) || 0), 0);
      const totalVideos = videos.length;
      const avgViewsPerVideo = totalVideos > 0 ? totalViews / totalVideos : 0;
      const avgEngagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;

      // Process Submission Quality
      const submissions = submissionsResult.data || [];
      const approvedCount = submissions.filter((s) => s.status === "approved").length;
      const rejectedCount = submissions.filter((s) => s.status === "rejected").length;
      const pendingCount = submissions.filter((s) => s.status === "pending").length;
      const totalSubmissions = submissions.length;
      const approvalRate = totalSubmissions > 0 ? (approvedCount / totalSubmissions) * 100 : 0;

      // Process Payout Efficiency
      const completedPayouts = completedPayoutsResult.data || [];
      const processingDays = completedPayouts
        .filter((p) => p.processed_at && p.requested_at)
        .map((p) => differenceInDays(new Date(p.processed_at), new Date(p.requested_at)));

      const avgProcessingDays = processingDays.length > 0
        ? processingDays.reduce((a, b) => a + b, 0) / processingDays.length
        : 0;
      const fastestProcessing = processingDays.length > 0 ? Math.min(...processingDays) : 0;
      const slowestProcessing = processingDays.length > 0 ? Math.max(...processingDays) : 0;
      const completedThisWeek = completedPayouts.filter(
        (p) => new Date(p.processed_at!) >= sevenDaysAgo
      ).length;
      const completedLastWeek = lastWeekPayoutsResult.count || 0;
      const weekOverWeekChange = completedLastWeek > 0
        ? ((completedThisWeek - completedLastWeek) / completedLastWeek) * 100
        : completedThisWeek > 0 ? 100 : 0;

      // Process Social Coverage
      const socialAccounts = socialAccountsResult.data || [];
      const creatorsWithAccounts = new Set(creatorsWithSocialResult.data?.map((s) => s.user_id) || []).size;
      const socialCoverageRate = totalProfiles > 0 ? (creatorsWithAccounts / totalProfiles) * 100 : 0;
      const avgAccountsPerCreator = creatorsWithAccounts > 0 ? socialAccounts.length / creatorsWithAccounts : 0;

      // Process Bounty Stats
      const bounties = bountyResult.data || [];
      const totalBounties = bounties.length;
      const activeBounties = bounties.filter((b) => b.status === "active").length;
      const bountyApps = bountyAppsResult.data || [];
      const totalApplications = bountyApps.length;
      const acceptedApplications = bountyApps.filter((a) => a.status === "accepted").length;
      const waitlistedApplications = bountyApps.filter((a) => a.status === "waitlisted").length;
      const acceptanceRate = totalApplications > 0 ? (acceptedApplications / totalApplications) * 100 : 0;

      // Process Referral Stats
      const referrals = referralsResult.data || [];
      const totalReferrals = referrals.length;
      const completedReferrals = referrals.filter((r) => r.status === "completed").length;
      const pendingReferrals = referrals.filter((r) => r.status === "pending").length;
      const referralRewards = referralRewardsResult.data || [];
      const totalRewardsEarned = referralRewards.reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);
      const referralConversionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;

      // Process Fraud Response
      const fraudFlags = fraudFlagsResult.data || [];
      const totalFlagged = fraudFlags.length;
      const evidenceSubmissions = evidenceResult.data || [];
      const flagsWithEvidence = new Set(evidenceSubmissions.map((e) => e.payout_request_id)).size;
      const evidenceResponseRate = totalFlagged > 0 ? (flagsWithEvidence / totalFlagged) * 100 : 0;

      // Process Weekly Trends
      const thisWeekEarnings = thisWeekEarningsResult.data?.reduce(
        (sum, t) => sum + Math.abs(Number(t.amount) || 0), 0
      ) || 0;
      const lastWeekEarnings = lastWeekEarningsResult.data?.reduce(
        (sum, t) => sum + Math.abs(Number(t.amount) || 0), 0
      ) || 0;
      const earningsChange = lastWeekEarnings > 0
        ? ((thisWeekEarnings - lastWeekEarnings) / lastWeekEarnings) * 100
        : thisWeekEarnings > 0 ? 100 : 0;

      const thisWeekSignups = thisWeekSignupsResult.count || 0;
      const lastWeekSignups = lastWeekSignupsResult.count || 0;
      const signupsChange = lastWeekSignups > 0
        ? ((thisWeekSignups - lastWeekSignups) / lastWeekSignups) * 100
        : thisWeekSignups > 0 ? 100 : 0;

      // Process Trust Score Distribution
      const trustScores = trustScoresResult.data || [];
      let excellent = 0, good = 0, fair = 0, poor = 0, unscored = 0;
      let totalScore = 0, scoredCount = 0;

      trustScores.forEach((p) => {
        const score = p.trust_score;
        if (score === null || score === undefined) {
          unscored++;
        } else {
          totalScore += score;
          scoredCount++;
          if (score >= 80) excellent++;
          else if (score >= 60) good++;
          else if (score >= 40) fair++;
          else poor++;
        }
      });

      const avgTrustScore = scoredCount > 0 ? totalScore / scoredCount : 0;

      // Process Campaign Budget Health
      const campaigns = campaignBudgetsResult.data || [];
      const totalBudget = campaigns.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
      const totalSpent = campaigns.reduce((sum, c) => sum + (Number(c.budget_used) || 0), 0);
      const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      const campaignsNearBudget = campaigns.filter((c) => {
        const used = Number(c.budget_used) || 0;
        const budget = Number(c.budget) || 1;
        return (used / budget) >= 0.8;
      }).length;
      const campaignsUnderutilized = campaigns.filter((c) => {
        const used = Number(c.budget_used) || 0;
        const budget = Number(c.budget) || 1;
        return (used / budget) < 0.2;
      }).length;

      setMetrics({
        retention: {
          active: activeCount,
          atRisk: atRiskCount,
          dormant: dormantCount,
          churned: churnedCount,
          retentionRate,
        },
        platformBreakdown: platformCounts,
        videoPerformance: {
          totalViews,
          totalVideos,
          avgViewsPerVideo,
          totalLikes,
          avgEngagementRate,
        },
        submissionQuality: {
          totalSubmissions,
          approved: approvedCount,
          rejected: rejectedCount,
          pending: pendingCount,
          approvalRate,
        },
        payoutEfficiency: {
          avgProcessingDays,
          fastestProcessing,
          slowestProcessing,
          completedThisWeek,
          weekOverWeekChange,
        },
        socialCoverage: {
          creatorsWithAccounts,
          totalCreators: totalProfiles,
          coverageRate: socialCoverageRate,
          avgAccountsPerCreator,
        },
        bountyStats: {
          totalBounties,
          activeBounties,
          totalApplications,
          acceptedApplications,
          waitlistedApplications,
          acceptanceRate,
        },
        referralStats: {
          totalReferrals,
          completedReferrals,
          pendingReferrals,
          totalRewardsEarned,
          conversionRate: referralConversionRate,
        },
        fraudResponse: {
          totalFlagged,
          evidenceSubmitted: flagsWithEvidence,
          evidenceResponseRate,
          avgResponseTime: 0, // Would need more data
        },
        weeklyTrends: {
          earningsThisWeek: thisWeekEarnings,
          earningsLastWeek: lastWeekEarnings,
          earningsChange,
          signupsThisWeek: thisWeekSignups,
          signupsLastWeek: lastWeekSignups,
          signupsChange,
        },
        trustDistribution: {
          excellent,
          good,
          fair,
          poor,
          unscored,
          avgScore: avgTrustScore,
        },
        budgetHealth: {
          totalBudget,
          totalSpent,
          utilizationRate,
          campaignsNearBudget,
          campaignsUnderutilized,
        },
      });
    } catch (err) {
      console.error("Error fetching insights metrics:", err);
      setError("Failed to load insights metrics");
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, error, refetch: fetchInsightsMetrics };
}
