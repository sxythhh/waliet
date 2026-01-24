"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ChartDataPoint {
  date: string;
  revenue: number;
  purchases: number;
  sessions: number;
}

interface RevenueChartProps {
  data: ChartDataPoint[];
  onPeriodChange?: (period: "daily" | "weekly" | "monthly") => void;
}

export function RevenueChart({ data, onPeriodChange }: RevenueChartProps) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const handlePeriodChange = (newPeriod: "daily" | "weekly" | "monthly") => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === "monthly") {
      return date.toLocaleDateString("en-US", { month: "short" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Revenue</CardTitle>
        <div className="flex gap-1">
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "ghost"}
              onClick={() => handlePeriodChange(p)}
              className="text-xs capitalize"
            >
              {p}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={(value) => formatCents(value)}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={80}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium text-foreground">{formatDate(String(label))}</p>
                        <p className="text-sm text-muted-foreground">
                          Revenue: <span className="font-medium text-primary">{formatCents(payload[0].value as number)}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Purchases: <span className="font-medium">{data.find((d) => d.date === label)?.purchases || 0}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
