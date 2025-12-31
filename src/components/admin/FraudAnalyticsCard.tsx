import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] p-6">
        <Skeleton className="h-5 w-48 mb-6 bg-white/5" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      label: "Pending Review",
      value: stats.pendingReviews,
      color: "amber" as const,
      hasDot: stats.pendingReviews > 0,
    },
    {
      label: "Auto-Approved",
      sublabel: "7d",
      value: stats.autoApprovedThisWeek,
      color: "emerald" as const,
    },
    {
      label: "Manual Approved",
      sublabel: "7d",
      value: stats.approvedThisWeek,
      color: "blue" as const,
    },
    {
      label: "Rejected",
      sublabel: "7d",
      value: stats.rejectedThisWeek,
      color: "red" as const,
    },
    {
      label: "Total Flagged",
      value: stats.totalFlagged,
      color: "orange" as const,
    },
    {
      label: "Banned",
      value: stats.creatorsBanned,
      color: "red" as const,
    },
    {
      label: "Clawback Total",
      value: `$${stats.totalClawbackAmount.toFixed(0)}`,
      color: "purple" as const,
    },
  ];

  const colorStyles = {
    amber: {
      bg: "from-amber-500/10 to-amber-500/5",
      text: "text-amber-400",
      dot: "bg-amber-400",
    },
    emerald: {
      bg: "from-emerald-500/10 to-emerald-500/5",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    blue: {
      bg: "from-blue-500/10 to-blue-500/5",
      text: "text-blue-400",
      dot: "bg-blue-400",
    },
    red: {
      bg: "from-red-500/10 to-red-500/5",
      text: "text-red-400",
      dot: "bg-red-400",
    },
    orange: {
      bg: "from-orange-500/10 to-orange-500/5",
      text: "text-orange-400",
      dot: "bg-orange-400",
    },
    purple: {
      bg: "from-purple-500/10 to-purple-500/5",
      text: "text-purple-400",
      dot: "bg-purple-400",
    },
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.04]">
        <h3 className="text-sm font-semibold text-white font-inter tracking-[-0.3px]">
          Fraud Detection Overview
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {statItems.map((item) => {
            const styles = colorStyles[item.color];
            return (
              <div
                key={item.label}
                className={cn(
                  "rounded-xl p-4 transition-all duration-300",
                  "bg-gradient-to-br backdrop-blur-xl",
                  styles.bg,
                  "border border-white/[0.04]",
                  "hover:border-white/[0.08]"
                )}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  {item.hasDot && (
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", styles.dot)} />
                  )}
                  <span className="text-[10px] text-white/50 font-inter font-medium tracking-[-0.2px] leading-tight">
                    {item.label}
                    {item.sublabel && (
                      <span className="text-white/30 ml-1">({item.sublabel})</span>
                    )}
                  </span>
                </div>
                <p className={cn("text-xl font-semibold font-inter tracking-[-0.5px]", styles.text)}>
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
