import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Play, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import tiktokLogo from "@/assets/tiktok-logo-black.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

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
  viewsChange: number;
  payoutsChange: number;
}

const THUMBNAIL_BASE_URL = "https://wtmetnsnhqfbswfddkdr.supabase.co/storage/v1/object/public/ads_tracked_thumbnails";

const extractPlatformId = (adLink: string, platform: string): string | null => {
  try {
    if (platform?.toLowerCase() === 'tiktok') {
      const match = adLink.match(/\/video\/(\d+)/);
      return match ? match[1] : null;
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
  const [stats, setStats] = useState<StatsData>({ totalViews: 0, totalPayouts: 0, effectiveCPM: 0, viewsChange: 0, payoutsChange: 0 });
  const [topVideos, setTopVideos] = useState<VideoData[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative'>('cumulative');
  const [isLoading, setIsLoading] = useState(true);
  const [brand, setBrand] = useState<{ collection_name: string | null } | null>(null);

  useEffect(() => {
    fetchData();
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

      const totalViews = analyticsData?.reduce((sum, a) => sum + (a.total_views || 0), 0) || 0;
      const paidViews = analyticsData?.reduce((sum, a) => sum + (a.paid_views || 0), 0) || 0;
      const totalPayouts = transactionsData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const effectiveCPM = paidViews > 0 ? (totalPayouts / paidViews) * 1000 : 0;

      setStats({
        totalViews,
        totalPayouts,
        effectiveCPM,
        viewsChange: 0,
        payoutsChange: 0
      });

      // Generate mock chart data based on transactions
      const chartPoints = generateChartData(transactionsData || []);
      setChartData(chartPoints);

      // Fetch top videos from Shortimize if collection name exists
      if (brandData?.collection_name) {
        const { data: videosData, error } = await supabase.functions.invoke('fetch-shortimize-videos', {
          body: {
            brandId,
            collectionName: brandData.collection_name,
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
        <Card className="p-4 bg-card/30 border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Views Generated</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatNumber(stats.totalViews)}</p>
              <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">From {formatNumber(stats.viewsChange)} (last 4 weeks)</p>
          </div>
        </Card>

        <Card className="p-4 bg-card/30 border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Effective CPM</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(stats.effectiveCPM)}</p>
              <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">Running Efficiently</p>
          </div>
        </Card>

        <Card className="p-4 bg-card/30 border-table-border">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Total Payouts</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold tracking-[-0.5px]">{formatCurrency(stats.totalPayouts)}</p>
              <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">From {formatCurrency(stats.payoutsChange)} (last 4 weeks)</p>
          </div>
        </Card>
      </div>

      {/* Chart Area */}
      <Card className="p-4 bg-card/30 border-table-border">
        <div className="flex items-center justify-end mb-4">
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
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area
                  type="monotone"
                  dataKey={chartMode}
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm tracking-[-0.5px]">
              No data available yet
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <p className="text-sm text-muted-foreground tracking-[-0.5px] line-clamp-3 group-hover:underline">
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
              No videos found. Make sure your brand has a Shortimize collection configured.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}