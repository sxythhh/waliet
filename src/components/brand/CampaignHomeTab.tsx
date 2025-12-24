import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subWeeks, subMonths } from "date-fns";
import { toast } from "sonner";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { ManualMetricsDialog } from "./ManualMetricsDialog";
import { PerformanceChart, MetricsData } from "./PerformanceChart";
import { TopPerformingVideos, VideoData } from "./TopPerformingVideos";

export type TimeframeOption = "all_time" | "today" | "this_week" | "last_week" | "this_month" | "last_month";

interface CampaignHomeTabProps {
  campaignId: string;
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

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const formatCurrency = (num: number) => {
  return '$' + num.toFixed(2);
};

export function CampaignHomeTab({
  campaignId,
  brandId,
  timeframe = "this_month"
}: CampaignHomeTabProps) {
  const { isAdmin } = useAdminCheck();
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
  const [topVideos, setTopVideos] = useState<VideoData[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [brand, setBrand] = useState<{
    collection_name: string | null;
    shortimize_api_key: string | null;
  } | null>(null);
  const [campaignHashtags, setCampaignHashtags] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Reset videos when timeframe changes to prevent stale data
  useEffect(() => {
    setTopVideos([]);
    setTotalVideos(0);
  }, [timeframe]);

  useEffect(() => {
    let isCancelled = false;
    const loadAll = async () => {
      if (isCancelled) return;
      setIsLoading(true);
      try {
        const dateRange = getDateRange(timeframe);
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Build all queries
        const brandQuery = supabase.from('brands').select('collection_name, shortimize_api_key').eq('id', brandId).single();
        const campaignQuery = supabase.from('campaigns').select('hashtags').eq('id', campaignId).single();
        const allTransactionsQuery = supabase.from('wallet_transactions').select('amount, created_at').eq('metadata->>campaign_id', campaignId).eq('type', 'earning');
        const videoSubmissionsQuery = supabase.from('campaign_videos').select('id, status').eq('campaign_id', campaignId);
        
        let metricsRangeQuery = supabase.from('campaign_video_metrics').select('total_views').eq('campaign_id', campaignId).order('recorded_at', { ascending: false }).limit(1);
        if (dateRange) {
          metricsRangeQuery = metricsRangeQuery.gte('recorded_at', dateRange.start.toISOString()).lte('recorded_at', dateRange.end.toISOString());
        }
        
        const metricsThisWeekQuery = supabase.from('campaign_video_metrics').select('total_views').eq('campaign_id', campaignId).gte('recorded_at', oneWeekAgo.toISOString()).order('recorded_at', { ascending: false }).limit(1);
        const metricsLastWeekQuery = supabase.from('campaign_video_metrics').select('total_views').eq('campaign_id', campaignId).gte('recorded_at', twoWeeksAgo.toISOString()).lt('recorded_at', oneWeekAgo.toISOString()).order('recorded_at', { ascending: false }).limit(1);
        
        let chartMetricsQuery = supabase.from('campaign_video_metrics').select('*').eq('campaign_id', campaignId).order('recorded_at', { ascending: true });
        if (dateRange) {
          chartMetricsQuery = chartMetricsQuery.gte('recorded_at', dateRange.start.toISOString()).lte('recorded_at', dateRange.end.toISOString());
        }

        // Execute ALL queries in parallel
        const [brandResult, campaignResult, allTransactionsResult, videoSubmissionsResult, metricsRangeResult, metricsThisWeekResult, metricsLastWeekResult, chartMetricsResult] = await Promise.all([
          brandQuery, campaignQuery, allTransactionsQuery, videoSubmissionsQuery, metricsRangeQuery, metricsThisWeekQuery, metricsLastWeekQuery, chartMetricsQuery
        ]);
        
        if (isCancelled) return;
        
        const brandData = brandResult.data;
        setBrand(brandData);
        setCampaignHashtags(campaignResult.data?.hashtags || []);

        // Process transactions
        const allTransactionsData = allTransactionsResult.data || [];
        let transactionsData = allTransactionsData;
        if (dateRange) {
          transactionsData = allTransactionsData.filter(t => {
            const date = new Date(t.created_at);
            return date >= dateRange.start && date <= dateRange.end;
          });
        }
        
        const payoutsThisWeek = allTransactionsData.filter(t => new Date(t.created_at) >= oneWeekAgo).reduce((sum, t) => sum + (t.amount || 0), 0);
        const payoutsLastWeek = allTransactionsData.filter(t => {
          const date = new Date(t.created_at);
          return date >= twoWeeksAgo && date < oneWeekAgo;
        }).reduce((sum, t) => sum + (t.amount || 0), 0);
        
        const viewsThisWeekValue = metricsThisWeekResult.data?.[0]?.total_views || 0;
        const viewsLastWeekValue = metricsLastWeekResult.data?.[0]?.total_views || 0;
        const viewsChangePercent = viewsLastWeekValue > 0 ? (viewsThisWeekValue - viewsLastWeekValue) / viewsLastWeekValue * 100 : 0;
        const payoutsChangePercent = payoutsLastWeek > 0 ? (payoutsThisWeek - payoutsLastWeek) / payoutsLastWeek * 100 : 0;
        const totalViews = metricsRangeResult.data?.[0]?.total_views || 0;
        const totalPayouts = transactionsData.reduce((sum, t) => sum + (t.amount || 0), 0);
        const effectiveCPM = totalViews > 0 ? totalPayouts / totalViews * 1000 : 0;

        // Process video submissions data
        const videoSubmissionsData = videoSubmissionsResult.data || [];
        const totalSubmissions = videoSubmissionsData.length;
        const approvedSubmissions = videoSubmissionsData.filter(s => s.status === 'approved').length;
        
        setStats({
          totalViews,
          totalPayouts,
          effectiveCPM,
          viewsLastWeek: viewsLastWeekValue,
          payoutsLastWeek,
          viewsChangePercent,
          payoutsChangePercent,
          totalSubmissions,
          approvedSubmissions
        });

        // Process chart metrics
        const rawMetrics = chartMetricsResult.data || [];
        if (rawMetrics.length > 0) {
          const formattedMetrics: MetricsData[] = rawMetrics.map((m, index) => {
            const views = m.total_views || 0;
            const likes = m.total_likes || 0;
            const shares = m.total_shares || 0;
            const bookmarks = m.total_bookmarks || 0;
            const videos = m.total_videos || 0;
            const prevRecord = index > 0 ? rawMetrics[index - 1] : null;
            return {
              date: format(new Date(m.recorded_at), 'MMM d'),
              views,
              likes,
              shares,
              bookmarks,
              videos,
              dailyViews: Math.max(0, prevRecord ? views - (prevRecord.total_views || 0) : views),
              dailyLikes: Math.max(0, prevRecord ? likes - (prevRecord.total_likes || 0) : likes),
              dailyShares: Math.max(0, prevRecord ? shares - (prevRecord.total_shares || 0) : shares),
              dailyBookmarks: Math.max(0, prevRecord ? bookmarks - (prevRecord.total_bookmarks || 0) : bookmarks),
              dailyVideos: Math.max(0, prevRecord ? videos - (prevRecord.total_videos || 0) : videos)
            };
          });
          setMetricsData(formattedMetrics);
        } else {
          setMetricsData([]);
        }
        setIsLoading(false);

        // Load top videos from cached data (non-blocking)
        let videosQuery = supabase.from('cached_campaign_videos').select('*', { count: 'exact' }).eq('campaign_id', campaignId).order('views', { ascending: false }).limit(3);
        if (dateRange) {
          videosQuery = videosQuery.gte('uploaded_at', dateRange.start.toISOString()).lte('uploaded_at', dateRange.end.toISOString());
        }
        
        videosQuery.then(({ data: cachedVideos, count, error }) => {
          if (isCancelled) return;
          if (!error && cachedVideos) {
            const mappedVideos: VideoData[] = cachedVideos.map(v => ({
              ad_id: v.shortimize_video_id,
              username: v.username,
              platform: v.platform,
              ad_link: v.video_url || '',
              uploaded_at: v.uploaded_at || '',
              title: v.title || v.caption || '',
              latest_views: v.views || 0,
              latest_likes: v.likes || 0,
              latest_comments: v.comments || 0,
              latest_shares: v.shares || 0
            }));
            setTopVideos(mappedVideos);
            setTotalVideos(count || 0);
          }
        });
      } catch (error) {
        console.error('Error fetching home data:', error);
        if (!isCancelled) setIsLoading(false);
      }
    };
    loadAll();
    return () => { isCancelled = true; };
  }, [campaignId, brandId, timeframe, refreshKey]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // First sync videos from Shortimize to cache
      const { error: syncError } = await supabase.functions.invoke('sync-campaign-account-videos', {
        body: { campaignId, forceRefresh: true }
      });
      if (syncError) {
        console.error('Video sync error:', syncError);
      }

      // Then sync metrics from cached videos
      const { data, error } = await supabase.functions.invoke('sync-campaign-video-metrics', {
        body: { campaignId }
      });
      if (error) {
        toast.error('Failed to sync metrics: ' + error.message);
        return;
      }
      if (data && !data.success) {
        toast.error('Sync failed: ' + (data.errorMessage || 'Unknown error'));
        return;
      }
      toast.success('Metrics synced successfully');
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Error refreshing metrics:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to refresh metrics');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-lg bg-muted/50 dark:bg-muted/25 space-y-3">
              <Skeleton className="h-4 w-28 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
              <Skeleton className="h-8 w-20 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
              <Skeleton className="h-3 w-24 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
            </div>
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="p-5 rounded-lg bg-muted/50 dark:bg-muted/25 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
            <Skeleton className="h-8 w-8 rounded bg-muted-foreground/15 dark:bg-muted-foreground/30" />
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-7 w-20 rounded-full bg-muted-foreground/15 dark:bg-muted-foreground/30" />
            ))}
          </div>
          <Skeleton className="h-64 w-full bg-muted-foreground/15 dark:bg-muted-foreground/30" />
        </div>
        {/* Videos Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
            <Skeleton className="h-4 w-24 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-lg bg-muted/50 dark:bg-muted/25 flex gap-4">
                <Skeleton className="w-24 h-36 rounded-lg bg-muted-foreground/15 dark:bg-muted-foreground/30" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
                  <Skeleton className="h-4 w-full bg-muted-foreground/15 dark:bg-muted-foreground/30" />
                  <Skeleton className="h-4 w-3/4 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
                  <Skeleton className="h-3 w-20 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
                </div>
              </div>
            ))}
          </div>
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
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatNumber(metricsData.length > 0 ? metricsData[metricsData.length - 1].views : stats.totalViews)}</p>
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

      {/* Metrics Chart - using shared component */}
      <PerformanceChart
        metricsData={metricsData}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        showHashtagsWarning={true}
        hashtagsConfigured={campaignHashtags.length > 0}
        adminControls={isAdmin ? <ManualMetricsDialog campaignId={campaignId} brandId={brandId} onSuccess={handleRefresh} /> : undefined}
      />

      {/* Top Performing Videos - using shared component */}
      <TopPerformingVideos
        videos={topVideos}
        totalVideos={totalVideos}
        hashtagsConfigured={campaignHashtags.length > 0}
        hashtags={campaignHashtags}
      />
    </div>
  );
}
