"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format, addHours, subDays, eachDayOfInterval } from "date-fns";

export interface MetricsData {
  date: string;
  datetime?: string;
  views: number;
  likes: number;
  shares: number;
  bookmarks: number;
  videos: number;
  dailyViews: number;
  dailyLikes: number;
  dailyShares: number;
  dailyBookmarks: number;
  dailyVideos: number;
  spent?: number;
  creators?: number;
}

export type MetricType = 'views' | 'likes' | 'shares' | 'bookmarks' | 'videos' | 'spent' | 'creators';

export const METRIC_COLORS: Record<MetricType, string> = {
  views: '#3b82f6',
  likes: '#ef4444',
  shares: '#22c55e',
  bookmarks: '#f59e0b',
  videos: '#a855f7',
  spent: '#22c55e',
  creators: '#ec4899'
};

interface PerformanceChartProps {
  metricsData: MetricsData[];
  isRefreshing: boolean;
  onRefresh: () => void;
  lastSyncedAt?: string | null;
  defaultMetric?: MetricType;
  singleMetricMode?: boolean;
  title?: string;
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const getNextSyncTime = (lastSyncedAt: string | null | undefined): string => {
  if (!lastSyncedAt) return 'Unknown';
  const lastSync = new Date(lastSyncedAt);
  const nextSync = addHours(lastSync, 4);
  const now = new Date();

  if (nextSync <= now) {
    return 'Soon';
  }

  return format(nextSync, 'h:mm a');
};

export function PerformanceChart({
  metricsData,
  isRefreshing,
  onRefresh,
  lastSyncedAt,
  defaultMetric = 'views',
  singleMetricMode = false,
  title = 'Performance Over Time'
}: PerformanceChartProps) {
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative'>('cumulative');
  const [activeMetrics, setActiveMetrics] = useState<MetricType[]>([defaultMetric]);

  useEffect(() => {
    setActiveMetrics([defaultMetric]);
  }, [defaultMetric]);

  const toggleMetric = (metric: MetricType) => {
    setActiveMetrics(prev => prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]);
  };

