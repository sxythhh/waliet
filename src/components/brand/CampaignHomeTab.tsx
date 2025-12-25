import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subWeeks, subMonths } from "date-fns";
import { toast } from "sonner";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { ManualMetricsDialog } from "./ManualMetricsDialog";
import { PerformanceChart, MetricsData } from "./PerformanceChart";
import { TopPerformingVideos, VideoData } from "./TopPerformingVideos";
import { ActivityChart, ActivityData } from "./ActivityChart";

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
  paidViews: number;
  unpaidViews: number;
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
    approvedSubmissions: 0,
    paidViews: 0,
    unpaidViews: 0
  });
  const [topVideos, setTopVideos] = useState<VideoData[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [brand, setBrand] = useState<{
    collection_name: string | null;
    shortimize_api_key: string | null;
  } | null>(null);
  const [campaignHashtags, setCampaignHashtags] = useState<string[]>([]);
  const [campaignCollectionName, setCampaignCollectionName] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

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
        const campaignQuery = supabase.from('campaigns').select('hashtags, shortimize_collection_name').eq('id', campaignId).single();
        const allTransactionsQuery = supabase.from('wallet_transactions').select('amount, created_at').eq('metadata->>campaign_id', campaignId).eq('type', 'earning');
        
        // Query video_submissions directly for accurate metrics (refreshed every 8 hours from Shortimize)
        // Include payout_status to calculate paid vs unpaid views directly
        const videoSubmissionsQuery = supabase
          .from('video_submissions')
          .select('id, status, views, likes, comments, shares, bookmarks, submitted_at, payout_status, metrics_updated_at')
          .eq('source_type', 'campaign')
          .eq('source_id', campaignId);
        
        // Query campaign_account_analytics for paid views data (fallback)
        const analyticsQuery = supabase
          .from('campaign_account_analytics')
          .select('total_views, paid_views')
          .eq('campaign_id', campaignId);
        
        let chartMetricsQuery = supabase.from('program_video_metrics').select('*').eq('source_type', 'campaign').eq('source_id', campaignId).order('recorded_at', { ascending: true });
        if (dateRange) {
          chartMetricsQuery = chartMetricsQuery.gte('recorded_at', dateRange.start.toISOString()).lte('recorded_at', dateRange.end.toISOString());
        }

        // Execute ALL queries in parallel
        const [brandResult, campaignResult, allTransactionsResult, videoSubmissionsResult, analyticsResult, chartMetricsResult] = await Promise.all([
          brandQuery, campaignQuery, allTransactionsQuery, videoSubmissionsQuery, analyticsQuery, chartMetricsQuery
        ]);
        
        if (isCancelled) return;
        
        const brandData = brandResult.data;
        setBrand(brandData);
        setCampaignHashtags(campaignResult.data?.hashtags || []);
        setCampaignCollectionName(campaignResult.data?.shortimize_collection_name || null);

        // Process video submissions for stats - get accurate metrics directly from video-level data
        const allSubmissions = (videoSubmissionsResult.data || []) as { 
          id: string; 
          status: string; 
          views: number | null;
          likes: number | null;
          comments: number | null;
          shares: number | null;
          bookmarks: number | null;
          submitted_at: string | null;
          payout_status: string | null;
          metrics_updated_at: string | null;
        }[];
        
        // Get the most recent metrics_updated_at for the sync time display
        const latestSync = allSubmissions
          .filter(s => s.metrics_updated_at)
          .map(s => new Date(s.metrics_updated_at!).getTime())
          .sort((a, b) => b - a)[0];
        setLastSyncedAt(latestSync ? new Date(latestSync).toISOString() : null);
        
        // Filter by date range if needed
        let filteredSubmissions = allSubmissions;
        if (dateRange) {
          filteredSubmissions = allSubmissions.filter(s => {
            if (!s.submitted_at) return false;
            const date = new Date(s.submitted_at);
            return date >= dateRange.start && date <= dateRange.end;
          });
        }
        
        // Calculate totals from approved submissions only
        const approvedSubmissions = filteredSubmissions.filter(s => s.status === 'approved');
        const totalViews = approvedSubmissions.reduce((sum, s) => sum + (s.views || 0), 0);
        const totalLikes = approvedSubmissions.reduce((sum, s) => sum + (s.likes || 0), 0);
        const totalComments = approvedSubmissions.reduce((sum, s) => sum + (s.comments || 0), 0);
        const totalShares = approvedSubmissions.reduce((sum, s) => sum + (s.shares || 0), 0);
        
        // Calculate views from last week for comparison
        const submissionsThisWeek = allSubmissions.filter(s => {
          if (!s.submitted_at || s.status !== 'approved') return false;
          return new Date(s.submitted_at) >= oneWeekAgo;
        });
        const submissionsLastWeek = allSubmissions.filter(s => {
          if (!s.submitted_at || s.status !== 'approved') return false;
          const date = new Date(s.submitted_at);
          return date >= twoWeeksAgo && date < oneWeekAgo;
        });
        
        const viewsThisWeekValue = submissionsThisWeek.reduce((sum, s) => sum + (s.views || 0), 0);
        const viewsLastWeekValue = submissionsLastWeek.reduce((sum, s) => sum + (s.views || 0), 0);

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
        
        const viewsChangePercent = viewsLastWeekValue > 0 ? (viewsThisWeekValue - viewsLastWeekValue) / viewsLastWeekValue * 100 : 0;
        const payoutsChangePercent = payoutsLastWeek > 0 ? (payoutsThisWeek - payoutsLastWeek) / payoutsLastWeek * 100 : 0;
        const totalPayouts = transactionsData.reduce((sum, t) => sum + (t.amount || 0), 0);
        const effectiveCPM = totalViews > 0 ? totalPayouts / totalViews * 1000 : 0;

        // Submission counts
        const totalSubmissionsCount = filteredSubmissions.length;
        const approvedSubmissionsCount = approvedSubmissions.length;
        
        // Calculate paid vs unpaid views directly from video_submissions payout_status
        // This is more reliable than campaign_account_analytics which may not be updated
        const paidSubmissions = approvedSubmissions.filter(s => s.payout_status === 'paid');
        const unpaidSubmissions = approvedSubmissions.filter(s => s.payout_status !== 'paid');
        const totalPaidViews = paidSubmissions.reduce((sum, s) => sum + (s.views || 0), 0);
        const unpaidViews = unpaidSubmissions.reduce((sum, s) => sum + (s.views || 0), 0);
        
        setStats({
          totalViews,
          totalPayouts,
          effectiveCPM,
          viewsLastWeek: viewsLastWeekValue,
          payoutsLastWeek,
          viewsChangePercent,
          payoutsChangePercent,
          totalSubmissions: totalSubmissionsCount,
          approvedSubmissions: approvedSubmissionsCount,
          paidViews: totalPaidViews,
          unpaidViews: unpaidViews
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
              datetime: format(new Date(m.recorded_at), 'MMM d, yyyy h:mm a'),
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
        
        // Calculate activity data (submissions and unique creators over time)
        const activityMap = new Map<string, { submissions: number; creatorIds: Set<string> }>();
        filteredSubmissions.forEach(sub => {
          if (sub.submitted_at) {
            const dateKey = format(new Date(sub.submitted_at), 'yyyy-MM-dd');
            const existing = activityMap.get(dateKey) || { submissions: 0, creatorIds: new Set<string>() };
            existing.submissions += 1;
            // We don't have creator_id in filteredSubmissions here, but we can get it from allSubmissions
            activityMap.set(dateKey, existing);
          }
        });

        // Re-process with creator IDs from full video submissions query
        const activityMapWithCreators = new Map<string, { submissions: number; creatorIds: Set<string> }>();
        const videoSubmissionsForActivity = await supabase
          .from('video_submissions')
          .select('submitted_at, creator_id')
          .eq('source_type', 'campaign')
          .eq('source_id', campaignId);
        
        const activitySubmissions = videoSubmissionsForActivity.data || [];
        let filteredActivitySubmissions = activitySubmissions;
        if (dateRange) {
          filteredActivitySubmissions = activitySubmissions.filter(s => {
            if (!s.submitted_at) return false;
            const date = new Date(s.submitted_at);
            return date >= dateRange.start && date <= dateRange.end;
          });
        }
        
        filteredActivitySubmissions.forEach(sub => {
          if (sub.submitted_at) {
            const dateKey = format(new Date(sub.submitted_at), 'yyyy-MM-dd');
            const existing = activityMapWithCreators.get(dateKey) || { submissions: 0, creatorIds: new Set<string>() };
            existing.submissions += 1;
            if (sub.creator_id) {
              existing.creatorIds.add(sub.creator_id);
            }
            activityMapWithCreators.set(dateKey, existing);
          }
        });

        // Convert to sorted array with cumulative counts
        const sortedActivityDates = Array.from(activityMapWithCreators.entries()).sort((a, b) => 
          new Date(a[0]).getTime() - new Date(b[0]).getTime()
        );
        
        let cumulativeSubmissions = 0;
        const allCreatorIds = new Set<string>();
        const formattedActivityData: ActivityData[] = sortedActivityDates.map(([dateKey, data]) => {
          cumulativeSubmissions += data.submissions;
          data.creatorIds.forEach(id => allCreatorIds.add(id));
          const dateObj = new Date(dateKey);
          return {
            date: format(dateObj, 'MMM d'),
            datetime: format(dateObj, 'MMM d, yyyy'),
            submissions: cumulativeSubmissions,
            creators: allCreatorIds.size,
            dailySubmissions: data.submissions,
            dailyCreators: data.creatorIds.size
          };
        });
        setActivityData(formattedActivityData);
        
        setIsLoading(false);

        // Load top videos from video_submissions sorted by views (non-blocking)
        supabase
          .from('video_submissions')
          .select('id, video_url, platform, views, likes, comments, shares, video_title, video_description, video_upload_date, video_author_username, creator_id', { count: 'exact' })
          .eq('source_type', 'campaign')
          .eq('source_id', campaignId)
          .eq('status', 'approved')
          .order('views', { ascending: false, nullsFirst: false })
          .limit(3)
          .then(async ({ data: submissions, count, error }) => {
            if (isCancelled) return;
            if (!error && submissions && submissions.length > 0) {
              // Fetch usernames for the creators as fallback
              const userIds = [...new Set(submissions.map(s => s.creator_id))];
              const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
              const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
              
              const mappedVideos: VideoData[] = submissions.map(v => ({
                ad_id: v.id,
                username: v.video_author_username || profileMap.get(v.creator_id) || 'Unknown',
                platform: v.platform || 'tiktok',
                ad_link: v.video_url || '',
                uploaded_at: v.video_upload_date || '',
                title: v.video_title || v.video_description || '',
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
      const collectionName = campaignCollectionName || brand?.collection_name;
      if (!collectionName) {
        toast.error('No collection configured for this campaign');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-shortimize-metrics', {
        body: { brandId, collectionName }
      });

      if (error) {
        toast.error('Failed to sync metrics: ' + error.message);
        return;
      }
      if (data && !data.success) {
        toast.error('Sync failed: ' + (data.error || 'Unknown error'));
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
            <div key={i} className="p-4 rounded-lg bg-transparent space-y-3">
              <Skeleton className="h-4 w-28 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
              <Skeleton className="h-8 w-20 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
              <Skeleton className="h-3 w-24 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
            </div>
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="p-5 rounded-lg bg-transparent space-y-4">
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
              <div key={i} className="p-4 rounded-lg bg-transparent flex gap-4">
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
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatNumber((stats.paidViews + stats.unpaidViews) > 0 ? (stats.paidViews + stats.unpaidViews) : (metricsData.length > 0 ? metricsData[metricsData.length - 1].views : stats.totalViews))}</p>
            </div>
            {/* Paid vs Unpaid Progress Bar */}
            {(stats.paidViews > 0 || stats.unpaidViews > 0) && (() => {
              const total = stats.paidViews + stats.unpaidViews;
              const paidPercent = total > 0 ? ((stats.paidViews / total) * 100).toFixed(1) : '0';
              const pendingPercent = total > 0 ? ((stats.unpaidViews / total) * 100).toFixed(1) : '0';
              return (
              <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden flex cursor-pointer gap-0.5">
                        {stats.paidViews > 0 && (
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                            style={{ width: `${paidPercent}%` }}
                          />
                        )}
                        {stats.unpaidViews > 0 && (
                          <div 
                            className="h-full bg-amber-500 transition-all duration-300 rounded-full animate-diagonal-stripes"
                            style={{ 
                              width: `${pendingPercent}%`,
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)',
                              backgroundSize: '8px 8px'
                            }}
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs bg-[#080808] text-white border-0 font-['Inter'] tracking-[-0.5px]">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {formatNumber(stats.paidViews)} paid ({paidPercent}%)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          {formatNumber(stats.unpaidViews)} pending ({pendingPercent}%)
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })()}
            {!(stats.paidViews > 0 || stats.unpaidViews > 0) && (
              <p className="text-xs text-muted-foreground tracking-[-0.5px]">{formatNumber(stats.viewsLastWeek)} last week</p>
            )}
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

      {/* Charts Row - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PerformanceChart
          metricsData={metricsData}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          lastSyncedAt={lastSyncedAt}
        />
        <ActivityChart activityData={activityData} />
      </div>

      {/* Top Performing Videos - using shared component */}
      <TopPerformingVideos
        videos={topVideos}
        totalVideos={totalVideos}
      />
    </div>
  );
}
