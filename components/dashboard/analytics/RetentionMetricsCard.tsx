"use client";

import { MdRepeat, MdTimer, MdTrendingDown, MdCheckCircle } from "react-icons/md";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents, cn } from "@/lib/utils";

interface RetentionMetrics {
  repeatBuyerRate: number;
  averageRepurchaseTimeDays: number | null;
  buyerChurnRate: number;
  sessionCompletionRate: number;
  rebookingRate: number;
  buyerLifetimeValue: {
    average: number;
    median: number;
    top10Percent: number;
  };
}

interface RetentionMetricsCardProps {
  metrics: RetentionMetrics;
}

export function RetentionMetricsCard({ metrics }: RetentionMetricsCardProps) {
  const stats = [
    {
      label: "Repeat Buyer Rate",
      value: `${(metrics.repeatBuyerRate * 100).toFixed(1)}%`,
      description: "Buyers who purchased more than once",
      icon: MdRepeat,
      color: "text-primary",
    },
    {
      label: "Avg Repurchase Time",
      value: metrics.averageRepurchaseTimeDays
        ? `${Math.round(metrics.averageRepurchaseTimeDays)} days`
        : "N/A",
      description: "Average time between purchases",
      icon: MdTimer,
      color: "text-warning",
    },
    {
      label: "Session Completion",
      value: `${(metrics.sessionCompletionRate * 100).toFixed(1)}%`,
      description: "Sessions completed successfully",
      icon: MdCheckCircle,
      color: "text-success",
    },
    {
      label: "Churn Rate",
      value: `${(metrics.buyerChurnRate * 100).toFixed(1)}%`,
      description: "Buyers inactive for 90+ days",
      icon: MdTrendingDown,
      color: "text-destructive",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Retention Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="flex items-center gap-2">
                <stat.icon className={cn("h-4 w-4", stat.color)} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Buyer Lifetime Value</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Average</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCents(metrics.buyerLifetimeValue.average)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Median</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCents(metrics.buyerLifetimeValue.median)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top 10%</p>
              <p className="text-lg font-semibold text-primary">
                {formatCents(metrics.buyerLifetimeValue.top10Percent)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
