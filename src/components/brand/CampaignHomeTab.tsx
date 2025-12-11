import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Play, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import tiktokLogo from "@/assets/tiktok-logo-black.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { toast } from "sonner";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { ManualMetricsDialog } from "./ManualMetricsDialog";
interface CampaignHomeTabProps {
  campaignId: string;
  brandId: string;
}

interface VideoData {
  ad_id: string;
  username: string;
  platform: string;
  ad_link: string;
  uploaded_at: string;
  title: string;
  latest_views: number;
  latest_likes: number;
  latest_comments: number;
  latest_shares: number;
}

interface StatsData {
  totalViews: number;
  totalPayouts: number;
  effectiveCPM: number;
  viewsLastWeek: number;
  payoutsLastWeek: number;
  viewsChangePercent: number;
  payoutsChangePercent: number;
}

interface MetricsData {
  date: string;
  views: number;
  likes: number;
  shares: number;
  bookmarks: number;
}

const THUMBNAIL_BASE_URL = "https://wtmetnsnhqfbswfddkdr.supabase.co/storage/v1/object/public/ads_tracked_thumbnails";

const extractPlatformId = (adLink: string, platform: string): string | null => {
  try {
    if (platform?.toLowerCase() === 'tiktok') {
      // TikTok: /video/ or /photo/ (slideshows)
      const match = adLink.match(/\/(video|photo)\/(\d+)/);
      return match ? match[2] : null;
    } else if (platform?.toLowerCase() === 'instagram') {
      const match = adLink.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      return match ? match[2] : null;
    } else if (platform?.toLowerCase() === 'youtube') {
      const shortsMatch = adLink.match(/\/shorts\/([A-Za-z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];
      const watchMatch = adLink.match(/[?&]v=([A-Za-z0-9_-]+)/);
      return watchMatch ? watchMatch[1] : null;
    }
    return null;
  } catch {
    return null;
  }
};

export function CampaignHomeTab({ campaignId, brandId }: CampaignHomeTabProps) {
  const { isAdmin } = useAdminCheck();
  const [stats, setStats] = useState<StatsData>({ totalViews: 0, totalPayouts: 0, effectiveCPM: 0, viewsLastWeek: 0, payoutsLastWeek: 0, viewsChangePercent: 0, payoutsChangePercent: 0 });
  const [topVideos, setTopVideos] = useState<VideoData[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative'>('cumulative');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [brand, setBrand] = useState<{ collection_name: string | null } | null>(null);

  useEffect(() => {
    fetchData();
    fetchMetrics();
  }, [campaignId, brandId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch brand info for collection name
      const { data: brandData } = await supabase
        .from('brands')
        .select('collection_name')
        .eq('id', brandId)
        .single();
      
      setBrand(brandData);

      // Fetch campaign analytics for stats
      const { data: analyticsData } = await supabase
        .from('campaign_account_analytics')
        .select('total_views, paid_views')
        .eq('campaign_id', campaignId);

      // Fetch transactions for payouts
      const { data: transactionsData } = await supabase
        .from('wallet_transactions')
        .select('amount, created_at')
        .eq('metadata->>campaign_id', campaignId)
        .eq('type', 'earning');

      // Calculate week boundaries
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Calculate payouts for current week vs last week
      const payoutsThisWeek = transactionsData?.filter(t => new Date(t.created_at) >= oneWeekAgo)
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const payoutsLastWeek = transactionsData?.filter(t => {
        const date = new Date(t.created_at);
        return date >= twoWeeksAgo && date < oneWeekAgo;
      }).reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Fetch metrics for views comparison (last week vs week before)
      const { data: metricsThisWeek } = await supabase
        .from('campaign_video_metrics')
        .select('total_views')
        .eq('campaign_id', campaignId)
        .gte('recorded_at', oneWeekAgo.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1);

      const { data: metricsLastWeek } = await supabase
        .from('campaign_video_metrics')
        .select('total_views')
        .eq('campaign_id', campaignId)
        .gte('recorded_at', twoWeeksAgo.toISOString())
        .lt('recorded_at', oneWeekAgo.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1);

      const viewsThisWeekValue = metricsThisWeek?.[0]?.total_views || 0;
      const viewsLastWeekValue = metricsLastWeek?.[0]?.total_views || 0;

      // Calculate percentage changes
      const viewsChangePercent = viewsLastWeekValue > 0 
        ? ((viewsThisWeekValue - viewsLastWeekValue) / viewsLastWeekValue) * 100 
        : 0;
      const payoutsChangePercent = payoutsLastWeek > 0 
        ? ((payoutsThisWeek - payoutsLastWeek) / payoutsLastWeek) * 100 
        : 0;

      const totalViews = analyticsData?.reduce((sum, a) => sum + (a.total_views || 0), 0) || 0;
      const paidViews = analyticsData?.reduce((sum, a) => sum + (a.paid_views || 0), 0) || 0;
      const totalPayouts = transactionsData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const effectiveCPM = paidViews > 0 ? (totalPayouts / paidViews) * 1000 : 0;

      setStats({
        totalViews,
        totalPayouts,
        effectiveCPM,
        viewsLastWeek: viewsLastWeekValue,
        payoutsLastWeek,
        viewsChangePercent,
        payoutsChangePercent
      });

      // Generate mock chart data based on transactions
      const chartPoints = generateChartData(transactionsData || []);
      setChartData(chartPoints);

      // Fetch top videos from Shortimize - pass campaignId for hashtag filtering
      const { data: videosData, error } = await supabase.functions.invoke('fetch-shortimize-videos', {
        body: {
          brandId,
          campaignId, // Pass campaignId to enable hashtag filtering
          page: 1,
          limit: 3,
          orderBy: 'latest_views',
          orderDirection: 'desc',
        },
      });

      if (!error && videosData?.videos) {
        setTopVideos(videosData.videos);
        setTotalVideos(videosData.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const { data: metricsData } = await supabase
        .from('campaign_video_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('recorded_at', { ascending: true });

      if (metricsData && metricsData.length > 0) {
        const formattedMetrics = metricsData.map(m => ({
          date: format(new Date(m.recorded_at), 'MMM d'),
          views: m.total_views,
          likes: m.total_likes,
          shares: m.total_shares,
          bookmarks: m.total_bookmarks,
        }));
        setMetricsData(formattedMetrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('[CampaignHomeTab] Starting metrics refresh for campaign:', campaignId);
      
      // Trigger the sync edge function for this specific campaign
      const { data, error } = await supabase.functions.invoke('sync-campaign-video-metrics', {
        body: { campaignId }
      });
      
      console.log('[CampaignHomeTab] Sync response:', { data, error });
      
      if (error) {
        console.error('[CampaignHomeTab] Error from sync function:', error);
        toast.error('Failed to sync metrics: ' + error.message);
        return;
      }
      
      // Check if the sync was successful
      if (data && !data.success) {
        const errorMsg = data.errorMessage || 'Unknown error during sync';
        console.error('[CampaignHomeTab] Sync failed:', errorMsg);
        toast.error('Sync failed: ' + errorMsg);
        return;
      }
      
      if (data?.synced > 0) {
        toast.success(`Successfully synced metrics for ${data.synced} campaign(s)`);
      } else if (data?.errors > 0) {
        toast.warning('Sync completed with errors: ' + (data.errorMessage || 'Check logs for details'));
      }
      
      // Refetch data
      await fetchMetrics();
      await fetchData();
      
      console.log('[CampaignHomeTab] Refresh complete');
    } catch (error) {
      console.error('[CampaignHomeTab] Error refreshing metrics:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to refresh metrics');
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateChartData = (transactions: any[]) => {
    // Group by date and generate cumulative/daily data
    const grouped: Record<string, number> = {};
    transactions.forEach(t => {
      const date = format(new Date(t.created_at), 'MMM d');
      grouped[date] = (grouped[date] || 0) + t.amount;
    });

    let cumulative = 0;
    return Object.entries(grouped).map(([date, amount]) => {
      cumulative += amount;
      return {
        date,
        daily: amount,
        cumulative
      };
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    return '$' + num.toFixed(2);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'tiktok':
        return <img src={tiktokLogo} alt="TikTok" className="h-4 w-4" />;
      case 'instagram':
        return <img src={instagramLogo} alt="Instagram" className="h-4 w-4" />;
      case 'youtube':
        return <img src={youtubeLogo} alt="YouTube" className="h-4 w-4" />;
      default:
        return <span className="h-4 w-4 flex items-center justify-center text-xs">🎬</span>;
    }
  };

  const getThumbnailUrl = (video: VideoData) => {
    const platformId = extractPlatformId(video.ad_link, video.platform);
    if (!platformId) return null;
    return `${THUMBNAIL_BASE_URL}/${video.username}/${platformId}_${video.platform}.jpg`;
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Views Generated</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatNumber(stats.totalViews)}</p>
              <Badge variant="secondary" className={`text-xs ${stats.viewsChangePercent >= 0 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                {stats.viewsChangePercent >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {stats.viewsChangePercent >= 0 ? '+' : ''}{stats.viewsChangePercent.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{formatNumber(stats.viewsLastWeek)} last week</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Effective CPM</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(stats.effectiveCPM)}</p>
              <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">Cost per 1K views</p>
          </div>
        </Card>

        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Total Payouts</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(stats.totalPayouts)}</p>
              <Badge variant="secondary" className={`text-xs ${stats.payoutsChangePercent >= 0 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                {stats.payoutsChangePercent >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {stats.payoutsChangePercent >= 0 ? '+' : ''}{stats.payoutsChangePercent.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">{formatCurrency(stats.payoutsLastWeek)} last week</p>
          </div>
        </Card>
      </div>

      {/* Metrics Chart */}
      <Card className="p-4 bg-card/30 border-table-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium tracking-[-0.5px]">Performance Over Time</h3>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <ManualMetricsDialog 
                campaignId={campaignId} 
                brandId={brandId} 
                onSuccess={fetchMetrics}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <div className="flex items-center gap-0 border border-table-border rounded-md overflow-hidden">
              <button
                onClick={() => setChartMode('daily')}
                className={`px-3 py-1.5 text-xs tracking-[-0.5px] transition-colors ${
                  chartMode === 'daily' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setChartMode('cumulative')}
                className={`px-3 py-1.5 text-xs tracking-[-0.5px] transition-colors ${
                  chartMode === 'cumulative' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Cumulative
              </button>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
            <span className="text-muted-foreground">Views</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
            <span className="text-muted-foreground">Likes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
            <span className="text-muted-foreground">Shares</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
            <span className="text-muted-foreground">Bookmarks</span>
          </div>
        </div>

        <div className="h-64">
          {metricsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metricsData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBookmarks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => formatNumber(value)} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatNumber(value)}
                />
                <Area
                  type="linear"
                  dataKey="views"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
                <Area
                  type="linear"
                  dataKey="likes"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLikes)"
                />
                <Area
                  type="linear"
                  dataKey="shares"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorShares)"
                />
                <Area
                  type="linear"
                  dataKey="bookmarks"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorBookmarks)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm tracking-[-0.5px] gap-2">
              <p>No metrics data yet</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Fetch Latest
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Top Performing Videos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.5px]">Top Performing Videos</h2>
          <span className="text-sm text-muted-foreground tracking-[-0.5px]">
            {totalVideos.toLocaleString()} video results
          </span>
        </div>

        {topVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topVideos.map((video, index) => (
              <a
                key={video.ad_id}
                href={video.ad_link}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="p-4 bg-card/30 border-table-border hover:bg-muted/20 transition-colors">
                  <div className="flex gap-4">
                    {/* Video Thumbnail */}
                    <div className="relative flex-shrink-0">
                      <Badge className="absolute top-1 left-1 z-10 bg-black/70 text-white text-xs px-1.5 py-0.5">
                        #{index + 1}
                      </Badge>
                      <div className="relative w-24 h-36 rounded-lg overflow-hidden bg-muted/50">
                        {getThumbnailUrl(video) && (
                          <img
                            src={getThumbnailUrl(video)!}
                            alt={video.title || 'Video thumbnail'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(video.platform)}
                        <span className="text-sm font-medium tracking-[-0.5px]">{video.username.toLowerCase()}</span>
                      </div>
                      <p className="text-sm text-foreground tracking-[-0.5px] line-clamp-3 group-hover:underline">
                        {video.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                        Uploaded {video.uploaded_at ? format(new Date(video.uploaded_at), 'yyyy-MM-dd') : '-'}
                      </p>
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        ) : (
          <Card className="p-8 bg-card/30 border-table-border">
            <div className="text-center text-muted-foreground tracking-[-0.5px]">
              No videos found matching campaign hashtags. Add hashtags to your campaign to filter videos.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}