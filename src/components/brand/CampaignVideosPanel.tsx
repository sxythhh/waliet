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
      <div className="space-y-5">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 font-['Inter'] tracking-[-0.5px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold text-foreground">Campaign Videos</h3>
          <p className="text-[13px] text-muted-foreground">
            {videos.length} videos · {accountStats.filter(a => a.videos.length > 0).length} accounts
            {lastSynced && <span className="text-muted-foreground/60"> · Updated {format(lastSynced, "MMM d, h:mm a")}</span>}
          </p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={syncing}
          size="sm"
          className="h-8 px-3 gap-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync"}
        </Button>
      </div>

      {/* Hashtags Display */}
      {hashtags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70 font-medium">Tracking:</span>
          {hashtags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              #{tag.replace(/^#/, "")}
            </span>
          ))}
        </div>
      )}

      {/* Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-[180px] h-8 text-xs border-border/50 bg-background">
            <User className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Accounts</SelectItem>
            {accountStats.map(stats => (
              <SelectItem 
                key={`${stats.platform}:${stats.username}`} 
                value={`${stats.platform}:${stats.username}`}
                className="text-xs"
              >
                @{stats.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[130px] h-8 text-xs border-border/50 bg-background">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Platforms</SelectItem>
            {platforms.map(platform => (
              <SelectItem key={platform} value={platform} className="text-xs capitalize">
                {platform}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[160px] h-8 text-xs border-border/50 bg-background"
        />

        <div className="ml-auto flex rounded-lg border border-border/50 p-0.5 bg-muted/30">
          <button
            onClick={() => setViewMode("accounts")}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-colors ${
              viewMode === "accounts" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Accounts
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-colors ${
              viewMode === "table" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Videos
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Videos", value: totals.videos, icon: Video },
          { label: "Views", value: totals.views, icon: Eye },
          { label: "Likes", value: totals.likes, icon: Heart },
          { label: "Comments", value: totals.comments, icon: MessageCircle },
          { label: "Shares", value: totals.shares, icon: Share2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border/40 bg-card/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Account-Based View */}
      {viewMode === "accounts" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-[13px] font-medium text-foreground">Per-Account Analytics</h4>
          </div>
          
          {accountStats.filter(a => a.videos.length > 0).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center rounded-xl border border-dashed border-border/60 bg-muted/5">
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2.5">
                <Users className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <p className="text-[13px] text-muted-foreground font-medium">No accounts with videos</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Click "Sync" to fetch the latest data
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Account</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Platform</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Creator</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium text-right h-9">Videos</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium text-right h-9">Total Views</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium text-right h-9">Weekly</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium text-right h-9">Est. Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountStats.filter(a => a.videos.length > 0).map((stats) => (
                    <TableRow 
                      key={`${stats.platform}:${stats.username}`}
                      className="border-b border-border/30 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setFilterAccount(`${stats.platform}:${stats.username}`)}
                    >
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-foreground">@{stats.username}</span>
                          {stats.userId && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                              Linked
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="text-[13px] capitalize text-muted-foreground">{stats.platform}</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {stats.profile ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={stats.profile.avatar_url || undefined} />
                              <AvatarFallback className="text-[9px] bg-muted">
                                {stats.profile.username?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[13px] text-foreground">{stats.profile.full_name || stats.profile.username}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <span className="text-[13px] tabular-nums text-foreground">{stats.totalVideos}</span>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <span className="text-[13px] tabular-nums text-foreground">{stats.totalViews.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <span className="text-[13px] tabular-nums text-foreground">{stats.weeklyViews.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <span className="text-[13px] tabular-nums font-semibold text-emerald-600">
                          ${stats.estimatedPayout.toFixed(2)}
                        </span>
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
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Username</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Platform</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Title</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Uploaded</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium text-right h-9">Views</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium text-right h-9">Likes</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium text-right h-9">Payout</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVideos.map((video) => (
                    <TableRow 
                      key={video.id}
                      className="border-b border-border/30 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="py-2.5">
                        <span className="text-[13px] font-medium text-foreground">@{video.username}</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="text-[13px] capitalize text-muted-foreground">{video.platform}</span>
                      </TableCell>
                      <TableCell className="py-2.5 max-w-[180px]">
                        <span className="text-[13px] text-foreground truncate block">{video.title || video.caption || "—"}</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="text-[13px] text-muted-foreground">
                          {video.uploaded_at ? format(parseISO(video.uploaded_at), "MMM d") : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <span className="text-[13px] tabular-nums text-foreground">{(video.views || 0).toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <span className="text-[13px] tabular-nums text-foreground">{(video.likes || 0).toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <span className="text-[13px] tabular-nums font-semibold text-emerald-600">
                          ${(((video.views || 0) / 1000) * rpmRate).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {video.user_id ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                            Matched
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                            Unmatched
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5">
                        {video.video_url && (
                          <a 
                            href={video.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[13px] text-primary hover:underline font-medium"
                          >
                            View →
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
          <div className="flex flex-col items-center justify-center py-14 text-center rounded-xl border border-dashed border-border/60 bg-muted/5">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2.5">
              <Video className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <p className="text-[13px] text-muted-foreground font-medium">No videos found</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {videos.length === 0 ? 'Click "Sync" to fetch the latest data' : "Try adjusting your filters"}
            </p>
          </div>
        )
      )}
    </div>
  );
}
