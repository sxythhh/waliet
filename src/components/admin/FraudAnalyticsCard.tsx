import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      label: "Pending Review",
      value: stats.pendingReviews,
      hasDot: stats.pendingReviews > 0,
    },
    {
      label: "Auto-Approved",
      sublabel: "7d",
      value: stats.autoApprovedThisWeek,
    },
    {
      label: "Manual Approved",
      sublabel: "7d",
      value: stats.approvedThisWeek,
    },
    {
      label: "Rejected",
      sublabel: "7d",
      value: stats.rejectedThisWeek,
    },
    {
      label: "Total Flagged",
      value: stats.totalFlagged,
    },
    {
      label: "Banned",
      value: stats.creatorsBanned,
    },
    {
      label: "Clawback Total",
      value: `$${stats.totalClawbackAmount.toFixed(0)}`,
    },
  ];

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground font-inter tracking-[-0.3px]">
          Fraud Detection Overview
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "rounded-xl p-4 transition-all duration-200",
                "bg-muted/30",
                "border border-border",
                "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-1.5 mb-2">
                {item.hasDot && (
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-foreground" />
                )}
                <span className="text-[10px] text-muted-foreground font-inter font-medium tracking-[-0.2px] leading-tight">
                  {item.label}
                  {item.sublabel && (
                    <span className="text-muted-foreground/50 ml-1">({item.sublabel})</span>
                  )}
                </span>
              </div>
              <p className="text-xl font-semibold font-inter tracking-[-0.5px] text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
