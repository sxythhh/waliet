import { useState } from "react";
import { Card } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export interface ActivityData {
  date: string;
  datetime?: string;
  submissions: number;
  creators: number;
  applications: number;
  dailySubmissions: number;
  dailyCreators: number;
  dailyApplications: number;
}

export type ActivityMetricType = 'submissions' | 'creators' | 'applications';

export const ACTIVITY_METRIC_COLORS: Record<ActivityMetricType, string> = {
  submissions: '#06b6d4', // cyan
  creators: '#ec4899',    // pink
  applications: '#f59e0b' // amber
};

interface ActivityChartProps {
  activityData: ActivityData[];
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export function ActivityChart({ activityData }: ActivityChartProps) {
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative'>('cumulative');
  const [activeMetrics, setActiveMetrics] = useState<ActivityMetricType[]>(['submissions']);

  const toggleMetric = (metric: ActivityMetricType) => {
    setActiveMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric) 
        : [...prev, metric]
    );
  };

  const getChartDataKey = (metric: ActivityMetricType) => {
    if (chartMode === 'daily') {
      return `daily${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof ActivityData;
    }
    return metric as keyof ActivityData;
  };

  return (
    <Card className="p-4 sm:p-5 bg-card/30 border-table-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-5">
        <h3 className="text-sm font-medium tracking-[-0.5px]">Activity Over Time</h3>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        {/* Metric Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {(['submissions', 'creators', 'applications'] as ActivityMetricType[]).map(metric => (
            <button
              key={metric}
              onClick={() => toggleMetric(metric)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium font-inter tracking-[-0.5px] transition-all ${
                activeMetrics.includes(metric)
                  ? 'bg-white/10 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="capitalize">{metric}</span>
            </button>
          ))}
        </div>

        {/* Daily/Cumulative Toggle */}
        <div className="flex items-center gap-0 bg-muted/30 rounded-lg p-0.5 self-start sm:self-auto">
          <button
            onClick={() => setChartMode('daily')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium font-inter tracking-[-0.5px] rounded-md transition-all ${
              chartMode === 'daily'
                ? 'bg-white/10 text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setChartMode('cumulative')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium font-inter tracking-[-0.5px] rounded-md transition-all ${
              chartMode === 'cumulative'
                ? 'bg-white/10 text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>

      <div className="h-56 sm:h-72">
        {activityData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={activityData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {(['submissions', 'creators', 'applications'] as ActivityMetricType[]).map(metric => (
                  <linearGradient key={metric} id={`gradient-activity-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACTIVITY_METRIC_COLORS[metric]} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={ACTIVITY_METRIC_COLORS[metric]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 11,
                  fill: 'hsl(var(--muted-foreground))',
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}
                axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.3 }}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 11,
                  fill: 'hsl(var(--muted-foreground))',
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={value => formatNumber(value)}
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const dataPoint = payload[0]?.payload as ActivityData;
                  const displayLabel = dataPoint?.datetime || dataPoint?.date || '';
                  return (
                    <div className="bg-black/80 backdrop-blur-md rounded-lg px-3 py-2.5 shadow-xl min-w-[140px]">
                      <p className="text-xs font-medium font-inter text-white/50 tracking-[-0.5px] mb-2">
                        {displayLabel}
                      </p>
                      <div className="space-y-1.5">
                        {payload.map((entry: any) => {
                          const metricName = String(entry.dataKey)
                            .replace('daily', '')
                            .replace(/([A-Z])/g, ' $1')
                            .trim();
                          return (
                            <div key={entry.dataKey} className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
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
                cursor={{ stroke: '#0e0e0e', strokeWidth: 1 }}
              />
              {activeMetrics.map(metric => (
                <Area
                  key={metric}
                  type="linear"
                  dataKey={getChartDataKey(metric)}
                  name={metric}
                  stroke={ACTIVITY_METRIC_COLORS[metric]}
                  strokeWidth={2}
                  fill={`url(#gradient-activity-${metric})`}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: ACTIVITY_METRIC_COLORS[metric],
                    stroke: '#1a1a1a',
                    strokeWidth: 2
                  }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm tracking-[-0.5px] gap-3">
            <p>No activity data recorded yet</p>
            <p className="text-xs text-center max-w-sm">
              Activity data will appear once submissions are made.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
