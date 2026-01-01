import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, subDays, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Download, BarChart3, Users } from "lucide-react";
import { PerformanceChart, MetricsData } from "./PerformanceChart";
import { cn } from "@/lib/utils";
import { TimeframeOption } from "@/components/dashboard/BrandCampaignDetailView";

interface CreatorROI {
  oduserId: string;
  username: string;
  avatarUrl: string | null;
  totalViews: number;
  totalPaid: number;
  costPerView: number;
  videoCount: number;
  avgViewsPerVideo: number;
}

interface BrandPerformanceDashboardProps {
  brandId: string;
  timeframe?: TimeframeOption;
}

// Convert timeframe option to date range
function getDateRangeFromTimeframe(timeframe: TimeframeOption): { from: Date; to: Date } {
  const now = new Date();
  const to = endOfDay(now);

  switch (timeframe) {
    case "today":
      return { from: startOfDay(now), to };
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to };
    case "last_week": {
      const lastWeekStart = subDays(startOfWeek(now, { weekStartsOn: 1 }), 7);
      return { from: lastWeekStart, to: endOfWeek(lastWeekStart, { weekStartsOn: 1 }) };
    }
    case "this_month":
      return { from: startOfMonth(now), to };
    case "last_month": {
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      return { from: lastMonthStart, to: endOfMonth(lastMonthStart) };
    }
    case "all_time":
    default:
      return { from: subMonths(now, 12), to }; // Last 12 months for "all time"
  }
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
};

