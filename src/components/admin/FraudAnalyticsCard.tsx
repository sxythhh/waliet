import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Users, Ban } from "lucide-react";

interface FraudStats {
  pendingReviews: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  autoApprovedThisWeek: number;
  totalFlagged: number;
  creatorsBanned: number;
  totalClawbackAmount: number;
}

export function FraudAnalyticsCard() {
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

      // Approved this week (after manual review)
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

      // Auto-approved this week (no fraud flags)
      const { count: autoApprovedThisWeek } = await supabase
        .from("submission_payout_requests")
        .select("*", { count: "exact", head: true })
        .eq("auto_approval_status", "approved")
        .is("reviewed_at", null)
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

      setStats({
        pendingReviews: pendingReviews || 0,
        approvedThisWeek: approvedThisWeek || 0,
        rejectedThisWeek: rejectedThisWeek || 0,
        autoApprovedThisWeek: autoApprovedThisWeek || 0,
        totalFlagged: totalFlagged || 0,
        creatorsBanned: creatorsBanned || 0,
        totalClawbackAmount,
      });
    } catch (error) {
      console.error("Error fetching fraud stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      label: "Pending Review",
      value: stats.pendingReviews,
      icon: AlertTriangle,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Auto-Approved (7d)",
      value: stats.autoApprovedThisWeek,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Manual Approved (7d)",
      value: stats.approvedThisWeek,
      icon: Shield,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Rejected (7d)",
      value: stats.rejectedThisWeek,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Total Flagged",
      value: stats.totalFlagged,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Creators Banned",
      value: stats.creatorsBanned,
      icon: Ban,
      color: "text-red-600",
      bgColor: "bg-red-600/10",
    },
    {
      label: "Clawback Total",
      value: `$${stats.totalClawbackAmount.toFixed(0)}`,
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      isAmount: true,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium tracking-[-0.5px] flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Fraud Detection Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className={`${item.bgColor} rounded-lg p-3`}
            >
              <div className="flex items-center gap-2 mb-1">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-xs text-muted-foreground tracking-[-0.5px]">
                  {item.label}
                </span>
              </div>
              <p className={`text-xl font-bold tracking-[-0.5px] ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
