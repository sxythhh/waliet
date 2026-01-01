"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminMetric, AdminAlertMetric } from "../design-system/AdminMetric";
import { AdminMiniStatCard } from "../design-system/AdminCard";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays } from "date-fns";

interface MetricsData {
  // Primary metrics
  totalRevenue: number;
  revenueChange: number;
  activeUsers: number;
  activeUsersChange: number;
  pendingPayouts: number;
  pendingPayoutsAmount: number;
  fraudAlerts: number;

  // Secondary metrics
  totalCreators: number;
  totalBrands: number;
  activeCampaigns: number;
  completedPayoutsToday: number;

  // Tertiary metrics
  avgPayoutAmount: number;
  conversionRate: number;
  newUsersToday: number;
  submissionsToday: number;
}

export function MetricsGrid() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = subDays(now, 7);
      const fourteenDaysAgo = subDays(now, 14);

      // Fetch total revenue (from wallets)
      const { data: walletData } = await supabase
        .from("wallets")
        .select("total_earned");
      const totalRevenue = walletData?.reduce((sum, w) => sum + (Number(w.total_earned) || 0), 0) || 0;

      // Fetch revenue for last 7 days
      const { data: recentEarnings } = await supabase
        .from("wallet_transactions")
        .select("amount, created_at")
        .eq("type", "earning")
        .gte("created_at", sevenDaysAgo.toISOString());
      const currentPeriodRevenue = recentEarnings?.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

      // Fetch revenue for previous 7 days
      const { data: prevEarnings } = await supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("type", "earning")
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString());
      const prevPeriodRevenue = prevEarnings?.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

      const revenueChange = prevPeriodRevenue > 0
        ? ((currentPeriodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
        : currentPeriodRevenue > 0 ? 100 : 0;

      // Active users (users with activity in last 30 days)
      const thirtyDaysAgo = subDays(now, 30);
      const { data: activePayouts } = await supabase
        .from("payout_requests")
        .select("user_id")
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo.toISOString());
      const activeUsers = new Set(activePayouts?.map(p => p.user_id) || []).size;

      // Active users previous period
      const sixtyDaysAgo = subDays(now, 60);
      const { data: prevActivePayouts } = await supabase
        .from("payout_requests")
        .select("user_id")
        .eq("status", "completed")
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString());
      const prevActiveUsers = new Set(prevActivePayouts?.map(p => p.user_id) || []).size;

      const activeUsersChange = prevActiveUsers > 0
        ? ((activeUsers - prevActiveUsers) / prevActiveUsers) * 100
        : activeUsers > 0 ? 100 : 0;

      // Pending payouts
      const { data: pendingPayoutData } = await supabase
        .from("payout_requests")
        .select("amount")
        .eq("status", "pending");
      const pendingPayouts = pendingPayoutData?.length || 0;
      const pendingPayoutsAmount = pendingPayoutData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fraud alerts (pending reviews)
      const { count: fraudAlerts } = await supabase
        .from("fraud_flags")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Total creators
      const creatorsResult = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      const totalCreators = creatorsResult.count || 0;

      // Total brands
      const brandsResult = await supabase
        .from("brands")
        .select("*", { count: "exact", head: true });
      const totalBrands = brandsResult.count || 0;

      // Active campaigns
      const { count: activeCampaigns } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Completed payouts today
      const { count: completedPayoutsToday } = await supabase
        .from("payout_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("processed_at", today.toISOString());

      // Average payout amount
      const { data: completedPayouts } = await supabase
        .from("payout_requests")
        .select("amount")
        .eq("status", "completed");
      const avgPayoutAmount = completedPayouts && completedPayouts.length > 0
        ? completedPayouts.reduce((sum, p) => sum + Number(p.amount), 0) / completedPayouts.length
        : 0;

      // Conversion rate (users with payouts / total users)
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      const { data: usersWithPayouts } = await supabase
        .from("payout_requests")
        .select("user_id")
        .eq("status", "completed");
      const uniqueUsersWithPayouts = new Set(usersWithPayouts?.map(p => p.user_id) || []).size;
      const conversionRate = totalUsers && totalUsers > 0
        ? (uniqueUsersWithPayouts / totalUsers) * 100
        : 0;

      // New users today
      const { count: newUsersToday } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Submissions today
      const { count: submissionsToday } = await supabase
        .from("campaign_submissions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      setMetrics({
        totalRevenue,
        revenueChange,
        activeUsers,
        activeUsersChange,
        pendingPayouts,
        pendingPayoutsAmount,
        fraudAlerts: fraudAlerts || 0,
        totalCreators: totalCreators || 0,
        totalBrands: totalBrands || 0,
        activeCampaigns: activeCampaigns || 0,
        completedPayoutsToday: completedPayoutsToday || 0,
        avgPayoutAmount,
        conversionRate,
        newUsersToday: newUsersToday || 0,
        submissionsToday: submissionsToday || 0,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted/30 rounded-xl p-5 border border-border">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted/20 rounded-xl p-4 border border-border">
              <Skeleton className="h-6 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-4">
      {/* Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetric
          label="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          change={{
            value: metrics.revenueChange,
            isPositive: metrics.revenueChange >= 0,
            label: "vs last 7 days",
          }}
        />

        <AdminMetric
          label="Active Users (30d)"
          value={metrics.activeUsers.toLocaleString()}
          change={{
            value: metrics.activeUsersChange,
            isPositive: metrics.activeUsersChange >= 0,
            label: "vs previous 30 days",
          }}
        />

        <AdminAlertMetric
          label="Pending Payouts"
          value={`${metrics.pendingPayouts} ($${metrics.pendingPayoutsAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`}
          severity={metrics.pendingPayouts > 10 ? "warning" : "info"}
        />

        <AdminAlertMetric
          label="Fraud Alerts"
          value={metrics.fraudAlerts}
          severity={metrics.fraudAlerts > 5 ? "critical" : metrics.fraudAlerts > 0 ? "warning" : "info"}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AdminMiniStatCard
          label="Total Creators"
          value={metrics.totalCreators.toLocaleString()}
        />
        <AdminMiniStatCard
          label="Total Brands"
          value={metrics.totalBrands.toLocaleString()}
        />
        <AdminMiniStatCard
          label="Active Campaigns"
          value={metrics.activeCampaigns.toLocaleString()}
        />
        <AdminMiniStatCard
          label="Payouts Today"
          value={metrics.completedPayoutsToday.toLocaleString()}
        />
      </div>

      {/* Tertiary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AdminMiniStatCard
          label="Avg Payout"
          value={`$${metrics.avgPayoutAmount.toFixed(2)}`}
        />
        <AdminMiniStatCard
          label="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
        />
        <AdminMiniStatCard
          label="New Users Today"
          value={metrics.newUsersToday.toLocaleString()}
        />
        <AdminMiniStatCard
          label="Submissions Today"
          value={metrics.submissionsToday.toLocaleString()}
        />
      </div>
    </div>
  );
}
