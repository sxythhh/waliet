"use client";

import { MdAttachMoney, MdCalendarToday, MdTrendingUp, MdTrendingDown, MdPeople } from "react-icons/md";
import { Card, CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StatsOverviewProps {
  totalRevenue: number;
  revenueChange: number;
  totalSessions: number;
  averageOrderValue: number;
  totalBuyers: number;
}

export function StatsOverview({
  totalRevenue,
  revenueChange,
  totalSessions,
  averageOrderValue,
  totalBuyers,
}: StatsOverviewProps) {
  const stats = [
    {
      label: "Total Revenue",
      value: formatCents(totalRevenue),
      change: revenueChange,
      icon: MdAttachMoney,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      label: "Sessions",
      value: totalSessions.toString(),
      icon: MdCalendarToday,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Avg Order Value",
      value: formatCents(averageOrderValue),
      icon: MdTrendingUp,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      label: "Total Buyers",
      value: totalBuyers.toString(),
      icon: MdPeople,
      iconBg: "bg-muted",
      iconColor: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", stat.iconBg)}>
                <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  {stat.change !== undefined && (
                    <span
                      className={cn(
                        "text-xs flex items-center",
                        stat.change >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {stat.change >= 0 ? (
                        <MdTrendingUp className="h-3 w-3 mr-0.5" />
                      ) : (
                        <MdTrendingDown className="h-3 w-3 mr-0.5" />
                      )}
                      {Math.abs(stat.change).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
