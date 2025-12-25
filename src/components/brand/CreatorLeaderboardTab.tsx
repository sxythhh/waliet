import { useState, useEffect, useMemo } from "react";
import { Trophy, TrendingUp, Eye, DollarSign, Medal, ArrowUpDown, ChevronDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import xLogoBlack from "@/assets/x-logo.png";
import xLogoWhite from "@/assets/x-logo-light.png";

interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  total_views: number;
  total_earnings: number;
  video_count: number;
  avg_views_per_video: number;
  social_accounts: {
    platform: string;
    username: string;
  }[];
}

interface Campaign {
  id: string;
  title: string;
  type: 'campaign' | 'boost';
}

interface CreatorLeaderboardTabProps {
  brandId: string;
}

type SortBy = 'earnings' | 'views' | 'videos' | 'avg_views';
type TimeRange = 'all_time' | 'this_month' | 'this_week';

const getPlatformLogos = (isDark: boolean): Record<string, string> => ({
  tiktok: isDark ? tiktokLogoWhite : tiktokLogoBlack,
  instagram: isDark ? instagramLogoWhite : instagramLogoBlack,
  youtube: isDark ? youtubeLogoWhite : youtubeLogoBlack,
  x: isDark ? xLogoWhite : xLogoBlack
});

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const getRankBadge = (rank: number) => {
  if (rank === 1) return { icon: '🥇', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  if (rank === 2) return { icon: '🥈', color: 'bg-slate-400/10 text-slate-400 border-slate-400/20' };
  if (rank === 3) return { icon: '🥉', color: 'bg-amber-600/10 text-amber-600 border-amber-600/20' };
  return { icon: `#${rank}`, color: 'bg-muted text-muted-foreground border-border' };
};

export function CreatorLeaderboardTab({ brandId }: CreatorLeaderboardTabProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const PLATFORM_LOGOS = useMemo(() => getPlatformLogos(isDark), [isDark]);
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("earnings");
  const [timeRange, setTimeRange] = useState<TimeRange>("all_time");

  useEffect(() => {
    fetchCampaigns();
  }, [brandId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [brandId, selectedCampaign, sortBy, timeRange]);

  const fetchCampaigns = async () => {
    const [campaignsResult, boostsResult] = await Promise.all([
      supabase.from('campaigns').select('id, title').eq('brand_id', brandId),
      supabase.from('bounty_campaigns').select('id, title').eq('brand_id', brandId)
    ]);

    const allCampaigns: Campaign[] = [
      ...(campaignsResult.data || []).map(c => ({ ...c, type: 'campaign' as const })),
      ...(boostsResult.data || []).map(b => ({ ...b, type: 'boost' as const }))
    ];
    setCampaigns(allCampaigns);
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Build date filter
      let dateFilter: { start: Date; end: Date } | null = null;
      const now = new Date();
      if (timeRange === 'this_month') {
        dateFilter = { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
      } else if (timeRange === 'this_week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        dateFilter = { start: weekStart, end: now };
      }

      // Fetch video submissions
      let submissionsQuery = supabase
        .from('video_submissions')
        .select('creator_id, views, source_type, source_id, submitted_at')
        .eq('brand_id', brandId)
        .eq('status', 'approved');

      if (selectedCampaign !== 'all') {
        submissionsQuery = submissionsQuery.eq('source_id', selectedCampaign);
      }

      if (dateFilter) {
        submissionsQuery = submissionsQuery
          .gte('submitted_at', dateFilter.start.toISOString())
          .lte('submitted_at', dateFilter.end.toISOString());
      }

      const { data: submissions } = await submissionsQuery;

      // Fetch wallet transactions for earnings
      let transactionsQuery = supabase
        .from('wallet_transactions')
        .select('user_id, amount, metadata, created_at')
        .eq('type', 'earning');

      if (dateFilter) {
        transactionsQuery = transactionsQuery
          .gte('created_at', dateFilter.start.toISOString())
          .lte('created_at', dateFilter.end.toISOString());
      }

      const { data: transactions } = await transactionsQuery;

      // Aggregate by creator
      const creatorStats = new Map<string, {
        views: number;
        earnings: number;
        videos: number;
      }>();

      submissions?.forEach(s => {
        const stats = creatorStats.get(s.creator_id) || { views: 0, earnings: 0, videos: 0 };
        stats.views += s.views || 0;
        stats.videos += 1;
        creatorStats.set(s.creator_id, stats);
      });

      // Add earnings
      transactions?.forEach(tx => {
        const metadata = tx.metadata as { campaign_id?: string; boost_id?: string } | null;
        const campaignId = metadata?.campaign_id || metadata?.boost_id;
        
        // Only count earnings for selected campaign or all campaigns for this brand
        if (selectedCampaign === 'all' || campaignId === selectedCampaign) {
          const campaign = campaigns.find(c => c.id === campaignId);
          if (campaign || selectedCampaign === 'all') {
            const stats = creatorStats.get(tx.user_id);
            if (stats) {
              stats.earnings += tx.amount || 0;
            }
          }
        }
      });

      // Fetch creator profiles
      const creatorIds = Array.from(creatorStats.keys());
      if (creatorIds.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', creatorIds);

      const { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select('user_id, platform, username')
        .in('user_id', creatorIds);

      // Build leaderboard entries
      const entries: LeaderboardEntry[] = [];
      
      profiles?.forEach(profile => {
        const stats = creatorStats.get(profile.id);
        if (stats && stats.videos > 0) {
          entries.push({
            id: profile.id,
            rank: 0,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            total_views: stats.views,
            total_earnings: stats.earnings,
            video_count: stats.videos,
            avg_views_per_video: stats.videos > 0 ? Math.round(stats.views / stats.videos) : 0,
            social_accounts: (socialAccounts || [])
              .filter(sa => sa.user_id === profile.id)
              .map(sa => ({ platform: sa.platform, username: sa.username }))
          });
        }
      });

      // Sort entries
      entries.sort((a, b) => {
        switch (sortBy) {
          case 'earnings': return b.total_earnings - a.total_earnings;
          case 'views': return b.total_views - a.total_views;
          case 'videos': return b.video_count - a.video_count;
          case 'avg_views': return b.avg_views_per_video - a.avg_views_per_video;
          default: return b.total_earnings - a.total_earnings;
        }
      });

      // Assign ranks
      entries.forEach((entry, idx) => {
        entry.rank = idx + 1;
      });

      setLeaderboard(entries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Calculate totals
  const totals = useMemo(() => ({
    views: leaderboard.reduce((sum, e) => sum + e.total_views, 0),
    earnings: leaderboard.reduce((sum, e) => sum + e.total_earnings, 0),
    videos: leaderboard.reduce((sum, e) => sum + e.video_count, 0),
    creators: leaderboard.length
  }), [leaderboard]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold font-instrument tracking-tight flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Creator Leaderboard
            </h2>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              Top performing creators ranked by {sortBy === 'earnings' ? 'earnings' : sortBy === 'views' ? 'views' : sortBy === 'videos' ? 'video count' : 'average views'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-full md:w-[220px] bg-muted/30">
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-full md:w-[160px] bg-muted/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)} className="w-full md:w-auto">
            <TabsList className="bg-muted/30 w-full md:w-auto">
              <TabsTrigger value="earnings" className="flex-1 md:flex-initial gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Earnings</span>
              </TabsTrigger>
              <TabsTrigger value="views" className="flex-1 md:flex-initial gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Views</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex-1 md:flex-initial gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Videos</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Card className="bg-muted/20 border-border">
            <CardContent className="p-3">
              <p className="text-lg font-bold font-instrument">{totals.creators}</p>
              <p className="text-xs text-muted-foreground">Total Creators</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/20 border-border">
            <CardContent className="p-3">
              <p className="text-lg font-bold font-instrument">{formatNumber(totals.views)}</p>
              <p className="text-xs text-muted-foreground">Total Views</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/20 border-border">
            <CardContent className="p-3">
              <p className="text-lg font-bold font-instrument">${totals.earnings.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Total Paid</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/20 border-border">
            <CardContent className="p-3">
              <p className="text-lg font-bold font-instrument">{totals.videos}</p>
              <p className="text-xs text-muted-foreground">Total Videos</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6">
        {leaderboard.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium font-instrument">No data yet</p>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              Once creators start submitting videos, their rankings will appear here
            </p>
          </Card>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {/* 2nd Place */}
                <div className="order-1 flex items-end justify-center">
                  {topThree[1] && (
                    <Card className="w-full bg-slate-500/5 border-slate-500/20 hover:bg-slate-500/10 transition-colors">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">🥈</div>
                        <Avatar className="h-14 w-14 mx-auto mb-2">
                          <AvatarImage src={topThree[1].avatar_url || undefined} />
                          <AvatarFallback className="bg-slate-500/20 text-slate-300">
                            {topThree[1].username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm truncate">{topThree[1].full_name || topThree[1].username}</p>
                        <p className="text-xs text-muted-foreground mb-2">@{topThree[1].username}</p>
                        <div className="space-y-1">
                          <p className="text-lg font-bold">
                            {sortBy === 'earnings' ? `$${topThree[1].total_earnings.toFixed(0)}` : 
                             sortBy === 'views' ? formatNumber(topThree[1].total_views) :
                             sortBy === 'videos' ? topThree[1].video_count : 
                             formatNumber(topThree[1].avg_views_per_video)}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {sortBy === 'earnings' ? 'Earned' : sortBy === 'views' ? 'Views' : sortBy === 'videos' ? 'Videos' : 'Avg Views'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* 1st Place */}
                <div className="order-2 flex items-end justify-center">
                  {topThree[0] && (
                    <Card className="w-full bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 transition-colors">
                      <CardContent className="p-4 text-center">
                        <div className="text-4xl mb-2">🥇</div>
                        <Avatar className="h-16 w-16 mx-auto mb-2 ring-2 ring-amber-500/30">
                          <AvatarImage src={topThree[0].avatar_url || undefined} />
                          <AvatarFallback className="bg-amber-500/20 text-amber-300">
                            {topThree[0].username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-sm truncate">{topThree[0].full_name || topThree[0].username}</p>
                        <p className="text-xs text-muted-foreground mb-2">@{topThree[0].username}</p>
                        <div className="space-y-1">
                          <p className="text-xl font-bold text-amber-500">
                            {sortBy === 'earnings' ? `$${topThree[0].total_earnings.toFixed(0)}` : 
                             sortBy === 'views' ? formatNumber(topThree[0].total_views) :
                             sortBy === 'videos' ? topThree[0].video_count : 
                             formatNumber(topThree[0].avg_views_per_video)}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {sortBy === 'earnings' ? 'Earned' : sortBy === 'views' ? 'Views' : sortBy === 'videos' ? 'Videos' : 'Avg Views'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* 3rd Place */}
                <div className="order-3 flex items-end justify-center">
                  {topThree[2] && (
                    <Card className="w-full bg-amber-600/5 border-amber-600/20 hover:bg-amber-600/10 transition-colors">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">🥉</div>
                        <Avatar className="h-12 w-12 mx-auto mb-2">
                          <AvatarImage src={topThree[2].avatar_url || undefined} />
                          <AvatarFallback className="bg-amber-600/20 text-amber-400">
                            {topThree[2].username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm truncate">{topThree[2].full_name || topThree[2].username}</p>
                        <p className="text-xs text-muted-foreground mb-2">@{topThree[2].username}</p>
                        <div className="space-y-1">
                          <p className="text-lg font-bold">
                            {sortBy === 'earnings' ? `$${topThree[2].total_earnings.toFixed(0)}` : 
                             sortBy === 'views' ? formatNumber(topThree[2].total_views) :
                             sortBy === 'videos' ? topThree[2].video_count : 
                             formatNumber(topThree[2].avg_views_per_video)}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {sortBy === 'earnings' ? 'Earned' : sortBy === 'views' ? 'Views' : sortBy === 'videos' ? 'Videos' : 'Avg Views'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Rest of the leaderboard */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((entry) => {
                  const rankBadge = getRankBadge(entry.rank);
                  return (
                    <Card key={entry.id} className="hover:bg-muted/30 transition-colors border-border">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={`w-10 h-10 flex items-center justify-center text-sm font-mono ${rankBadge.color}`}>
                            {rankBadge.icon}
                          </Badge>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={entry.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted">
                              {entry.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm font-inter tracking-[-0.5px] truncate">
                              {entry.full_name || entry.username}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">@{entry.username}</p>
                              <div className="flex gap-1">
                                {entry.social_accounts.slice(0, 2).map((sa, idx) => (
                                  <img 
                                    key={idx}
                                    src={PLATFORM_LOGOS[sa.platform]} 
                                    alt={sa.platform}
                                    className="h-3.5 w-3.5"
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right space-y-0.5">
                            <p className="font-semibold text-sm font-inter">
                              {sortBy === 'earnings' ? `$${entry.total_earnings.toFixed(0)}` : 
                               sortBy === 'views' ? formatNumber(entry.total_views) :
                               sortBy === 'videos' ? entry.video_count : 
                               formatNumber(entry.avg_views_per_video)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {entry.video_count} videos • {formatNumber(entry.total_views)} views
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}