  const getChartDataKey = (metric: MetricType) => {
    if (metric === 'spent' || metric === 'creators') {
      return metric as keyof MetricsData;
    }
    if (chartMode === 'daily') {
      return `daily${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof MetricsData;
    }
    return metric as keyof MetricsData;
  };

  const nextSync = getNextSyncTime(lastSyncedAt);

  const chartData = useMemo(() => {
    if (metricsData.length > 0) return metricsData;

    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    return days.map(day => ({
      date: format(day, 'MMM d'),
      views: 0,
      likes: 0,
      shares: 0,
      bookmarks: 0,
      videos: 0,
      dailyViews: 0,
      dailyLikes: 0,
      dailyShares: 0,
      dailyBookmarks: 0,
      dailyVideos: 0,
    }));
  }, [metricsData]);

  const hasNoData = useMemo(() => {
    if (metricsData.length === 0) return true;

    const totalForActiveMetrics = metricsData.reduce((sum, dataPoint) => {
      return sum + activeMetrics.reduce((metricSum, metric) => {
        const key = getChartDataKey(metric);
        return metricSum + (Number(dataPoint[key]) || 0);
      }, 0);
    }, 0);

    return totalForActiveMetrics === 0;
  }, [metricsData, activeMetrics, chartMode]);

  return (
    <Card className="p-4 sm:p-5 bg-card/30 border border-border dark:border-transparent">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-5">
        <h3 className="text-sm font-medium tracking-[-0.5px]">{title}</h3>
        <div className="flex items-center gap-3">
          {lastSyncedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="tracking-[-0.5px]">Next sync: {nextSync}</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isRefreshing} className="h-8 px-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Controls Row */}
      {!singleMetricMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
          {/* Metric Toggles */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {(['views', 'likes', 'shares', 'bookmarks', 'videos'] as MetricType[]).map(metric => (
              <button
                key={metric}
                onClick={() => toggleMetric(metric)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium tracking-[-0.5px] transition-all ${
                  activeMetrics.includes(metric)
                    ? 'bg-[#0a0a0a] dark:bg-[#131313] text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="capitalize">{metric}</span>
              </button>
            ))}
          </div>

          {/* Daily/Cumulative Toggle */}
          <div className="flex items-center gap-0 bg-transparent rounded-lg p-0.5 self-start sm:self-auto">
            <button
              onClick={() => setChartMode('daily')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium tracking-[-0.5px] rounded-md transition-all ${
                chartMode === 'daily'
                  ? 'bg-[#0a0a0a] dark:bg-[#131313] text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setChartMode('cumulative')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium tracking-[-0.5px] rounded-md transition-all ${
                chartMode === 'cumulative'
                  ? 'bg-[#0a0a0a] dark:bg-[#131313] text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cumulative
            </button>
          </div>
        </div>
      )}

      <div className="h-56 sm:h-72 relative">
        <style>{`
          .recharts-cartesian-grid-vertical {
            mask-image: linear-gradient(to bottom, transparent 0%, black 60%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 60%);
          }
        `}</style>
        {/* Watermark */}
        <span className="absolute top-2 right-3 font-bold text-white/10 text-sm tracking-[-0.5px] pointer-events-none z-10">
          WALIET
        </span>
        {/* No data available floating label */}
        {hasNoData && (
          <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
            <div className="px-2.5 py-1.5 rounded-md bg-muted/90 dark:bg-[#0a0a0a] border border-border/50 flex items-center justify-center">
              <span className="text-[11px] font-medium text-muted-foreground tracking-[-0.3px] leading-none">
                No data available
              </span>
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {(['views', 'likes', 'shares', 'bookmarks', 'videos', 'spent', 'creators'] as MetricType[]).map(metric => (
                <linearGradient key={metric} id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={METRIC_COLORS[metric]} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={METRIC_COLORS[metric]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="0"
              stroke="hsl(var(--border))"
              strokeOpacity={0.4}
              vertical={true}
              horizontal={false}
            />
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 11,
                fill: 'hsl(var(--muted-foreground))',
                fontFamily: 'Inter',
              }}
              axisLine={{
                stroke: 'hsl(var(--border))',
                strokeOpacity: 0.3
              }}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              animationDuration={100}
              animationEasing="ease-out"
              wrapperStyle={{ zIndex: 50 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const dataPoint = payload[0]?.payload as MetricsData;
                const displayLabel = dataPoint?.datetime || dataPoint?.date || '';
                return (
                  <div className="bg-background rounded-lg dark:shadow-lg min-w-[140px] border border-border overflow-hidden z-[50]">
                    <div className="px-2.5 py-1.5 border-b border-border">
                      <p className="text-xs font-medium text-foreground tracking-[-0.3px]">
                        {displayLabel}
                      </p>
                    </div>
                    <div className="px-2.5 py-2 space-y-1.5">
                      {payload.map((entry: any) => {
                        const metricName = String(entry.dataKey).replace('daily', '').replace(/([A-Z])/g, ' $1').trim();
                        const isSpent = entry.dataKey === 'spent';
                        const formattedValue = isSpent
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(entry.value))
                          : Number(entry.value).toLocaleString();
                        return (
                          <div key={entry.dataKey} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-xs text-foreground tracking-[-0.3px] capitalize">
                                {metricName}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-foreground tracking-[-0.3px]">
                              {formattedValue}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />
            {activeMetrics.map(metric => (
              <Area
                key={metric}
                type="linear"
                dataKey={getChartDataKey(metric)}
                name={metric}
                stroke={METRIC_COLORS[metric]}
                strokeWidth={2}
                fill={`url(#gradient-${metric})`}
                dot={false}
                activeDot={{
                  r: 3.3,
                  fill: METRIC_COLORS[metric],
                  stroke: METRIC_COLORS[metric],
                  strokeWidth: 0
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
