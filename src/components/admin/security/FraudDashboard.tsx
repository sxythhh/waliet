"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, AdminStatCard } from "../design-system/AdminCard";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface FraudStats {
  pendingReviews: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  totalFlagged: number;
  creatorsBanned: number;
  totalClawbackAmount: number;
  flagsByType: Array<{ type: string; count: number }>;
  riskDistribution: Array<{ range: string; count: number }>;
}

const FLAG_COLORS: Record<string, string> = {
  velocity: "#f97316",
  engagement: "#3b82f6",
  new_creator: "#a855f7",
  previous_fraud: "#ef4444",
  device: "#22c55e",
  location: "#06b6d4",
  other: "#6b7280",
};

const RISK_COLORS = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];

export function FraudDashboard() {
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString();

      // Pending reviews
      const { count: pendingReviews } = await supabase
        .from("submission_payout_requests")
        .select("*", { count: "exact", head: true })
        .in("auto_approval_status", ["pending_evidence", "pending_review"]);

      // Approved this week
      const { count: approvedThisWeek } = await supabase
        .from("submission_payout_requests")
        .select("*", { count: "exact", head: true })
        .eq("auto_approval_status", "approved")
        .not("reviewed_at", "is", null)
        .gte("reviewed_at", oneWeekAgoStr);

      // Rejected this week
      const { count: rejectedThisWeek } = await supabase
        .from("submission_payout_requests")
        .select("*", { count: "exact", head: true })
        .eq("auto_approval_status", "failed")
        .gte("created_at", oneWeekAgoStr);

      // Total flagged all time
      const { count: totalFlagged } = await supabase
        .from("fraud_flags")
        .select("*", { count: "exact", head: true });

      // Creators banned
      const { count: creatorsBanned } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("banned_at", "is", null);

      // Total clawback amount
      const { data: clawbackData } = await supabase
        .from("creator_fraud_history")
        .select("fraud_amount");

      const totalClawbackAmount = (clawbackData || []).reduce(
        (sum, item) => sum + (Number(item.fraud_amount) || 0),
        0
      );

      // Flags by type
      const { data: flagsData } = await supabase
        .from("fraud_flags")
        .select("flag_type");

      const flagTypeCounts: Record<string, number> = {};
      (flagsData || []).forEach((flag) => {
        flagTypeCounts[flag.flag_type] = (flagTypeCounts[flag.flag_type] || 0) + 1;
      });

      const flagsByType = Object.entries(flagTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Risk distribution (from trust scores)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("trust_score")
        .not("trust_score", "is", null);

      const riskRanges = [
        { range: "0-20", min: 0, max: 20, count: 0 },
        { range: "21-40", min: 21, max: 40, count: 0 },
        { range: "41-60", min: 41, max: 60, count: 0 },
        { range: "61-80", min: 61, max: 80, count: 0 },
        { range: "81-100", min: 81, max: 100, count: 0 },
      ];

      (profilesData || []).forEach((profile) => {
        const score = profile.trust_score || 50;
        const range = riskRanges.find((r) => score >= r.min && score <= r.max);
        if (range) range.count++;
      });

      setStats({
        pendingReviews: pendingReviews || 0,
        approvedThisWeek: approvedThisWeek || 0,
        rejectedThisWeek: rejectedThisWeek || 0,
        totalFlagged: totalFlagged || 0,
        creatorsBanned: creatorsBanned || 0,
        totalClawbackAmount,
        flagsByType,
        riskDistribution: riskRanges.map(({ range, count }) => ({ range, count })),
      });
    } catch (error) {
      console.error("Error fetching fraud stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] rounded-xl p-5">
              <Skeleton className="h-4 w-20 mb-3 bg-white/5" />
              <Skeleton className="h-8 w-24 bg-white/5" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] rounded-xl bg-white/5" />
          <Skeleton className="h-[300px] rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-[#0C0C0C] rounded-xl px-4 py-3 shadow-xl border border-white/5">
        <p className="text-xs text-white font-inter font-semibold">{data.type || data.range}</p>
        <p className="text-sm text-white/70 font-inter">{payload[0].value} items</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Pending Review"
          value={stats.pendingReviews}
          color={stats.pendingReviews > 5 ? "orange" : "default"}
        />
        <AdminStatCard
          label="Approved (7d)"
          value={stats.approvedThisWeek}
          color="green"
        />
        <AdminStatCard
          label="Rejected (7d)"
          value={stats.rejectedThisWeek}
          color="red"
        />
        <AdminStatCard
          label="Total Clawback"
          value={`$${stats.totalClawbackAmount.toLocaleString()}`}
          color="purple"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <AdminStatCard
          label="Total Flags (All Time)"
          value={stats.totalFlagged}
          color="orange"
        />
        <AdminStatCard
          label="Banned Creators"
          value={stats.creatorsBanned}
          color="red"
        />
        <AdminStatCard
          label="Unique Flag Types"
          value={stats.flagsByType.length}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flags by Type */}
        <AdminCard title="Flags by Type" subtitle="Distribution of fraud flag categories">
          <div className="h-[250px]">
            {stats.flagsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.flagsByType} layout="vertical">
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="type"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                    tickFormatter={(value) =>
                      value
                        .split("_")
                        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.flagsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={FLAG_COLORS[entry.type] || FLAG_COLORS.other} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/30 text-sm font-inter">
                No flag data available
              </div>
            )}
          </div>
        </AdminCard>

        {/* Trust Score Distribution */}
        <AdminCard title="Trust Score Distribution" subtitle="User risk levels across the platform">
          <div className="h-[250px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                  stroke="none"
                >
                  {stats.riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[index]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 ml-4">
              {stats.riskDistribution.map((entry, index) => (
                <div key={entry.range} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: RISK_COLORS[index] }}
                  />
                  <span className="text-xs text-white/60 font-inter tracking-[-0.5px]">
                    {entry.range}: {entry.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
