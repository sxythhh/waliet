import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subWeeks, subMonths } from "date-fns";
import { toast } from "sonner";
import { PerformanceChart, MetricsData } from "./PerformanceChart";
import { TopPerformingVideos, VideoData } from "./TopPerformingVideos";
import { BudgetProgressCard } from "./BudgetProgressCard";
import { ActivityChart, ActivityData } from "./ActivityChart";
export type TimeframeOption = "all_time" | "today" | "this_week" | "last_week" | "this_month" | "last_month";
interface Boost {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  budget: number | null;
  budget_used: number | null;
  brand_id: string;
}
interface BoostHomeTabProps {
  boost: Boost;
  timeframe?: TimeframeOption;
  onTopUp: () => void;
}
interface StatsData {
  totalPayouts: number;
  payoutsLastWeek: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  rejectedSubmissions: number;
  acceptedCreators: number;
  maxCreators: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalBookmarks: number;
  cpm: number;
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
      return null;
  }
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
  if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
    return format(start, 'MMMM d');
  }
  if (format(start, 'MMMM yyyy') === format(end, 'MMMM yyyy')) {
    return `${format(start, 'MMMM d')} - ${format(end, 'd')}`;
  }
  return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d')}`;
};
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
export function BoostHomeTab({
  boost,
  timeframe = "this_month",
  onTopUp
}: BoostHomeTabProps) {
  const [stats, setStats] = useState<StatsData>({
    totalPayouts: 0,
    payoutsLastWeek: 0,
    totalSubmissions: 0,
    approvedSubmissions: 0,
    pendingSubmissions: 0,
    rejectedSubmissions: 0,
    acceptedCreators: boost.accepted_creators_count,
    maxCreators: boost.max_accepted_creators,
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    totalBookmarks: 0,
    cpm: 0
  });
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [topVideos, setTopVideos] = useState<VideoData[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  useEffect(() => {
    let isCancelled = false;
    const loadData = async () => {
      if (isCancelled) return;
      setIsLoading(true);
      try {
        const dateRange = getDateRange(timeframe);
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Fetch video submissions for this boost from unified table with metrics
        const {
          data: submissions
        } = await supabase.from('video_submissions').select('id, status, payout_amount, submitted_at, video_url, platform, creator_id, views, likes, shares, bookmarks, comments, video_title, video_thumbnail_url, video_author_username, video_description, metrics_updated_at').eq('source_type', 'boost').eq('source_id', boost.id);

        // Fetch wallet transactions for payouts
        const {
          data: transactions
        } = await supabase.from('wallet_transactions').select('amount, created_at').eq('metadata->>boost_id', boost.id).eq('type', 'earning');
        if (isCancelled) return;
        const submissionsData = submissions || [];
        const transactionsData = transactions || [];

        // Filter submissions by date range if applicable (based on submitted_at)
        let filteredSubmissions = submissionsData;
        if (dateRange) {
          filteredSubmissions = submissionsData.filter(s => {
            if (!s.submitted_at) return false;
            const date = new Date(s.submitted_at);
            return date >= dateRange.start && date <= dateRange.end;
          });
        }

        // Filter transactions by date range if applicable
        let filteredTransactions = transactionsData;
        if (dateRange) {
          filteredTransactions = transactionsData.filter(t => {
            const date = new Date(t.created_at);
            return date >= dateRange.start && date <= dateRange.end;
          });
        }

        // Calculate stats from filtered data
        const totalPayouts = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const payoutsLastWeek = transactionsData.filter(t => new Date(t.created_at) >= oneWeekAgo).reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalSubmissions = filteredSubmissions.length;
        const approvedSubmissions = filteredSubmissions.filter(s => s.status === 'approved').length;
        const pendingSubmissions = filteredSubmissions.filter(s => s.status === 'pending').length;
        const rejectedSubmissions = filteredSubmissions.filter(s => s.status === 'rejected').length;

        // Calculate total metrics from filtered submissions
        const totalViews = filteredSubmissions.reduce((sum, s) => sum + (Number(s.views) || 0), 0);
        const totalLikes = filteredSubmissions.reduce((sum, s) => sum + (Number(s.likes) || 0), 0);
        const totalShares = filteredSubmissions.reduce((sum, s) => sum + (Number(s.shares) || 0), 0);
        const totalBookmarks = filteredSubmissions.reduce((sum, s) => sum + (Number(s.bookmarks) || 0), 0);

        // Calculate CPM (Cost Per Mille - cost per 1000 views)
        const cpm = totalViews > 0 ? totalPayouts / totalViews * 1000 : 0;
        setStats({
          totalPayouts,
          payoutsLastWeek,
          totalSubmissions,
          approvedSubmissions,
          pendingSubmissions,
          rejectedSubmissions,
          acceptedCreators: boost.accepted_creators_count,
          maxCreators: boost.max_accepted_creators,
          totalViews,
          totalLikes,
          totalShares,
          totalBookmarks,
          cpm
        });

        // Get the most recent metrics_updated_at for the sync time display
        const latestSync = submissionsData.filter(s => s.metrics_updated_at).map(s => new Date(s.metrics_updated_at!).getTime()).sort((a, b) => b - a)[0];
        setLastSyncedAt(latestSync ? new Date(latestSync).toISOString() : null);

        // Build metrics data from filtered submissions (grouped by date) with actual view data
        const metricsMap = new Map<string, {
          views: number;
          likes: number;
          shares: number;
          bookmarks: number;
          videos: number;
        }>();
        filteredSubmissions.forEach(sub => {
          if (sub.submitted_at) {
            const dateKey = format(new Date(sub.submitted_at), 'yyyy-MM-dd');
            const existing = metricsMap.get(dateKey) || {
              views: 0,
              likes: 0,
              shares: 0,
              bookmarks: 0,
              videos: 0
            };
            existing.views += Number(sub.views) || 0;
            existing.likes += Number(sub.likes) || 0;
            existing.shares += Number(sub.shares) || 0;
            existing.bookmarks += Number(sub.bookmarks) || 0;
            existing.videos += 1;
            metricsMap.set(dateKey, existing);
          }
        });

        // Convert to array and add daily/cumulative calculations
        const sortedDates = Array.from(metricsMap.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
        let cumulativeViews = 0;
        let cumulativeLikes = 0;
        let cumulativeShares = 0;
        let cumulativeBookmarks = 0;
        let cumulativeVideos = 0;
        const formattedMetrics: MetricsData[] = sortedDates.map(([dateKey, data]) => {
          cumulativeViews += data.views;
          cumulativeLikes += data.likes;
          cumulativeShares += data.shares;
          cumulativeBookmarks += data.bookmarks;
          cumulativeVideos += data.videos;
          const dateObj = new Date(dateKey);
          return {
            date: format(dateObj, 'MMM d'),
            datetime: format(dateObj, 'MMM d, yyyy'),
            views: cumulativeViews,
            likes: cumulativeLikes,
            shares: cumulativeShares,
            bookmarks: cumulativeBookmarks,
            videos: cumulativeVideos,
            dailyViews: data.views,
            dailyLikes: data.likes,
            dailyShares: data.shares,
            dailyBookmarks: data.bookmarks,
            dailyVideos: data.videos
          };
        });
        setMetricsData(formattedMetrics);

        // Calculate activity data (submissions and unique creators over time)
        const activityMap = new Map<string, {
          submissions: number;
          creatorIds: Set<string>;
          applications: number;
        }>();
        filteredSubmissions.forEach(sub => {
          if (sub.submitted_at) {
            const dateKey = format(new Date(sub.submitted_at), 'yyyy-MM-dd');
            const existing = activityMap.get(dateKey) || {
              submissions: 0,
              creatorIds: new Set<string>(),
              applications: 0
            };
            existing.submissions += 1;
            if (sub.creator_id) {
              existing.creatorIds.add(sub.creator_id);
            }
            activityMap.set(dateKey, existing);
          }
        });

        // Fetch and add applications data
        const {
          data: applicationsData
        } = await supabase.from('bounty_applications').select('applied_at, user_id').eq('bounty_campaign_id', boost.id);
        let filteredApplications = applicationsData || [];
        if (dateRange) {
          filteredApplications = filteredApplications.filter(app => {
            if (!app.applied_at) return false;
            const date = new Date(app.applied_at);
            return date >= dateRange.start && date <= dateRange.end;
          });
        }
        filteredApplications.forEach(app => {
          if (app.applied_at) {
            const dateKey = format(new Date(app.applied_at), 'yyyy-MM-dd');
            const existing = activityMap.get(dateKey) || {
              submissions: 0,
              creatorIds: new Set<string>(),
              applications: 0
            };
            existing.applications += 1;
            activityMap.set(dateKey, existing);
          }
        });

        // Convert to sorted array with cumulative counts
        const sortedActivityDates = Array.from(activityMap.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
        let cumulativeActivitySubmissions = 0;
        let cumulativeApplications = 0;
        const allActivityCreatorIds = new Set<string>();
        const formattedActivityData: ActivityData[] = sortedActivityDates.map(([dateKey, data]) => {
          cumulativeActivitySubmissions += data.submissions;
          cumulativeApplications += data.applications;
          data.creatorIds.forEach(id => allActivityCreatorIds.add(id));
          const dateObj = new Date(dateKey);
          return {
            date: format(dateObj, 'MMM d'),
            datetime: format(dateObj, 'MMM d, yyyy'),
            submissions: cumulativeActivitySubmissions,
            creators: allActivityCreatorIds.size,
            applications: cumulativeApplications,
            dailySubmissions: data.submissions,
            dailyCreators: data.creatorIds.size,
            dailyApplications: data.applications
          };
        });
        setActivityData(formattedActivityData);
        // Map approved submissions from filtered data to top videos format - sort by views descending
        const approvedVideos = filteredSubmissions.filter(s => s.status === 'approved').sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0)).slice(0, 3);
        if (approvedVideos.length > 0) {
          const mappedVideos: VideoData[] = approvedVideos.map(v => ({
            ad_id: v.id,
            username: v.video_author_username || 'Unknown',
            platform: v.platform,
            ad_link: v.video_url,
            uploaded_at: v.submitted_at,
            title: v.video_title || v.video_description?.slice(0, 100) || 'Video submission',
            latest_views: Number(v.views) || 0,
            latest_likes: Number(v.likes) || 0,
            latest_comments: Number(v.comments) || 0,
            latest_shares: Number(v.shares) || 0,
            thumbnail_url: v.video_thumbnail_url || undefined
          }));
          setTopVideos(mappedVideos);
          setTotalVideos(approvedSubmissions);
        } else {
          setTopVideos([]);
          setTotalVideos(approvedSubmissions);
        }
      } catch (error) {
        console.error('Error loading boost stats:', error);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      isCancelled = true;
    };
  }, [boost.id, timeframe, boost.accepted_creators_count, boost.max_accepted_creators, refreshKey]);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Sync metrics only for this brand (much faster than syncing everything)
      const {
        data,
        error
      } = await supabase.functions.invoke('sync-shortimize-metrics', {
        body: {
          brandId: boost.brand_id
        }
      });
      if (error) {
        toast.error('Failed to sync metrics');
        console.error('Error syncing metrics:', error);
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
      toast.error('Failed to refresh metrics');
    } finally {
      setIsRefreshing(false);
    }
  };
  const budgetTotal = boost.budget || 0;
  // Use actual payouts from transactions instead of boost.budget_used which may not update
  const budgetUsed = stats.totalPayouts;
  if (isLoading) {
    return <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="p-4 rounded-lg bg-transparent space-y-3">
              <Skeleton className="h-4 w-28 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
              <Skeleton className="h-8 w-20 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
              <Skeleton className="h-3 w-24 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
            </div>)}
        </div>
        <div className="rounded-xl bg-transparent p-5 space-y-4">
          <Skeleton className="h-5 w-20 bg-muted-foreground/15" />
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16 bg-muted-foreground/15" />
                <Skeleton className="h-6 w-20 bg-muted-foreground/15" />
              </div>)}
          </div>
          <Skeleton className="h-2 w-full bg-muted-foreground/15" />
        </div>
        <div className="p-5 rounded-lg bg-transparent space-y-4">
          <Skeleton className="h-5 w-40 bg-muted-foreground/15" />
          <Skeleton className="h-64 w-full bg-muted-foreground/15" />
        </div>
      </div>;
  }
  return <div className="p-4 space-y-4">
      {/* Date Range Label */}
      <p className="text-sm text-muted-foreground font-['Geist'] tracking-[-0.3px]">
        {formatTimeframeLabel(timeframe)}
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="font-medium text-foreground tracking-[-0.5px] text-xs">Total Views</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{stats.totalViews.toLocaleString()}</p>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{stats.totalLikes.toLocaleString()} likes</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="font-medium text-foreground tracking-[-0.5px] text-xs">CPM</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(stats.cpm)}</p>
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
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{stats.pendingSubmissions} pending review</p>
          </div>
        </Card>
      </div>

      {/* Budget & Creators Card */}
      <BudgetProgressCard budgetUsed={budgetUsed} budgetTotal={budgetTotal} acceptedCreators={stats.acceptedCreators} maxCreators={stats.maxCreators} onTopUp={onTopUp} />

      {/* Charts Row - Side by Side */}
      <div className="flex flex-col gap-4">
        <PerformanceChart metricsData={metricsData} isRefreshing={isRefreshing} onRefresh={handleRefresh} lastSyncedAt={lastSyncedAt} />
        <ActivityChart activityData={activityData} />
      </div>

      {/* Top Performing Videos - using shared component */}
      <TopPerformingVideos videos={topVideos} totalVideos={totalVideos} />

      {/* About Section */}
      {boost.description && <div>
          <h2 className="text-lg font-semibold tracking-[-0.5px] mb-3">About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {boost.description}
          </p>
        </div>}
    </div>;
}