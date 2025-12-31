"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminMetric, AdminAlertMetric } from "../design-system/AdminMetric";
import { AdminMiniStatCard } from "../design-system/AdminCard";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, Clock, Shield } from "lucide-react";
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

  // Sparkline data
  revenueSparkline: { value: number }[];
  usersSparkline: { value: number }[];
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
      const { count: totalCreators } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "creator");

      // Total brands
      const { count: totalBrands } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "brand");

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

      // Build sparkline data (last 7 days revenue)
      const revenueSparkline: { value: number }[] = [];
      const usersSparkline: { value: number }[] = [];

      for (let i = 6; i >= 0; i--) {
        const dayStart = subDays(today, i);
        const dayEnd = subDays(today, i - 1);

        const dayRevenue = recentEarnings?.filter(e => {
          const date = new Date(e.created_at);
          return date >= dayStart && date < dayEnd;
        }).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

        revenueSparkline.push({ value: dayRevenue });
      }

      // Users sparkline (new users per day)
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", sevenDaysAgo.toISOString());

      for (let i = 6; i >= 0; i--) {
        const dayStart = subDays(today, i);
        const dayEnd = subDays(today, i - 1);

        const dayUsers = recentUsers?.filter(u => {
          const date = new Date(u.created_at);
          return date >= dayStart && date < dayEnd;
        }).length || 0;

        usersSparkline.push({ value: dayUsers });
      }

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
        revenueSparkline,
        usersSparkline,
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
            <div key={i} className="bg-white/[0.03] rounded-xl p-5">
              <Skeleton className="h-4 w-20 mb-3 bg-white/5" />
              <Skeleton className="h-8 w-24 mb-1 bg-white/5" />
              <Skeleton className="h-3 w-16 bg-white/5" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/[0.02] rounded-xl p-4">
              <Skeleton className="h-6 w-12 mb-1 bg-white/5" />
              <Skeleton className="h-3 w-20 bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-4">
      {/* Primary metrics with sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetric
          label="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          change={{
            value: metrics.revenueChange,
            isPositive: metrics.revenueChange >= 0,
            label: "vs last 7 days",
          }}
          sparkline={metrics.revenueSparkline}
          color="green"
          icon={<DollarSign className="h-4 w-4" />}
        />

        <AdminMetric
          label="Active Users (30d)"
          value={metrics.activeUsers.toLocaleString()}
          change={{
            value: metrics.activeUsersChange,
            isPositive: metrics.activeUsersChange >= 0,
            label: "vs previous 30 days",
          }}
          sparkline={metrics.usersSparkline}
          color="blue"
          icon={<Users className="h-4 w-4" />}
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
          color="purple"
        />
        <AdminMiniStatCard
          label="Total Brands"
          value={metrics.totalBrands.toLocaleString()}
          color="cyan"
        />
        <AdminMiniStatCard
          label="Active Campaigns"
          value={metrics.activeCampaigns.toLocaleString()}
        />
        <AdminMiniStatCard
          label="Payouts Today"
          value={metrics.completedPayoutsToday.toLocaleString()}
          color="green"
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
          color="blue"
        />
        <AdminMiniStatCard
          label="New Users Today"
          value={metrics.newUsersToday.toLocaleString()}
          color="green"
        />
        <AdminMiniStatCard
          label="Submissions Today"
          value={metrics.submissionsToday.toLocaleString()}
          color="purple"
        />
      </div>
    </div>
  );
}
