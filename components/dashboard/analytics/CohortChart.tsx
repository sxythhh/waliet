"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CohortData {
  month: string;
  totalBuyers: number;
  stillActive: number;
  retention: number;
}

interface CohortChartProps {
  data: CohortData[];
}

export function CohortChart({ data }: CohortChartProps) {
  const formatMonth = (month: string) => {
    const date = new Date(month + "-01");
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  if (data.length === 0 || data.every(d => d.totalBuyers === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Cohort Retention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Not enough data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cohort retention data will appear as you get more buyers
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monthly Cohort Retention</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                domain={[0, 1]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const cohort = data.find((d) => d.month === label);
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium text-foreground">{formatMonth(String(label))} Cohort</p>
                        <p className="text-sm text-muted-foreground">
                          Total: <span className="font-medium">{cohort?.totalBuyers}</span> buyers
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Still Active: <span className="font-medium">{cohort?.stillActive}</span>
                        </p>
                        <p className="text-sm text-primary">
                          Retention: <span className="font-medium">{((cohort?.retention || 0) * 100).toFixed(1)}%</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="retention"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
