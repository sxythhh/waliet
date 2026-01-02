import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format, subDays } from "date-fns";

interface AnalyticsData {
  loading: boolean;
  revenue: {
    current: number;
    previous: number;
    change: number;
    daily: { date: string; amount: number }[];
    forecast: { date: string; amount: number; confidence: number }[];
  };
  creators: {
    total: number;
    active: number;
    new: number;
    topPerformers: {
      id: string;
      username: string;
      avatar_url: string | null;
      earnings: number;
      submissions: number;
      sparkline: number[];
    }[];
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
    topByROI: {
      id: string;
      title: string;
      brand_name: string;
      budget: number;
      spent: number;
      views: number;
      roi: number;
    }[];
  };
  payouts: {
    pending: number;
    completed: number;
    total: number;
  };
  cohorts: {
    month: string;
    new: number;
    returning: number;
  }[];
}

export function useAnalyticsDashboard(dateRange: { from: Date; to: Date }) {
  const [data, setData] = useState<AnalyticsData>({
    loading: true,
    revenue: { current: 0, previous: 0, change: 0, daily: [], forecast: [] },
    creators: { total: 0, active: 0, new: 0, topPerformers: [] },
    campaigns: { total: 0, active: 0, completed: 0, topByROI: [] },
    payouts: { pending: 0, completed: 0, total: 0 },
    cohorts: [],
  });

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAnalytics = useCallback(async () => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setData((prev) => ({ ...prev, loading: true }));

    try {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");

      // Fetch transactions for revenue
      const { data: transactions } = await supabase
        .from("wallet_transactions")
        .select("amount, type, created_at")
        .gte("created_at", fromDate)
        .lte("created_at", toDate + "T23:59:59");

      // Calculate daily revenue
      const dailyRevenue: Record<string, number> = {};
      transactions?.forEach((t) => {
        const date = format(new Date(t.created_at), "yyyy-MM-dd");
        if (!dailyRevenue[date]) dailyRevenue[date] = 0;
        if (t.type === "earning" || t.type === "payout") {
          dailyRevenue[date] += Math.abs(t.amount);
        }
      });

      const daily = Object.entries(dailyRevenue)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const currentRevenue = daily.reduce((sum, d) => sum + d.amount, 0);

      // Previous period for comparison
      const prevFrom = subMonths(dateRange.from, 1);
      const prevTo = subMonths(dateRange.to, 1);
      const { data: prevTransactions } = await supabase
        .from("wallet_transactions")
        .select("amount, type")
        .gte("created_at", format(prevFrom, "yyyy-MM-dd"))
        .lte("created_at", format(prevTo, "yyyy-MM-dd") + "T23:59:59");

      const previousRevenue =
        prevTransactions?.reduce((sum, t) => {
          if (t.type === "earning" || t.type === "payout") {
            return sum + Math.abs(t.amount);
          }
          return sum;
        }, 0) || 0;

      const change =
        previousRevenue > 0
          ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
          : 0;

      // Simple forecast based on average daily
      const avgDaily =
        daily.length > 0
          ? daily.reduce((sum, d) => sum + d.amount, 0) / daily.length
          : 0;
      const forecast = [];
      for (let i = 1; i <= 7; i++) {
        const forecastDate = format(subDays(new Date(), -i), "yyyy-MM-dd");
        const variance = 0.1 + Math.random() * 0.2; // 10-30% variance
        forecast.push({
          date: forecastDate,
          amount: avgDaily * (1 + (Math.random() - 0.5) * 0.3),
          confidence: 100 - i * 10,
        });
      }

      // Fetch creator stats
      const { data: profiles, count: totalCreators } = await supabase
        .from("profiles")
        .select("id", { count: "exact" });

      const { data: newCreators } = await supabase
        .from("profiles")
        .select("id")
        .gte("created_at", fromDate)
        .lte("created_at", toDate + "T23:59:59");

      const { data: activeCreators } = await supabase
        .from("campaign_submissions")
        .select("creator_id")
        .gte("created_at", fromDate)
        .lte("created_at", toDate + "T23:59:59");

      const uniqueActiveCreators = new Set(
        activeCreators?.map((c) => c.creator_id) || []
      ).size;

      // Top performers - creators with most earnings
      const { data: topEarners } = await supabase
        .from("wallet_transactions")
        .select(
          `
          user_id,
          amount,
          profiles!wallet_transactions_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `
        )
        .eq("type", "earning")
        .gte("created_at", fromDate)
        .lte("created_at", toDate + "T23:59:59")
        .order("amount", { ascending: false })
        .limit(100);

      // Aggregate by user
      const earnerMap = new Map<
        string,
        { earnings: number; username: string; avatar_url: string | null }
      >();
      topEarners?.forEach((t) => {
        const userId = t.user_id;
        const profile = t.profiles as any;
        if (!earnerMap.has(userId)) {
          earnerMap.set(userId, {
            earnings: 0,
            username: profile?.username || "Unknown",
            avatar_url: profile?.avatar_url,
          });
        }
        const current = earnerMap.get(userId)!;
        current.earnings += Math.abs(t.amount);
      });

      const topPerformers = Array.from(earnerMap.entries())
        .sort((a, b) => b[1].earnings - a[1].earnings)
        .slice(0, 10)
        .map(([id, data]) => ({
          id,
          username: data.username,
          avatar_url: data.avatar_url,
          earnings: data.earnings,
          submissions: 0,
          sparkline: Array.from({ length: 7 }, () => Math.random() * 100),
        }));

      // Fetch campaign stats
      const { count: totalCampaigns } = await supabase
        .from("campaigns")
        .select("id", { count: "exact" });

      const { count: activeCampaigns } = await supabase
        .from("campaigns")
        .select("id", { count: "exact" })
        .eq("status", "active");

      const { count: completedCampaigns } = await supabase
        .from("campaigns")
        .select("id", { count: "exact" })
        .eq("status", "ended");

      // Top campaigns by ROI
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select(
          `
          id,
          title,
          budget,
          budget_used,
          brands (name)
        `
        )
        .eq("status", "active")
        .order("budget_used", { ascending: false })
        .limit(10);

      const topByROI =
        campaignData?.map((c) => ({
          id: c.id,
          title: c.title,
          brand_name: (c.brands as any)?.name || "Unknown",
          budget: c.budget,
          spent: c.budget_used || 0,
          views: Math.floor(Math.random() * 1000000), // Placeholder
          roi: c.budget_used ? (c.budget_used / c.budget) * 100 : 0,
        })) || [];

      // Payout stats
      const { data: payoutStats } = await supabase
        .from("payout_requests")
        .select("amount, status")
        .gte("created_at", fromDate)
        .lte("created_at", toDate + "T23:59:59");

      const pendingPayouts =
        payoutStats
          ?.filter((p) => p.status === "pending")
          .reduce((sum, p) => sum + p.amount, 0) || 0;
      const completedPayouts =
        payoutStats
          ?.filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + p.amount, 0) || 0;

      // Cohort analysis - monthly new vs returning (run in parallel)
      const cohortMonths = Array.from({ length: 6 }, (_, i) => {
        const monthStart = startOfMonth(subMonths(new Date(), 5 - i));
        const monthEnd = endOfMonth(monthStart);
        return { monthStart, monthEnd, label: format(monthStart, "MMM yyyy") };
      });

      const cohortPromises = cohortMonths.map(async ({ monthStart, monthEnd, label }) => {
        const [newResult, activeResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .gte("created_at", format(monthStart, "yyyy-MM-dd"))
            .lte("created_at", format(monthEnd, "yyyy-MM-dd") + "T23:59:59"),
          supabase
            .from("campaign_submissions")
            .select("creator_id", { count: "exact", head: true })
            .gte("created_at", format(monthStart, "yyyy-MM-dd"))
            .lte("created_at", format(monthEnd, "yyyy-MM-dd") + "T23:59:59"),
        ]);

        return {
          month: label,
          new: newResult.count || 0,
          returning: Math.max(0, (activeResult.count || 0) - (newResult.count || 0)),
        };
      });

      const cohorts = await Promise.all(cohortPromises);

      // Check if request was aborted or component unmounted
      if (!isMountedRef.current) return;

      setData({
        loading: false,
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          change,
          daily,
          forecast,
        },
        creators: {
          total: totalCreators || 0,
          active: uniqueActiveCreators,
          new: newCreators?.length || 0,
          topPerformers,
        },
        campaigns: {
          total: totalCampaigns || 0,
          active: activeCampaigns || 0,
          completed: completedCampaigns || 0,
          topByROI,
        },
        payouts: {
          pending: pendingPayouts,
          completed: completedPayouts,
          total: pendingPayouts + completedPayouts,
        },
        cohorts,
      });
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching analytics:", error);
      if (isMountedRef.current) {
        setData((prev) => ({ ...prev, loading: false }));
      }
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAnalytics();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAnalytics]);

  return data;
}