export function BrandPerformanceDashboard({ brandId, timeframe = "all_time" }: BrandPerformanceDashboardProps) {
  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalPayouts: 0,
    effectiveCPM: 0,
    totalSubmissions: 0,
    approvedSubmissions: 0,
    activeCreators: 0,
    avgViewsPerCreator: 0
  });
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [creatorROI, setCreatorROI] = useState<CreatorROI[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load analytics data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const { from: startDate, to: endDate } = getDateRangeFromTimeframe(timeframe);

      // Get campaign and boost IDs
      const [campaignsData, boostsData] = await Promise.all([
        supabase.from('campaigns').select('id').eq('brand_id', brandId),
        supabase.from('bounty_campaigns').select('id').eq('brand_id', brandId)
      ]);

      const campaignIds = campaignsData.data?.map(c => c.id) || [];
      const boostIds = boostsData.data?.map(b => b.id) || [];

      if (campaignIds.length === 0 && boostIds.length === 0) {
        setStats({
          totalViews: 0,
          totalPayouts: 0,
          effectiveCPM: 0,
          totalSubmissions: 0,
          approvedSubmissions: 0,
          activeCreators: 0,
          avgViewsPerCreator: 0
        });
        setMetricsData([]);
        setCreatorROI([]);
        setIsLoading(false);
        return;
      }

      // Fetch cached campaign videos
      const { data: cachedVideos } = await supabase
        .from('cached_campaign_videos')
        .select(`
          id, views, likes, shares, bookmarks,
          user_id, campaign_id, created_at, username
        `)
        .eq('brand_id', brandId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch wallet transactions for payouts
      const transactionPromises = [];
      for (const campaignId of campaignIds) {
        transactionPromises.push(
          supabase
            .from('wallet_transactions')
            .select('amount, created_at, user_id')
            .eq('type', 'earning')
            .eq('metadata->>campaign_id', campaignId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
        );
      }
      for (const boostId of boostIds) {
        transactionPromises.push(
          supabase
            .from('wallet_transactions')
            .select('amount, created_at, user_id')
            .eq('type', 'earning')
            .eq('metadata->>boost_id', boostId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
        );
      }

      const transactionResults = await Promise.all(transactionPromises);
      const allTransactions = transactionResults.flatMap(r => r.data || []);

      // Calculate stats
      const videos = cachedVideos || [];
      const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
      const totalPayouts = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const effectiveCPM = totalViews > 0 ? (totalPayouts / totalViews) * 1000 : 0;

      // Count unique creators
      const uniqueCreators = new Set(videos.map(v => v.user_id).filter(Boolean));
      const activeCreators = uniqueCreators.size;
      const avgViewsPerCreator = activeCreators > 0 ? totalViews / activeCreators : 0;

      setStats({
        totalViews,
        totalPayouts,
        effectiveCPM,
        totalSubmissions: videos.length,
        approvedSubmissions: videos.length,
        activeCreators,
        avgViewsPerCreator
      });

      // Calculate Creator ROI
      const creatorMap = new Map<string, CreatorROI>();

      videos.forEach(video => {
        if (!video.user_id) return;
        const existing = creatorMap.get(video.user_id) || {
          oduserId: video.user_id,
          username: video.username || 'Unknown',
          avatarUrl: null,
          totalViews: 0,
          totalPaid: 0,
          costPerView: 0,
          videoCount: 0,
          avgViewsPerVideo: 0
        };

        existing.totalViews += video.views || 0;
        existing.videoCount += 1;
        creatorMap.set(video.user_id, existing);
      });

      allTransactions.forEach(tx => {
        const existing = creatorMap.get(tx.user_id);
        if (existing) {
          existing.totalPaid += tx.amount || 0;
        }
      });

      // Calculate derived metrics
      creatorMap.forEach(creator => {
        creator.costPerView = creator.totalViews > 0
          ? (creator.totalPaid / creator.totalViews) * 1000
          : 0;
        creator.avgViewsPerVideo = creator.videoCount > 0
          ? creator.totalViews / creator.videoCount
          : 0;
      });

      const sortedCreatorROI = Array.from(creatorMap.values())
        .sort((a, b) => b.totalViews - a.totalViews);

      setCreatorROI(sortedCreatorROI);

      // Build metrics data for chart (aggregate by date)
      const metricsByDate = new Map<string, MetricsData>();

      videos.forEach(video => {
        const dateKey = format(new Date(video.created_at), 'yyyy-MM-dd');
        const existing = metricsByDate.get(dateKey) || {
          date: format(new Date(video.created_at), 'MMM d'),
          datetime: format(new Date(video.created_at), 'MMM d, yyyy'),
          views: 0,
          likes: 0,
          shares: 0,
          bookmarks: 0,
          videos: 0,
          dailyViews: 0,
          dailyLikes: 0,
          dailyShares: 0,
          dailyBookmarks: 0,
          dailyVideos: 0
        };

        existing.views += video.views || 0;
        existing.likes += video.likes || 0;
        existing.shares += video.shares || 0;
        existing.bookmarks += video.bookmarks || 0;
        existing.videos += 1;
        existing.dailyViews = existing.views;
        existing.dailyLikes = existing.likes;
        existing.dailyShares = existing.shares;
        existing.dailyBookmarks = existing.bookmarks;
        existing.dailyVideos = existing.videos;

        metricsByDate.set(dateKey, existing);
      });

      const sortedMetrics = Array.from(metricsByDate.values())
        .sort((a, b) => new Date(a.datetime || '').getTime() - new Date(b.datetime || '').getTime());

      setMetricsData(sortedMetrics);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [brandId, timeframe]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // CSV Export function
  const exportToCSV = () => {
    const headers = ['Creator', 'Videos', 'Total Views', 'Avg Views/Video', 'Total Paid', 'CPM'];
    const rows = creatorROI.map(c => [
      c.username,
      c.videoCount,
      c.totalViews,
      c.avgViewsPerVideo.toFixed(0),
      c.totalPaid.toFixed(2),
      c.costPerView.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `creator-roi-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };


  return (
    <div className="p-4 pb-[70px] sm:pb-4 space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="font-medium text-foreground tracking-[-0.5px] text-xs">Total Views</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatNumber(stats.totalViews)}</p>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{formatNumber(stats.avgViewsPerCreator)} avg per creator</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="font-medium text-foreground tracking-[-0.5px] text-xs">Total Spent</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(stats.totalPayouts)}</p>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{formatCurrency(stats.effectiveCPM)} CPM</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="font-medium text-foreground tracking-[-0.5px] text-xs">Active Creators</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{stats.activeCreators}</p>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{stats.totalSubmissions} total submissions</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="font-medium text-foreground tracking-[-0.5px] text-xs">Videos</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{stats.approvedSubmissions}</p>
              <div className="text-xs px-2 py-1 rounded-full tracking-[-0.5px] bg-primary/10 text-primary">
                {stats.totalSubmissions - stats.approvedSubmissions} pending
              </div>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{stats.totalSubmissions} total</p>
          </div>
        </Card>
      </div>

      {/* Performance Chart */}
      <PerformanceChart
        metricsData={metricsData}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Creator ROI Table */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-[-0.5px]">Creator ROI</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={exportToCSV} className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>

        {creatorROI.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground text-xs tracking-[-0.3px]">Creator</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground text-xs tracking-[-0.3px]">Videos</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground text-xs tracking-[-0.3px]">Total Views</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground text-xs tracking-[-0.3px]">Avg Views</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground text-xs tracking-[-0.3px]">Total Paid</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground text-xs tracking-[-0.3px]">CPM</th>
                </tr>
              </thead>
              <tbody>
                {creatorROI.slice(0, 10).map((creator, index) => (
                  <tr key={creator.oduserId} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                        {creator.avatarUrl ? (
                          <img
                            src={creator.avatarUrl}
                            alt={creator.username}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium tracking-[-0.3px]">@{creator.username}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 tabular-nums">{creator.videoCount}</td>
                    <td className="text-right py-3 px-2 tabular-nums">{formatNumber(creator.totalViews)}</td>
                    <td className="text-right py-3 px-2 tabular-nums">{formatNumber(creator.avgViewsPerVideo)}</td>
                    <td className="text-right py-3 px-2 tabular-nums">{formatCurrency(creator.totalPaid)}</td>
                    <td className="text-right py-3 px-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium tabular-nums",
                        creator.costPerView < stats.effectiveCPM
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-orange-500/10 text-orange-500"
                      )}>
                        ${creator.costPerView.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No creator data available for this period
          </div>
        )}
      </Card>
    </div>
  );
}
