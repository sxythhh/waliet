import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Play, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import tiktokLogo from "@/assets/tiktok-logo-black.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
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
  dailyViews: number;
  dailyLikes: number;
  dailyShares: number;
  dailyBookmarks: number;
}

const THUMBNAIL_BASE_URL = "https://wtmetnsnhqfbswfddkdr.supabase.co/storage/v1/object/public/ads_tracked_thumbnails";

const extractPlatformId = (adLink: string, platform: string): string | null => {
  try {
    if (platform?.toLowerCase() === 'tiktok') {
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

type MetricType = 'views' | 'likes' | 'shares' | 'bookmarks';

const METRIC_COLORS: Record<MetricType, string> = {
  views: '#3b82f6',
  likes: '#ef4444',
  shares: '#22c55e',
  bookmarks: '#f59e0b',
};

export function CampaignHomeTab({ campaignId, brandId }: CampaignHomeTabProps) {
  const { isAdmin } = useAdminCheck();
  const [stats, setStats] = useState<StatsData>({ totalViews: 0, totalPayouts: 0, effectiveCPM: 0, viewsLastWeek: 0, payoutsLastWeek: 0, viewsChangePercent: 0, payoutsChangePercent: 0 });
  const [topVideos, setTopVideos] = useState<VideoData[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative'>('cumulative');
  const [activeMetrics, setActiveMetrics] = useState<MetricType[]>(['views']);
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
      const { data: brandData } = await supabase
        .from('brands')
        .select('collection_name')
        .eq('id', brandId)
        .single();
      
      setBrand(brandData);

      const { data: analyticsData } = await supabase
        .from('campaign_account_analytics')
        .select('total_views, paid_views')
        .eq('campaign_id', campaignId);

      const { data: transactionsData } = await supabase
        .from('wallet_transactions')
        .select('amount, created_at')
        .eq('metadata->>campaign_id', campaignId)
        .eq('type', 'earning');

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const payoutsThisWeek = transactionsData?.filter(t => new Date(t.created_at) >= oneWeekAgo)
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const payoutsLastWeek = transactionsData?.filter(t => {
        const date = new Date(t.created_at);
        return date >= twoWeeksAgo && date < oneWeekAgo;
      }).reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

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

      const viewsChangePercent = viewsLastWeekValue > 0 
        ? ((viewsThisWeekValue - viewsLastWeekValue) / viewsLastWeekValue) * 100 
        : 0;
      const payoutsChangePercent = payoutsLastWeek > 0 
        ? ((payoutsThisWeek - payoutsLastWeek) / payoutsLastWeek) * 100 
        : 0;

      const totalViews = analyticsData?.reduce((sum, a) => sum + (a.total_views || 0), 0) || 0;
      const totalPayouts = transactionsData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      // Calculate effective CPM based on total views and total payouts
      const effectiveCPM = totalViews > 0 ? (totalPayouts / totalViews) * 1000 : 0;

      setStats({
        totalViews,
        totalPayouts,
        effectiveCPM,
        viewsLastWeek: viewsLastWeekValue,
        payoutsLastWeek,
        viewsChangePercent,
        payoutsChangePercent
      });

      if (brandData?.collection_name) {
        const { data: videosData, error } = await supabase.functions.invoke('fetch-shortimize-videos', {
          body: {
            brandId,
            campaignId,
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
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const { data: rawMetrics } = await supabase
        .from('campaign_video_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('recorded_at', { ascending: true });

      if (rawMetrics && rawMetrics.length > 0) {
        let cumViews = 0, cumLikes = 0, cumShares = 0, cumBookmarks = 0;
        
        const formattedMetrics = rawMetrics.map((m) => {
          // Raw daily values from database
          const dailyViews = m.total_views || 0;
          const dailyLikes = m.total_likes || 0;
          const dailyShares = m.total_shares || 0;
          const dailyBookmarks = m.total_bookmarks || 0;
          
          // Cumulative = running sum of all daily values
          cumViews += dailyViews;
          cumLikes += dailyLikes;
          cumShares += dailyShares;
          cumBookmarks += dailyBookmarks;
          
          return {
            date: format(new Date(m.recorded_at), 'MMM d'),
            // Cumulative values (running sum)
            views: cumViews,
            likes: cumLikes,
            shares: cumShares,
            bookmarks: cumBookmarks,
            // Daily values (raw from DB)
            dailyViews,
            dailyLikes,
            dailyShares,
            dailyBookmarks,
          };
        });
        setMetricsData(formattedMetrics);
      } else {
        setMetricsData([]);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
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
      
      if (data?.synced > 0) {
        toast.success(`Successfully synced metrics`);
      }
      
      await fetchMetrics();
      await fetchData();
    } catch (error) {
      console.error('Error refreshing metrics:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to refresh metrics');
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleMetric = (metric: MetricType) => {
    setActiveMetrics(prev => {
      if (prev.includes(metric)) {
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== metric);
      }
      return [...prev, metric];
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

  const getChartDataKey = (metric: MetricType) => {
    if (chartMode === 'daily') {
      return `daily${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof MetricsData;
    }
    return metric as keyof MetricsData;
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 rounded-lg bg-muted/30 dark:bg-muted/50 space-y-3">
              <Skeleton className="h-4 w-28 dark:bg-muted-foreground/20" />
              <Skeleton className="h-8 w-20 dark:bg-muted-foreground/20" />
              <Skeleton className="h-3 w-24 dark:bg-muted-foreground/20" />
            </div>
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="p-5 rounded-lg bg-muted/30 dark:bg-muted/50 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40 dark:bg-muted-foreground/20" />
            <Skeleton className="h-8 w-8 rounded dark:bg-muted-foreground/20" />
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-7 w-20 rounded-full dark:bg-muted-foreground/20" />
            ))}
          </div>
          <Skeleton className="h-64 w-full dark:bg-muted-foreground/20" />
        </div>
        {/* Videos Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44 dark:bg-muted-foreground/20" />
            <Skeleton className="h-4 w-24 dark:bg-muted-foreground/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-lg bg-muted/30 dark:bg-muted/50 flex gap-4">
                <Skeleton className="w-24 h-36 rounded-lg dark:bg-muted-foreground/20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 dark:bg-muted-foreground/20" />
                  <Skeleton className="h-4 w-full dark:bg-muted-foreground/20" />
                  <Skeleton className="h-4 w-3/4 dark:bg-muted-foreground/20" />
                  <Skeleton className="h-3 w-20 dark:bg-muted-foreground/20" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 bg-stats-card border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Views Generated</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatNumber(metricsData.length > 0 ? metricsData[metricsData.length - 1].views : stats.totalViews)}</p>
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
      </div>

      {/* Metrics Chart */}
      <Card className="p-5 bg-card/30 border-table-border">
        <div className="flex items-center justify-between mb-5">
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
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between mb-5">
          {/* Metric Toggles */}
          <div className="flex items-center gap-2">
            {(['views', 'likes', 'shares', 'bookmarks'] as MetricType[]).map((metric) => (
              <button
                key={metric}
                onClick={() => toggleMetric(metric)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeMetrics.includes(metric)
                    ? 'bg-white/10 text-white'
                    : 'text-muted-foreground hover:text-foreground'
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
          <div className="flex items-center gap-0 bg-muted/30 rounded-lg p-0.5">
            <button
              onClick={() => setChartMode('daily')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                chartMode === 'daily' 
                  ? 'bg-white/10 text-white' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setChartMode('cumulative')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                chartMode === 'cumulative' 
                  ? 'bg-white/10 text-white' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cumulative
            </button>
          </div>
        </div>

        <div className="h-72">
          {metricsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metricsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {(['views', 'likes', 'shares', 'bookmarks'] as MetricType[]).map((metric) => (
                    <linearGradient key={metric} id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={METRIC_COLORS[metric]} stopOpacity={0.2}/>
                      <stop offset="100%" stopColor={METRIC_COLORS[metric]} stopOpacity={0}/>
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
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.3 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatNumber(value)}
                  width={50}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2.5 shadow-lg min-w-[140px]">
                        <p className="text-sm font-medium text-foreground tracking-[-0.5px] mb-2">{label}</p>
                        <div className="space-y-1.5">
                          {payload.map((entry: any) => {
                            const metricName = String(entry.dataKey).replace('daily', '').replace(/([A-Z])/g, ' $1').trim();
                            return (
                              <div key={entry.dataKey} className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-xs text-foreground tracking-[-0.5px] capitalize">
                                    {metricName}
                                  </span>
                                </div>
                                <span className="text-xs font-medium text-foreground tracking-[-0.5px]">
                                  {formatNumber(entry.value)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                  cursor={{ stroke: '#666666', strokeWidth: 1 }}
                />
                {activeMetrics.map((metric) => (
                  <Area
                    key={metric}
                    type="linear"
                    dataKey={getChartDataKey(metric)}
                    name={metric}
                    stroke={METRIC_COLORS[metric]}
                    strokeWidth={2}
                    fill={`url(#gradient-${metric})`}
                    dot={false}
                    activeDot={{ 
                      r: 5, 
                      fill: METRIC_COLORS[metric],
                      stroke: '#1a1a1a',
                      strokeWidth: 2
                    }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm tracking-[-0.5px] gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
