import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subWeeks, subMonths } from "date-fns";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export type TimeframeOption = "all_time" | "today" | "this_week" | "last_week" | "this_month" | "last_month";

interface AllProgramsAnalyticsProps {
  brandId: string;
  timeframe?: TimeframeOption;
}

const getDateRange = (timeframe: TimeframeOption): { start: Date; end: Date } | null => {
  const now = new Date();
  switch (timeframe) {
    case "all_time":
      return null;
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "last_week": {
      const lastWeek = subWeeks(now, 1);
      return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    }
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
};

interface StatsData {
  totalViews: number;
  totalPayouts: number;
  effectiveCPM: number;
  viewsLastWeek: number;
  payoutsLastWeek: number;
  viewsChangePercent: number;
  payoutsChangePercent: number;
  totalSubmissions: number;
  approvedSubmissions: number;
}

interface MetricsData {
  date: string;
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

type MetricType = 'views' | 'likes' | 'shares' | 'bookmarks' | 'videos';

const METRIC_COLORS: Record<MetricType, string> = {
  views: '#3b82f6',
  likes: '#ef4444',
  shares: '#22c55e',
  bookmarks: '#f59e0b',
  videos: '#a855f7'
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num);
};

export function AllProgramsAnalytics({ brandId, timeframe = "this_month" }: AllProgramsAnalyticsProps) {
  const [stats, setStats] = useState<StatsData>({
    totalViews: 0,
    totalPayouts: 0,
    effectiveCPM: 0,
    viewsLastWeek: 0,
    payoutsLastWeek: 0,
    viewsChangePercent: 0,
    payoutsChangePercent: 0,
    totalSubmissions: 0,
    approvedSubmissions: 0
  });
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative'>('cumulative');
  const [activeMetrics, setActiveMetrics] = useState<MetricType[]>(['views']);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleMetric = (metric: MetricType) => {
    if (activeMetrics.includes(metric)) {
      if (activeMetrics.length > 1) {
        setActiveMetrics(activeMetrics.filter(m => m !== metric));
      }
    } else {
      setActiveMetrics([...activeMetrics, metric]);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dateRange = getDateRange(timeframe);
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // First get all campaign IDs for this brand
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id')
        .eq('brand_id', brandId);

      const campaignIds = campaignsData?.map(c => c.id) || [];

      if (campaignIds.length === 0) {
        setStats({
          totalViews: 0,
          totalPayouts: 0,
          effectiveCPM: 0,
          viewsLastWeek: 0,
          payoutsLastWeek: 0,
          viewsChangePercent: 0,
          payoutsChangePercent: 0,
          totalSubmissions: 0,
          approvedSubmissions: 0
        });
        setMetricsData([]);
        setIsLoading(false);
        return;
      }

      // Fetch metrics for all campaigns
      let metricsQuery = supabase
        .from('campaign_video_metrics')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('recorded_at', { ascending: true });

      if (dateRange) {
        metricsQuery = metricsQuery
          .gte('recorded_at', dateRange.start.toISOString())
          .lte('recorded_at', dateRange.end.toISOString());
      }

      const [metricsResult, videoSubmissionsResult] = await Promise.all([
        metricsQuery,
        supabase.from('campaign_videos').select('id, status').in('campaign_id', campaignIds)
      ]);

      // Aggregate metrics by date
      const rawMetrics = metricsResult.data || [];
      const metricsByDate = new Map<string, { views: number; likes: number; shares: number; bookmarks: number; videos: number }>();

      rawMetrics.forEach(m => {
        const dateKey = format(new Date(m.recorded_at), 'yyyy-MM-dd');
        const existing = metricsByDate.get(dateKey) || { views: 0, likes: 0, shares: 0, bookmarks: 0, videos: 0 };
        metricsByDate.set(dateKey, {
          views: existing.views + (m.total_views || 0),
          likes: existing.likes + (m.total_likes || 0),
          shares: existing.shares + (m.total_shares || 0),
          bookmarks: existing.bookmarks + (m.total_bookmarks || 0),
          videos: existing.videos + (m.total_videos || 0)
        });
      });

      // Convert to sorted array
      const sortedDates = Array.from(metricsByDate.keys()).sort();
      const formattedMetrics: MetricsData[] = sortedDates.map((dateKey, index) => {
        const data = metricsByDate.get(dateKey)!;
        const prevData = index > 0 ? metricsByDate.get(sortedDates[index - 1]) : null;
        return {
          date: format(new Date(dateKey), 'MMM d'),
          views: data.views,
          likes: data.likes,
          shares: data.shares,
          bookmarks: data.bookmarks,
          videos: data.videos,
          dailyViews: Math.max(0, prevData ? data.views - prevData.views : data.views),
          dailyLikes: Math.max(0, prevData ? data.likes - prevData.likes : data.likes),
          dailyShares: Math.max(0, prevData ? data.shares - prevData.shares : data.shares),
          dailyBookmarks: Math.max(0, prevData ? data.bookmarks - prevData.bookmarks : data.bookmarks),
          dailyVideos: Math.max(0, prevData ? data.videos - prevData.videos : data.videos)
        };
      });

      setMetricsData(formattedMetrics);

      // Calculate totals
      const latestViews = formattedMetrics.length > 0 ? formattedMetrics[formattedMetrics.length - 1].views : 0;
      
      // Get transactions for payouts
      const { data: transactionsData } = await supabase
        .from('wallet_transactions')
        .select('amount, created_at, metadata')
        .eq('type', 'earning');

      // Filter transactions for this brand's campaigns
      const brandTransactions = (transactionsData || []).filter(t => {
        const metadata = t.metadata as any;
        return metadata?.campaign_id && campaignIds.includes(metadata.campaign_id);
      });

      let filteredTransactions = brandTransactions;
      if (dateRange) {
        filteredTransactions = brandTransactions.filter(t => {
          const date = new Date(t.created_at);
          return date >= dateRange.start && date <= dateRange.end;
        });
      }

      const totalPayouts = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const effectiveCPM = latestViews > 0 ? (totalPayouts / latestViews) * 1000 : 0;

      // Calculate week over week changes
      const viewsThisWeek = rawMetrics
        .filter(m => new Date(m.recorded_at) >= oneWeekAgo)
        .reduce((sum, m) => sum + (m.total_views || 0), 0);
      const viewsLastWeekValue = rawMetrics
        .filter(m => {
          const date = new Date(m.recorded_at);
          return date >= twoWeeksAgo && date < oneWeekAgo;
        })
        .reduce((sum, m) => sum + (m.total_views || 0), 0);

      const payoutsThisWeek = brandTransactions
        .filter(t => new Date(t.created_at) >= oneWeekAgo)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const payoutsLastWeek = brandTransactions
        .filter(t => {
          const date = new Date(t.created_at);
          return date >= twoWeeksAgo && date < oneWeekAgo;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const viewsChangePercent = viewsLastWeekValue > 0 
        ? ((viewsThisWeek - viewsLastWeekValue) / viewsLastWeekValue) * 100 
        : 0;
      const payoutsChangePercent = payoutsLastWeek > 0 
        ? ((payoutsThisWeek - payoutsLastWeek) / payoutsLastWeek) * 100 
        : 0;

      // Video Submissions (campaign_videos for pay per post)
      const videoSubmissionsData = videoSubmissionsResult.data || [];
      const totalSubmissions = videoSubmissionsData.length;
      const approvedSubmissions = videoSubmissionsData.filter(s => s.status === 'approved').length;

      setStats({
        totalViews: latestViews,
        totalPayouts,
        effectiveCPM,
        viewsLastWeek: viewsLastWeekValue,
        payoutsLastWeek,
        viewsChangePercent,
        payoutsChangePercent,
        totalSubmissions,
        approvedSubmissions
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [brandId, timeframe]);

  const getChartDataKey = (metric: MetricType) => {
    if (chartMode === 'daily') {
      return `daily${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof MetricsData;
    }
    return metric as keyof MetricsData;
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-lg bg-muted/50 dark:bg-muted/50 space-y-3">
              <Skeleton className="h-4 w-28 dark:bg-muted-foreground/20" />
              <Skeleton className="h-8 w-20 dark:bg-muted-foreground/20" />
              <Skeleton className="h-3 w-24 dark:bg-muted-foreground/20" />
            </div>
          ))}
        </div>
        <div className="p-5 rounded-lg bg-muted/50 dark:bg-muted/50 space-y-4">
          <Skeleton className="h-5 w-40 dark:bg-muted-foreground/20" />
          <Skeleton className="h-64 w-full dark:bg-muted-foreground/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Views Generated</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatNumber(stats.totalViews)}</p>
              <div className={`text-xs px-2 py-1 rounded-full tracking-[-0.5px] ${stats.viewsChangePercent >= 0 ? 'bg-[#173e23] text-[#4ade80]' : 'bg-[#3e1717] text-[#f87171]'}`}>
                {stats.viewsChangePercent >= 0 ? '+' : ''}{stats.viewsChangePercent.toFixed(1)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{formatNumber(stats.viewsLastWeek)} last week</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Effective CPM</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(stats.effectiveCPM)}</p>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">Cost per 1K views</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Total Payouts</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(stats.totalPayouts)}</p>
              <div className={`text-xs px-2 py-1 rounded-full tracking-[-0.5px] ${stats.payoutsChangePercent >= 0 ? 'bg-[#173e23] text-[#4ade80]' : 'bg-[#3e1717] text-[#f87171]'}`}>
                {stats.payoutsChangePercent >= 0 ? '+' : ''}{stats.payoutsChangePercent.toFixed(1)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{formatCurrency(stats.payoutsLastWeek)} last week</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Submissions</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{stats.totalSubmissions}</p>
              <div className="text-xs px-2 py-1 rounded-full tracking-[-0.5px] bg-primary/10 text-primary">
                {stats.approvedSubmissions} approved
              </div>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{stats.totalSubmissions - stats.approvedSubmissions} pending review</p>
          </div>
        </Card>
      </div>

      {/* Metrics Chart */}
      <Card className="p-4 sm:p-5 bg-card/30 border-table-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-5">
          <h3 className="text-sm font-medium tracking-[-0.5px]">Performance Over Time</h3>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8 px-2">
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
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium font-inter tracking-[-0.5px] transition-all ${
                  activeMetrics.includes(metric) ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
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
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium font-inter tracking-[-0.5px] rounded-md transition-all ${
                chartMode === 'daily' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setChartMode('cumulative')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium font-inter tracking-[-0.5px] rounded-md transition-all ${
                chartMode === 'cumulative' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
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
                      <stop offset="5%" stopColor={METRIC_COLORS[metric]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={METRIC_COLORS[metric]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickFormatter={formatNumber} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [formatNumber(value), '']}
                />
                {activeMetrics.map(metric => (
                  <Area
                    key={metric}
                    type="monotone"
                    dataKey={getChartDataKey(metric)}
                    stroke={METRIC_COLORS[metric]}
                    fill={`url(#gradient-${metric})`}
                    strokeWidth={2}
                    name={metric}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No data available for the selected timeframe
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
