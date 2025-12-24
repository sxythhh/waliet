import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export interface MetricsData {
  date: string;
  datetime?: string; // Full datetime for tooltip
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
}

export type MetricType = 'views' | 'likes' | 'shares' | 'bookmarks' | 'videos';

export const METRIC_COLORS: Record<MetricType, string> = {
  views: '#3b82f6',
  likes: '#ef4444',
  shares: '#22c55e',
  bookmarks: '#f59e0b',
  videos: '#a855f7'
};

interface PerformanceChartProps {
  metricsData: MetricsData[];
  isRefreshing: boolean;
  onRefresh: () => void;
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export function PerformanceChart({
  metricsData,
  isRefreshing,
  onRefresh
}: PerformanceChartProps) {
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative'>('cumulative');
  const [activeMetrics, setActiveMetrics] = useState<MetricType[]>(['views']);

  const toggleMetric = (metric: MetricType) => {
    setActiveMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const getChartDataKey = (metric: MetricType) => {
    if (chartMode === 'daily') {
      return `daily${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof MetricsData;
    }
    return metric as keyof MetricsData;
  };

  return (
    <Card className="p-4 sm:p-5 bg-card/30 border-table-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-5">
        <h3 className="text-sm font-medium tracking-[-0.5px]">Performance Over Time</h3>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isRefreshing} className="h-8 px-2">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        {/* Metric Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {(['views', 'likes', 'shares', 'bookmarks', 'videos'] as MetricType[]).map(metric => (
            <button 
              key={metric} 
              onClick={() => toggleMetric(metric)} 
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium font-inter tracking-[-0.5px] transition-all ${activeMetrics.includes(metric) ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <div 
                className={`w-2 h-2 rounded-full transition-opacity ${activeMetrics.includes(metric) ? 'opacity-100' : 'opacity-40'}`} 
                style={{ backgroundColor: METRIC_COLORS[metric] }} 
              />
              <span className="capitalize">{metric}</span>
            </button>
          ))}
        </div>

        {/* Daily/Cumulative Toggle */}
        <div className="flex items-center gap-0 bg-muted/30 rounded-lg p-0.5 self-start sm:self-auto">
          <button 
            onClick={() => setChartMode('daily')} 
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium font-inter tracking-[-0.5px] rounded-md transition-all ${chartMode === 'daily' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Daily
          </button>
          <button 
            onClick={() => setChartMode('cumulative')} 
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium font-inter tracking-[-0.5px] rounded-md transition-all ${chartMode === 'cumulative' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Cumulative
          </button>
        </div>
      </div>

      <div className="h-56 sm:h-72">
        {metricsData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metricsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {(['views', 'likes', 'shares', 'bookmarks', 'videos'] as MetricType[]).map(metric => (
                  <linearGradient key={metric} id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={METRIC_COLORS[metric]} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={METRIC_COLORS[metric]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'Inter', letterSpacing: '-0.5px' }} 
                axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.3 }} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'Inter', letterSpacing: '-0.5px' }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={value => formatNumber(value)} 
                width={50} 
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  // Use datetime if available, otherwise fall back to date
                  const dataPoint = payload[0]?.payload as MetricsData;
                  const displayLabel = dataPoint?.datetime || dataPoint?.date || '';
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2.5 shadow-lg min-w-[140px]">
                      <p className="text-sm font-medium font-inter text-foreground tracking-[-0.5px] mb-2">{displayLabel}</p>
                      <div className="space-y-1.5">
                        {payload.map((entry: any) => {
                          const metricName = String(entry.dataKey).replace('daily', '').replace(/([A-Z])/g, ' $1').trim();
                          return (
                            <div key={entry.dataKey} className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs font-inter text-foreground tracking-[-0.5px] capitalize">
                                  {metricName}
                                </span>
                              </div>
                              <span className="text-xs font-medium font-inter text-foreground tracking-[-0.5px]">
                                {Number(entry.value).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }} 
                cursor={{ stroke: '#666666', strokeWidth: 1 }} 
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
                  activeDot={{ r: 5, fill: METRIC_COLORS[metric], stroke: '#1a1a1a', strokeWidth: 2 }} 
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm tracking-[-0.5px] gap-3">
            <p>No metrics data recorded yet</p>
            <p className="text-xs text-center max-w-sm">Metrics are synced automatically every 4 hours. Click the refresh button to sync now.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
