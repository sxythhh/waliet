import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Video, RefreshCw, Eye, Heart, MessageCircle, Share2, Filter, Users, Calendar, DollarSign, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";

interface CachedVideo {
  id: string;
  brand_id: string;
  campaign_id: string;
  shortimize_video_id: string;
  username: string;
  platform: string;
  video_url: string | null;
  title: string | null;
  caption: string | null;
  description: string | null;
  thumbnail_url: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  bookmarks: number | null;
  uploaded_at: string | null;
  cached_at: string;
  updated_at: string;
  user_id: string | null;
  social_account_id: string | null;
  matched_at: string | null;
  week_start_views: number | null;
  week_start_date: string | null;
}

interface LinkedAccount {
  id: string;
  username: string;
  platform: string;
  user_id: string;
  profiles?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface AccountStats {
  username: string;
  platform: string;
  userId: string | null;
  profile: LinkedAccount["profiles"] | null;
  totalVideos: number;
  totalViews: number;
  weeklyViews: number;
  estimatedPayout: number;
  videos: CachedVideo[];
}

interface CampaignVideosPanelProps {
  campaignId: string;
  brandId: string;
  rpmRate: number;
  hashtags?: string[];
}

export function CampaignVideosPanel({ campaignId, brandId, rpmRate, hashtags = [] }: CampaignVideosPanelProps) {
  const [videos, setVideos] = useState<CachedVideo[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  
  // Filters
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "accounts">("accounts");

  useEffect(() => {
    fetchVideos();
    fetchLinkedAccounts();
  }, [campaignId]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cached_campaign_videos")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
      
      if (data && data.length > 0) {
        const latestUpdate = data.reduce((latest, v) => {
          const vDate = new Date(v.updated_at);
          return vDate > latest ? vDate : latest;
        }, new Date(0));
        setLastSynced(latestUpdate);
      }
    } catch (error) {
      console.error("Error fetching cached videos:", error);
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("social_account_campaigns")
        .select(`
          social_account_id,
          social_accounts:social_account_id (
            id,
            username,
            platform,
            user_id,
            profiles:user_id (
              id,
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .eq("campaign_id", campaignId)
        .eq("status", "active");

      if (error) throw error;

      const accounts: LinkedAccount[] = [];
      (data || []).forEach((link: any) => {
        const account = link.social_accounts;
        if (account) {
          accounts.push({
            id: account.id,
            username: account.username,
            platform: account.platform,
            user_id: account.user_id,
            profiles: account.profiles,
          });
        }
      });
      setLinkedAccounts(accounts);
    } catch (error) {
      console.error("Error fetching linked accounts:", error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-campaign-videos", {
        body: { brandId, campaignId },
      });

      if (error) throw error;

      toast.success(`Synced ${data?.totalVideosMatched || 0} matched videos`);
      await fetchVideos();
    } catch (error) {
      console.error("Error syncing videos:", error);
      toast.error("Failed to sync videos");
    } finally {
      setSyncing(false);
    }
  };

  // Calculate account-based statistics
  const accountStats = useMemo((): AccountStats[] => {
    const statsMap = new Map<string, AccountStats>();
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    // Initialize with linked accounts
    linkedAccounts.forEach(account => {
      const key = `${account.platform.toLowerCase()}:${account.username.toLowerCase()}`;
      statsMap.set(key, {
        username: account.username,
        platform: account.platform,
        userId: account.user_id,
        profile: account.profiles || null,
        totalVideos: 0,
        totalViews: 0,
        weeklyViews: 0,
        estimatedPayout: 0,
        videos: [],
      });
    });

    // Aggregate video stats
    videos.forEach(video => {
      const key = `${video.platform.toLowerCase()}:${video.username.toLowerCase()}`;
      let stats = statsMap.get(key);
      
      if (!stats) {
        // Unmatched video - create entry
        stats = {
          username: video.username,
          platform: video.platform,
          userId: video.user_id,
          profile: null,
          totalVideos: 0,
          totalViews: 0,
          weeklyViews: 0,
          estimatedPayout: 0,
          videos: [],
        };
        statsMap.set(key, stats);
      }

      stats.totalVideos++;
      stats.totalViews += video.views || 0;
      stats.videos.push(video);

      // Calculate weekly views
      if (video.uploaded_at) {
        const uploadDate = parseISO(video.uploaded_at);
        if (isWithinInterval(uploadDate, { start: weekStart, end: weekEnd })) {
          stats.weeklyViews += video.views || 0;
        }
      }
      
      // Alternative: Use week_start tracking if available
      if (video.week_start_date && video.week_start_views !== null) {
        const currentViews = video.views || 0;
        const weekStartViews = video.week_start_views || 0;
        stats.weeklyViews = Math.max(stats.weeklyViews, currentViews - weekStartViews);
      }
    });

    // Calculate estimated payouts
    statsMap.forEach(stats => {
      stats.estimatedPayout = (stats.weeklyViews / 1000) * rpmRate;
    });

    return Array.from(statsMap.values())
      .sort((a, b) => b.totalViews - a.totalViews);
  }, [videos, linkedAccounts, rpmRate]);

  // Filter videos
  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      // Account filter
      if (filterAccount !== "all") {
        const key = `${video.platform.toLowerCase()}:${video.username.toLowerCase()}`;
        if (key !== filterAccount.toLowerCase()) return false;
      }
      
      // Platform filter
      if (filterPlatform !== "all" && video.platform.toLowerCase() !== filterPlatform.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          video.username.toLowerCase().includes(query) ||
          video.title?.toLowerCase().includes(query) ||
          video.caption?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [videos, filterAccount, filterPlatform, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    const vids = filterAccount === "all" ? videos : filteredVideos;
    return {
      views: vids.reduce((sum, v) => sum + (v.views || 0), 0),
      likes: vids.reduce((sum, v) => sum + (v.likes || 0), 0),
      comments: vids.reduce((sum, v) => sum + (v.comments || 0), 0),
      shares: vids.reduce((sum, v) => sum + (v.shares || 0), 0),
      videos: vids.length,
    };
  }, [videos, filteredVideos, filterAccount]);

  // Get unique platforms for filter
  const platforms = useMemo(() => {
    const set = new Set(videos.map(v => v.platform.toLowerCase()));
    return Array.from(set);
  }, [videos]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Video className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">Campaign Videos</h3>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              {videos.length} videos • {accountStats.filter(a => a.videos.length > 0).length} accounts
              {lastSynced && ` • Last synced ${format(lastSynced, "MMM d, h:mm a")}`}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={syncing}
          size="sm"
          variant="outline"
          className="h-8 gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Videos"}
        </Button>
      </div>

      {/* Hashtags Display */}
      {hashtags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Filtering by:</span>
          {hashtags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag.replace(/^#/, "")}
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="Filter by account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accountStats.map(stats => (
                <SelectItem 
                  key={`${stats.platform}:${stats.username}`} 
                  value={`${stats.platform}:${stats.username}`}
                >
                  @{stats.username} ({stats.platform})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map(platform => (
              <SelectItem key={platform} value={platform} className="capitalize">
                {platform}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[200px] h-8 text-sm"
        />

        <div className="ml-auto flex gap-1">
          <Button
            variant={viewMode === "accounts" ? "secondary" : "ghost"}
            size="sm"
            className="h-8"
            onClick={() => setViewMode("accounts")}
          >
            <Users className="h-3.5 w-3.5 mr-1" />
            By Account
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-8"
            onClick={() => setViewMode("table")}
          >
            <Video className="h-3.5 w-3.5 mr-1" />
            All Videos
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-muted/10 rounded-lg p-3 flex items-center gap-3">
          <Video className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Videos</p>
            <p className="text-sm font-semibold tabular-nums">{totals.videos.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-muted/10 rounded-lg p-3 flex items-center gap-3">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Views</p>
            <p className="text-sm font-semibold tabular-nums">{totals.views.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-muted/10 rounded-lg p-3 flex items-center gap-3">
          <Heart className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Likes</p>
            <p className="text-sm font-semibold tabular-nums">{totals.likes.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-muted/10 rounded-lg p-3 flex items-center gap-3">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Comments</p>
            <p className="text-sm font-semibold tabular-nums">{totals.comments.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-muted/10 rounded-lg p-3 flex items-center gap-3">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Shares</p>
            <p className="text-sm font-semibold tabular-nums">{totals.shares.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Account-Based View */}
      {viewMode === "accounts" && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground font-inter tracking-[-0.5px] flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Per-Account Analytics
          </h4>
          
          {accountStats.filter(a => a.videos.length > 0).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/10 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm font-inter tracking-[-0.5px]">No accounts with videos</p>
              <p className="text-xs text-muted-foreground/70 mt-1 font-inter tracking-[-0.5px]">
                Click "Sync Videos" to fetch the latest data
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/30 hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground font-medium">Account</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium">Platform</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium">Matched User</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium text-right">Videos</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium text-right">Total Views</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium text-right">Weekly Views</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium text-right">Est. Weekly Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountStats.filter(a => a.videos.length > 0).map((stats) => (
                    <TableRow 
                      key={`${stats.platform}:${stats.username}`}
                      className="border-b border-border/20 cursor-pointer hover:bg-muted/20"
                      onClick={() => setFilterAccount(`${stats.platform}:${stats.username}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          @{stats.username}
                          {stats.userId && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Matched
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{stats.platform}</TableCell>
                      <TableCell>
                        {stats.profile ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={stats.profile.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {stats.profile.username?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{stats.profile.full_name || stats.profile.username}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{stats.totalVideos}</TableCell>
                      <TableCell className="text-right tabular-nums">{stats.totalViews.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{stats.weeklyViews.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-green-500">
                        ${stats.estimatedPayout.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        filteredVideos.length > 0 ? (
          <div className="rounded-xl bg-muted/10 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/30 hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground font-medium">Username</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium">Platform</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium">Title</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium">Uploaded</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium text-right">Views</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium text-right">Likes</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium text-right">Est. Payout</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVideos.map((video) => (
                    <TableRow 
                      key={video.id}
                      className="border-b border-border/20 hover:bg-muted/20"
                    >
                      <TableCell className="text-sm font-medium">@{video.username}</TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">{video.platform}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{video.title || video.caption || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {video.uploaded_at ? format(parseISO(video.uploaded_at), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums">
                        {(video.views || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums">
                        {(video.likes || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium text-green-500 tabular-nums">
                        ${(((video.views || 0) / 1000) * rpmRate).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {video.user_id ? (
                          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/30">
                            Matched
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                            Unmatched
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {video.video_url && (
                          <a 
                            href={video.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary text-sm hover:underline"
                          >
                            View
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/10 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              <Video className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm font-inter tracking-[-0.5px]">No videos found</p>
            <p className="text-xs text-muted-foreground/70 mt-1 font-inter tracking-[-0.5px]">
              {videos.length === 0 ? 'Click "Sync Videos" to fetch the latest data' : "Try adjusting your filters"}
            </p>
          </div>
        )
      )}
    </div>
  );
}
