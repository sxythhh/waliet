import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subWeeks, subMonths } from "date-fns";
import { PerformanceChart, MetricsData } from "./PerformanceChart";
import { TopPerformingVideos, VideoData } from "./TopPerformingVideos";

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
      return null;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export function BoostHomeTab({ boost, timeframe = "this_month", onTopUp }: BoostHomeTabProps) {
  const [stats, setStats] = useState<StatsData>({
    totalPayouts: 0,
    payoutsLastWeek: 0,
    totalSubmissions: 0,
    approvedSubmissions: 0,
    pendingSubmissions: 0,
    rejectedSubmissions: 0,
    acceptedCreators: boost.accepted_creators_count,
    maxCreators: boost.max_accepted_creators
  });
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [topVideos, setTopVideos] = useState<VideoData[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    
    const loadData = async () => {
      if (isCancelled) return;
      setIsLoading(true);
      
      try {
        const dateRange = getDateRange(timeframe);
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Fetch video submissions for this boost
        const { data: submissions } = await supabase
          .from('boost_video_submissions')
          .select('id, status, payout_amount, submitted_at, video_url, platform, user_id')
          .eq('bounty_campaign_id', boost.id);

        // Fetch wallet transactions for payouts
        const { data: transactions } = await supabase
          .from('wallet_transactions')
          .select('amount, created_at')
          .eq('metadata->>boost_id', boost.id)
          .eq('type', 'earning');

        if (isCancelled) return;

        const submissionsData = submissions || [];
        const transactionsData = transactions || [];

        // Filter by date range if applicable
        let filteredTransactions = transactionsData;
        if (dateRange) {
          filteredTransactions = transactionsData.filter(t => {
            const date = new Date(t.created_at);
            return date >= dateRange.start && date <= dateRange.end;
          });
        }

        // Calculate stats
        const totalPayouts = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const payoutsLastWeek = transactionsData
          .filter(t => new Date(t.created_at) >= oneWeekAgo)
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalSubmissions = submissionsData.length;
        const approvedSubmissions = submissionsData.filter(s => s.status === 'approved').length;
        const pendingSubmissions = submissionsData.filter(s => s.status === 'pending').length;
        const rejectedSubmissions = submissionsData.filter(s => s.status === 'rejected').length;

        setStats({
          totalPayouts,
          payoutsLastWeek,
          totalSubmissions,
          approvedSubmissions,
          pendingSubmissions,
          rejectedSubmissions,
          acceptedCreators: boost.accepted_creators_count,
          maxCreators: boost.max_accepted_creators
        });

        // Build mock metrics data from submissions (grouped by date)
        const metricsMap = new Map<string, { views: number; likes: number; shares: number; bookmarks: number; videos: number }>();
        
        submissionsData.forEach(sub => {
          if (sub.submitted_at) {
            const dateKey = format(new Date(sub.submitted_at), 'MMM d');
            const existing = metricsMap.get(dateKey) || { views: 0, likes: 0, shares: 0, bookmarks: 0, videos: 0 };
            existing.videos += 1;
            metricsMap.set(dateKey, existing);
          }
        });

        // Convert to array and add daily calculations
        const sortedDates = Array.from(metricsMap.entries()).sort((a, b) => 
          new Date(a[0]).getTime() - new Date(b[0]).getTime()
        );

        let cumulativeVideos = 0;
        const formattedMetrics: MetricsData[] = sortedDates.map(([date, data]) => {
          cumulativeVideos += data.videos;
          return {
            date,
            views: 0,
            likes: 0,
            shares: 0,
            bookmarks: 0,
            videos: cumulativeVideos,
            dailyViews: 0,
            dailyLikes: 0,
            dailyShares: 0,
            dailyBookmarks: 0,
            dailyVideos: data.videos
          };
        });

        setMetricsData(formattedMetrics);

        // Map approved submissions to top videos format
        const approvedVideos = submissionsData
          .filter(s => s.status === 'approved')
          .slice(0, 3);

        // Fetch usernames for the videos
        if (approvedVideos.length > 0) {
          const userIds = [...new Set(approvedVideos.map(v => v.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

          const mappedVideos: VideoData[] = approvedVideos.map(v => ({
            ad_id: v.id,
            username: profileMap.get(v.user_id) || 'Unknown',
            platform: v.platform,
            ad_link: v.video_url,
            uploaded_at: v.submitted_at,
            title: 'Boost submission',
            latest_views: 0,
            latest_likes: 0,
            latest_comments: 0,
            latest_shares: 0
          }));

          setTopVideos(mappedVideos);
          setTotalVideos(approvedSubmissions);
        }
      } catch (error) {
        console.error('Error loading boost stats:', error);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadData();
    return () => { isCancelled = true; };
  }, [boost.id, timeframe, boost.accepted_creators_count, boost.max_accepted_creators]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // For boosts, just reload data
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const budgetTotal = boost.budget || 0;
  const budgetUsed = boost.budget_used || 0;
  const budgetRemaining = budgetTotal - budgetUsed;
  const progressPercentage = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-lg bg-muted/50 dark:bg-muted/25 space-y-3">
              <Skeleton className="h-4 w-28 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
              <Skeleton className="h-8 w-20 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
              <Skeleton className="h-3 w-24 bg-muted-foreground/15 dark:bg-muted-foreground/30" />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-muted/50 p-5 space-y-4">
          <Skeleton className="h-5 w-20 bg-muted-foreground/15" />
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16 bg-muted-foreground/15" />
                <Skeleton className="h-6 w-20 bg-muted-foreground/15" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2 w-full bg-muted-foreground/15" />
        </div>
        <div className="p-5 rounded-lg bg-muted/50 space-y-4">
          <Skeleton className="h-5 w-40 bg-muted-foreground/15" />
          <Skeleton className="h-64 w-full bg-muted-foreground/15" />
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
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{stats.pendingSubmissions} pending review</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Creators</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{stats.acceptedCreators}/{stats.maxCreators}</p>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">Active creators in program</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Per Video Rate</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(boost.monthly_retainer / boost.videos_per_month)}</p>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{boost.videos_per_month} videos/month @ {formatCurrency(boost.monthly_retainer)}</p>
          </div>
        </Card>
      </div>

      {/* Budget Card */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold tracking-[-0.5px]">Balance</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 h-7 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500" 
            onClick={onTopUp}
          >
            <Plus className="h-3 w-3" />
            Add Funds
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Budget</p>
            <p className="text-xl font-semibold">${budgetTotal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Spent</p>
            <p className="text-xl font-semibold">${budgetUsed.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className="text-xl font-semibold text-emerald-500">${budgetRemaining.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all" 
              style={{ width: `${Math.min(progressPercentage, 100)}%` }} 
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {progressPercentage.toFixed(1)}% of budget used
          </p>
        </div>
      </div>

      {/* Performance Chart - using shared component */}
      <PerformanceChart
        metricsData={metricsData}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        showHashtagsWarning={false}
        hashtagsConfigured={true}
      />

      {/* Top Performing Videos - using shared component */}
      <TopPerformingVideos
        videos={topVideos}
        totalVideos={totalVideos}
        hashtagsConfigured={true}
        hashtags={[]}
      />

      {/* About Section */}
      {boost.description && (
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.5px] mb-3">About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {boost.description}
          </p>
        </div>
      )}
    </div>
  );
}
