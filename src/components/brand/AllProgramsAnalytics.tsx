import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subWeeks, subMonths } from "date-fns";
import { PerformanceChart, MetricsData } from "./PerformanceChart";
export type TimeframeOption = "all_time" | "today" | "this_week" | "last_week" | "this_month" | "last_month";
interface AllProgramsAnalyticsProps {
  brandId: string;
  timeframe?: TimeframeOption;
}
const getDateRange = (timeframe: TimeframeOption): {
  start: Date;
  end: Date;
} | null => {
  const now = new Date();
  switch (timeframe) {
    case "all_time":
      return null;
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    case "this_week":
      return {
        start: startOfWeek(now, {
          weekStartsOn: 1
        }),
        end: endOfWeek(now, {
          weekStartsOn: 1
        })
      };
    case "last_week":
      {
        const lastWeek = subWeeks(now, 1);
        return {
          start: startOfWeek(lastWeek, {
            weekStartsOn: 1
          }),
          end: endOfWeek(lastWeek, {
            weekStartsOn: 1
          })
        };
      }
    case "this_month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case "last_month":
      {
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      }
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
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
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};
const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
};
const formatTimeframeLabel = (timeframe: TimeframeOption): string => {
  const dateRange = getDateRange(timeframe);
  if (!dateRange) {
    return "All time";
  }
  const {
    start,
    end
  } = dateRange;

  // If same day, just show one date
  if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
    return format(start, 'MMMM d');
  }

  // If same month and year, show "Month d - d"
  if (format(start, 'MMMM yyyy') === format(end, 'MMMM yyyy')) {
    return `${format(start, 'MMMM d')} - ${format(end, 'd')}`;
  }

  // Different months, show full dates
  return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d')}`;
};
export function AllProgramsAnalytics({
  brandId,
  timeframe = "this_month"
}: AllProgramsAnalyticsProps) {
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

      // Fetch all campaign and boost IDs for this brand
      const [campaignsData, boostsData] = await Promise.all([supabase.from('campaigns').select('id').eq('brand_id', brandId), supabase.from('bounty_campaigns').select('id').eq('brand_id', brandId)]);
      const campaignIds = campaignsData.data?.map(c => c.id) || [];
      const boostIds = boostsData.data?.map(b => b.id) || [];
      if (campaignIds.length === 0 && boostIds.length === 0) {
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

      // Fetch metrics from unified program_video_metrics table
      let metricsQuery = supabase.from('program_video_metrics').select('*').eq('brand_id', brandId).order('recorded_at', {
        ascending: true
      });
      if (dateRange) {
        metricsQuery = metricsQuery.gte('recorded_at', dateRange.start.toISOString()).lte('recorded_at', dateRange.end.toISOString());
      }

      // Fetch video submissions from unified table
      const [metricsResult, videoSubmissionsResult] = await Promise.all([metricsQuery, supabase.from('video_submissions').select('id, status, views, likes, comments, shares, bookmarks').eq('brand_id', brandId)]);

      // Aggregate metrics by date - taking only the LATEST record per source per day
      const rawMetrics = metricsResult.data || [];

      // First, group by source_id + date and keep only the latest record per source per day
      const latestBySourceAndDate = new Map<string, typeof rawMetrics[0]>();
      rawMetrics.forEach(m => {
        const dateKey = format(new Date(m.recorded_at), 'yyyy-MM-dd');
        const sourceKey = `${m.source_type}_${m.source_id}_${dateKey}`;
        const existing = latestBySourceAndDate.get(sourceKey);

        // Keep the record with the latest recorded_at timestamp
        if (!existing || new Date(m.recorded_at) > new Date(existing.recorded_at)) {
          latestBySourceAndDate.set(sourceKey, m);
        }
      });

      // Now aggregate the latest records by date (summing across different sources)
      const metricsByDate = new Map<string, {
        views: number;
        likes: number;
        shares: number;
        bookmarks: number;
        videos: number;
      }>();
      latestBySourceAndDate.forEach(m => {
        const dateKey = format(new Date(m.recorded_at), 'yyyy-MM-dd');
        const existing = metricsByDate.get(dateKey) || {
          views: 0,
          likes: 0,
          shares: 0,
          bookmarks: 0,
          videos: 0
        };
        metricsByDate.set(dateKey, {
          views: existing.views + (m.total_views || 0),
          likes: existing.likes + (m.total_likes || 0),
          shares: existing.shares + (m.total_shares || 0),
          bookmarks: existing.bookmarks + (m.total_bookmarks || 0),
          videos: existing.videos + (m.total_videos || 0)
        });
      });

      // If no historical metrics, calculate from current video submissions
      if (metricsByDate.size === 0 && videoSubmissionsResult.data) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const totals = videoSubmissionsResult.data.reduce((acc, v) => ({
          views: acc.views + (v.views || 0),
          likes: acc.likes + (v.likes || 0),
          comments: acc.comments + (v.comments || 0),
          shares: acc.shares + (v.shares || 0),
          bookmarks: acc.bookmarks + (v.bookmarks || 0),
          videos: acc.videos + 1
        }), {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          bookmarks: 0,
          videos: 0
        });
        metricsByDate.set(today, {
          views: totals.views,
          likes: totals.likes,
          shares: totals.shares,
          bookmarks: totals.bookmarks,
          videos: totals.videos
        });
      }

      // Convert to sorted array
      const sortedDates = Array.from(metricsByDate.keys()).sort();
      const formattedMetrics: MetricsData[] = sortedDates.map((dateKey, index) => {
        const data = metricsByDate.get(dateKey)!;
        const prevData = index > 0 ? metricsByDate.get(sortedDates[index - 1]) : null;
        const dateObj = new Date(dateKey);
        return {
          date: format(dateObj, 'MMM d'),
          datetime: format(dateObj, 'MMM d, yyyy h:mm a'),
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

      // Calculate totals from video submissions
      const videoSubmissionsData = videoSubmissionsResult.data || [];
      const latestViews = videoSubmissionsData.reduce((sum, v) => sum + (v.views || 0), 0);
      const totalSubmissions = videoSubmissionsData.length;
      const approvedSubmissions = videoSubmissionsData.filter(s => s.status === 'approved').length;

      // Get transactions for payouts - filter at DB level to avoid 1000 row limit issues
      // Build OR conditions for campaign and boost IDs
      const allProgramIds = [...campaignIds.map(id => `metadata->>campaign_id.eq.${id}`), ...boostIds.map(id => `metadata->>boost_id.eq.${id}`)];
      let brandTransactions: {
        amount: number;
        created_at: string;
      }[] = [];
      if (allProgramIds.length > 0) {
        // Fetch transactions for each program in batches to avoid hitting limits
        const transactionPromises = [];

        // Fetch campaign transactions
        for (const campaignId of campaignIds) {
          transactionPromises.push(supabase.from('wallet_transactions').select('amount, created_at').eq('type', 'earning').eq('metadata->>campaign_id', campaignId));
        }

        // Fetch boost transactions
        for (const boostId of boostIds) {
          transactionPromises.push(supabase.from('wallet_transactions').select('amount, created_at').eq('type', 'earning').eq('metadata->>boost_id', boostId));
        }
        const transactionResults = await Promise.all(transactionPromises);
        brandTransactions = transactionResults.flatMap(r => r.data || []);
      }
      let filteredTransactions = brandTransactions;
      if (dateRange) {
        filteredTransactions = brandTransactions.filter(t => {
          const date = new Date(t.created_at);
          return date >= dateRange.start && date <= dateRange.end;
        });
      }
      const totalPayouts = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const effectiveCPM = latestViews > 0 ? totalPayouts / latestViews * 1000 : 0;

      // Calculate week over week changes
      const viewsThisWeek = rawMetrics.filter(m => new Date(m.recorded_at) >= oneWeekAgo).reduce((sum, m) => sum + (m.total_views || 0), 0);
      const viewsLastWeekValue = rawMetrics.filter(m => {
        const date = new Date(m.recorded_at);
        return date >= twoWeeksAgo && date < oneWeekAgo;
      }).reduce((sum, m) => sum + (m.total_views || 0), 0);
      const payoutsThisWeek = brandTransactions.filter(t => new Date(t.created_at) >= oneWeekAgo).reduce((sum, t) => sum + (t.amount || 0), 0);
      const payoutsLastWeek = brandTransactions.filter(t => {
        const date = new Date(t.created_at);
        return date >= twoWeeksAgo && date < oneWeekAgo;
      }).reduce((sum, t) => sum + (t.amount || 0), 0);
      const viewsChangePercent = viewsLastWeekValue > 0 ? (viewsThisWeek - viewsLastWeekValue) / viewsLastWeekValue * 100 : 0;
      const payoutsChangePercent = payoutsLastWeek > 0 ? (payoutsThisWeek - payoutsLastWeek) / payoutsLastWeek * 100 : 0;
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
  if (isLoading) {
    return <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="p-4 rounded-lg bg-transparent space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>)}
        </div>
        <div className="p-5 rounded-lg bg-transparent space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>;
  }
  return <div className="p-4 space-y-4">
      {/* Date Range Label */}
      <p className="text-sm text-muted-foreground font-['Geist'] tracking-[-0.3px]">
        {formatTimeframeLabel(timeframe)}
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="font-medium text-foreground tracking-[-0.5px] text-xs">Views Generated</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatNumber(stats.totalViews)}</p>
              
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{formatNumber(stats.viewsLastWeek)} last week</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="font-medium text-foreground tracking-[-0.5px] text-xs">Effective CPM</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(stats.effectiveCPM)}</p>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">Cost per 1K views</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="font-medium text-foreground tracking-[-0.5px] text-xs">Total Payouts</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(stats.totalPayouts)}</p>
              
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{formatCurrency(stats.payoutsLastWeek)} last week</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="font-medium text-foreground tracking-[-0.5px] text-xs">Submissions</p>
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
      <PerformanceChart metricsData={metricsData} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
    </div>;
}