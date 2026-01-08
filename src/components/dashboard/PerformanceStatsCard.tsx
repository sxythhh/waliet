import { DollarSign, Shield, Briefcase, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceStatsCardProps {
  stats: {
    totalEarnings: number;
    trustScore: number;
    campaignsJoined: number;
    approvalRate: number;
  };
  loading?: boolean;
}

export function PerformanceStatsCard({ stats, loading }: PerformanceStatsCardProps) {
  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getApprovalRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-500";
    if (rate >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const statItems = [
    {
      label: "Total Earnings",
      value: `$${stats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      label: "Trust Score",
      value: `${stats.trustScore}`,
      suffix: "/100",
      icon: Shield,
      color: getTrustScoreColor(stats.trustScore),
    },
    {
      label: "Campaigns Joined",
      value: stats.campaignsJoined.toString(),
      icon: Briefcase,
      color: "text-blue-500",
    },
    {
      label: "Approval Rate",
      value: `${stats.approvalRate.toFixed(0)}%`,
      icon: CheckCircle2,
      color: getApprovalRateColor(stats.approvalRate),
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-foreground font-inter tracking-[-0.5px] mb-4">
        Performance
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="bg-muted/50 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <item.icon className={cn("h-3.5 w-3.5", item.color)} />
              <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                {item.label}
              </span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className={cn(
                "text-lg font-semibold font-geist tracking-[-0.5px]",
                loading && "animate-pulse bg-muted rounded w-16 h-6"
              )}>
                {loading ? "" : item.value}
              </span>
              {item.suffix && !loading && (
                <span className="text-xs text-muted-foreground font-geist tracking-[-0.5px]">
                  {item.suffix}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
