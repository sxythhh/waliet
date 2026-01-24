"use client";

import * as React from "react";
import { MdTrendingUp, MdTrendingDown } from "react-icons/md";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type ColorVariant = "default" | "primary" | "success" | "warning" | "destructive";

const colorClasses: Record<ColorVariant, { bg: string; text: string }> = {
  default: { bg: "bg-muted", text: "text-muted-foreground" },
  primary: { bg: "bg-primary/10", text: "text-primary" },
  success: { bg: "bg-success/10", text: "text-success" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive" },
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    label?: string;
  };
  color?: ColorVariant;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = "default",
  className,
}: StatCardProps) {
  const colors = colorClasses[color];
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <Card variant="bordered" className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          {/* Icon in colored circle */}
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
              colors.bg
            )}
          >
            <Icon className={cn("h-5 w-5", colors.text)} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Label */}
            <p className="text-sm text-muted-foreground truncate">{label}</p>

            {/* Value row with optional trend */}
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-2xl font-semibold text-foreground tracking-tight">
                {value}
              </p>

              {/* Trend indicator */}
              {trend && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                    isPositiveTrend
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {isPositiveTrend ? (
                    <MdTrendingUp className="h-3 w-3" />
                  ) : (
                    <MdTrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(trend.value).toFixed(1)}%
                </div>
              )}
            </div>

            {/* Optional trend label */}
            {trend?.label && (
              <p className="text-xs text-muted-foreground mt-1">{trend.label}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { type StatCardProps };
