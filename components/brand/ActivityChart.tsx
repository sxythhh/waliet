import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";

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

  // Generate empty placeholder data when no activity exists
  const chartData = useMemo(() => {
    if (activityData.length > 0) return activityData;

    // Generate last 7 days of empty data
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    return days.map(day => ({
      date: format(day, 'MMM d'),
      submissions: 0,
      creators: 0,
      applications: 0,
      dailySubmissions: 0,
      dailyCreators: 0,
      dailyApplications: 0,
    }));
  }, [activityData]);

  // Check if there's no meaningful data (empty array OR all values are 0 for active metrics)
  const hasNoData = useMemo(() => {
    if (activityData.length === 0) return true;

    // Check if all values for the active metrics sum to 0
    const totalForActiveMetrics = activityData.reduce((sum, dataPoint) => {
      return sum + activeMetrics.reduce((metricSum, metric) => {
        const key = getChartDataKey(metric);
        return metricSum + (Number(dataPoint[key]) || 0);
      }, 0);
    }, 0);

    return totalForActiveMetrics === 0;
  }, [activityData, activeMetrics, chartMode]);

  return (
    <Card className="p-4 sm:p-5 bg-card/30 border border-border dark:border-transparent">
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
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium font-inter tracking-[-0.5px] rounded-md transition-all ${
              chartMode === 'daily'
                ? 'bg-[#0a0a0a] dark:bg-[#131313] text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setChartMode('cumulative')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium font-inter tracking-[-0.5px] rounded-md transition-all ${
              chartMode === 'cumulative'
                ? 'bg-[#0a0a0a] dark:bg-[#131313] text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>

      <div className="h-56 sm:h-72 relative">
        {/* No data available floating label */}
        {hasNoData && (
          <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
            <div className="px-2.5 py-1.5 rounded-md bg-muted/90 dark:bg-[#0a0a0a] border border-border/50 flex items-center justify-center">
              <span className="text-[11px] font-medium text-muted-foreground font-inter tracking-[-0.3px] leading-none">
                No data available
              </span>
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
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
                letterSpacing: '-0.5px'
              }}
              axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.3 }}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              animationDuration={100}
              animationEasing="ease-out"
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const dataPoint = payload[0]?.payload as ActivityData;
                const displayLabel = dataPoint?.datetime || dataPoint?.date || '';
                return (
                  <div className="bg-background rounded-lg dark:shadow-lg min-w-[140px] border border-border overflow-hidden">
                    <div className="px-2.5 py-1.5 border-b border-border">
                      <p className="text-xs font-medium font-inter text-foreground tracking-[-0.3px]">
                        {displayLabel}
                      </p>
                    </div>
                    <div className="px-2.5 py-2 space-y-1.5">
                      {payload.map((entry: any) => {
                        const metricName = String(entry.dataKey)
                          .replace('daily', '')
                          .replace(/([A-Z])/g, ' $1')
                          .trim();
                        return (
                          <div key={entry.dataKey} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-xs font-inter text-foreground tracking-[-0.3px] capitalize">
                                {metricName}
                              </span>
                            </div>
                            <span className="text-xs font-semibold font-inter text-foreground tracking-[-0.3px]">
                              {Number(entry.value).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
              wrapperStyle={{ transition: 'transform 150ms ease-out, opacity 150ms ease-out', zIndex: 50 }}
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
                  r: 3.3,
                  fill: ACTIVITY_METRIC_COLORS[metric],
                  stroke: ACTIVITY_METRIC_COLORS[metric],
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
