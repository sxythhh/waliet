import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Play, ExternalLink, ArrowUpDown, X, User, Clock } from "lucide-react";
import { format, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, formatDistanceToNow } from "date-fns";
import type { TimeframeOption } from "@/components/dashboard/BrandCampaignDetailView";
import { useTheme } from "@/components/ThemeProvider";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";

interface CachedVideo {
  id: string;
  shortimize_video_id: string;
  username: string;
  platform: string;
  video_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  caption: string | null;
  description: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  uploaded_at: string | null;
  cached_at: string;
}

interface SyncStatus {
  last_synced_at: string | null;
  sync_status: string;
  videos_synced: number;
}

interface ShortimizeVideo {
  ad_id: string;
  username: string;
  platform: string;
  ad_link: string;
  uploaded_at: string;
  title: string;
  latest_views: number;
  latest_likes: number;
  latest_comments: number;
  latest_bookmarks: number;
  latest_shares: number;
  latest_engagement: number | null;
  latest_updated_at: string;
  removed: boolean;
  private: boolean;
  creator_name?: string;
}
interface CreatorInfo {
  id: string;
  name: string;
  avatar_url: string | null;
  username: string;
  email: string | null;
  social_accounts: {
    platform: string;
    username: string;
    account_link: string | null;
    avatar_url?: string | null;
    follower_count?: number | null;
  }[];
  total_views: number;
  total_earnings: number;
}
interface ShortimizeVideosTableProps {
  brandId: string;
  collectionName?: string;
  campaignId?: string;
  timeframe?: TimeframeOption;
}
type SortField = 'uploaded_at' | 'views' | 'likes' | 'comments' | 'shares';
type SortDirection = 'asc' | 'desc';
const SORT_OPTIONS = [{
  value: 'uploaded_at',
  label: 'Most Recent'
}, {
  value: 'views',
  label: 'Most Viewed'
}, {
  value: 'likes',
  label: 'Most Liked'
}, {
  value: 'comments',
  label: 'Most Comments'
}, {
  value: 'shares',
  label: 'Most Shares'
}] as const;
const THUMBNAIL_BASE_URL = "https://wtmetnsnhqfbswfddkdr.supabase.co/storage/v1/object/public/ads_tracked_thumbnails";

// Extract platform-specific video ID from ad_link
const extractPlatformId = (adLink: string, platform: string): string | null => {
  try {
    if (platform?.toLowerCase() === 'tiktok') {
      // TikTok: https://www.tiktok.com/@username/video/VIDEO_ID or /photo/VIDEO_ID (slideshows)
      const match = adLink.match(/\/(video|photo)\/(\d+)/);
      return match ? match[2] : null;
    } else if (platform?.toLowerCase() === 'instagram') {
      // Instagram: https://www.instagram.com/reel/SHORTCODE/ or /p/SHORTCODE/
      const match = adLink.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      return match ? match[2] : null;
    } else if (platform?.toLowerCase() === 'youtube') {
      // YouTube: https://www.youtube.com/shorts/VIDEO_ID or watch?v=VIDEO_ID
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

// Calculate date range from timeframe
const getDateRangeFromTimeframe = (timeframe: TimeframeOption | undefined): {
  start: Date | undefined;
  end: Date | undefined;
} => {
  if (!timeframe || timeframe === 'all_time') {
    return {
      start: undefined,
      end: undefined
    };
  }
  const now = new Date();
  const today = startOfDay(now);
  switch (timeframe) {
    case 'today':
      return {
        start: today,
        end: now
      };
    case 'this_week':
      return {
        start: startOfWeek(now, {
          weekStartsOn: 1
        }),
        end: endOfWeek(now, {
          weekStartsOn: 1
        })
      };
    case 'last_week':
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
    case 'this_month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case 'last_month':
      {
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      }
    default:
      return {
        start: undefined,
        end: undefined
      };
  }
};
export function ShortimizeVideosTable({
  brandId,
  collectionName,
  campaignId,
  timeframe
}: ShortimizeVideosTableProps) {
  const {
    resolvedTheme
  } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [videos, setVideos] = useState<CachedVideo[]>([]);
  const [creatorMatches, setCreatorMatches] = useState<Map<string, CreatorInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [sortField, setSortField] = useState<SortField>('views');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [usernameFilter, setUsernameFilter] = useState<string>('');
  const [availableUsernames, setAvailableUsernames] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    total_pages: 0
  });
  const [selectedCreator, setSelectedCreator] = useState<CreatorInfo | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Platform logos based on theme
  const platformLogos = useMemo(() => ({
    tiktok: isDark ? tiktokLogoWhite : tiktokLogoBlack,
    instagram: isDark ? instagramLogoWhite : instagramLogoBlack,
    youtube: isDark ? youtubeLogoWhite : youtubeLogoBlack
  }), [isDark]);

  // Calculate effective date range - custom dates override timeframe
  const {
    startDate,
    endDate
  } = useMemo(() => {
    if (customStartDate || customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate
      };
    }
    const range = getDateRangeFromTimeframe(timeframe);
    return {
      startDate: range.start,
      endDate: range.end
    };
  }, [timeframe, customStartDate, customEndDate]);
  const fetchCreatorMatches = async (usernames: string[]) => {
    if (usernames.length === 0) return;
    try {
      const {
        data: accountsData,
        error: accountsError
      } = await supabase.from('social_accounts').select('id, username, platform, user_id, account_link, avatar_url, follower_count, profiles:user_id(id, full_name, username, avatar_url, email)').in('username', usernames);
      if (accountsError) throw accountsError;

      const userIds = [...new Set(accountsData?.map(a => a.user_id).filter(Boolean) || [])];
      const { data: walletsData } = await supabase.from('wallets').select('user_id, total_earned').in('user_id', userIds);
      const walletMap = new Map(walletsData?.map(w => [w.user_id, w.total_earned || 0]) || []);

      const userAccountsMap = new Map<string, typeof accountsData>();
      accountsData?.forEach(account => {
        if (account.user_id) {
          const existing = userAccountsMap.get(account.user_id) || [];
          existing.push(account);
          userAccountsMap.set(account.user_id, existing);
        }
      });
      const matches = new Map<string, CreatorInfo>();
      accountsData?.forEach((account: any) => {
        const key = `${account.username.toLowerCase()}_${account.platform.toLowerCase()}`;
        const creatorName = account.profiles?.full_name || account.profiles?.username || null;
        if (creatorName && account.user_id) {
          const userAccounts = userAccountsMap.get(account.user_id) || [];
          matches.set(key, {
            id: account.user_id,
            name: creatorName,
            avatar_url: account.profiles?.avatar_url || null,
            username: account.profiles?.username || account.username,
            email: account.profiles?.email || null,
            social_accounts: userAccounts.map((a: any) => ({
              platform: a.platform,
              username: a.username,
              account_link: a.account_link,
              avatar_url: a.avatar_url,
              follower_count: a.follower_count
            })),
            total_views: 0,
            total_earnings: walletMap.get(account.user_id) || 0
          });
        }
      });
      setCreatorMatches(matches);
    } catch (error) {
      console.error('Error fetching creator matches:', error);
    }
  };

  // Fetch sync status
  const fetchSyncStatus = async () => {
    if (!campaignId) return;
    const { data } = await supabase
      .from('campaign_video_sync_status')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();
    if (data) {
      setSyncStatus({
        last_synced_at: data.last_synced_at,
        sync_status: data.sync_status,
        videos_synced: data.videos_synced || 0
      });
    }
  };

  // Fetch cached videos from database
  const fetchCachedVideos = useCallback(async () => {
    if (!campaignId) return;
    
    console.log('[ShortimizeVideosTable] Fetching cached videos for campaign:', campaignId);
    setIsLoading(true);

    try {
      // Build query with filters
      let query = supabase
        .from('cached_campaign_videos')
        .select('*', { count: 'exact' })
        .eq('campaign_id', campaignId);

      // Apply username filter
      if (usernameFilter) {
        query = query.eq('username', usernameFilter);
      }

      // Apply date filters
      if (startDate) {
        query = query.gte('uploaded_at', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('uploaded_at', format(endDate, 'yyyy-MM-dd') + 'T23:59:59');
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setVideos(data || []);
      setHasApiKey(true);
      
      // Update pagination
      const total = count || 0;
      setPagination(prev => ({
        ...prev,
        total,
        total_pages: Math.ceil(total / prev.limit)
      }));

      // Get unique usernames for filter dropdown
      if (!usernameFilter && data && data.length > 0) {
        const uniqueUsernames = [...new Set(data.map(v => v.username))];
        setAvailableUsernames(prev => {
          const combined = new Set([...prev, ...uniqueUsernames]);
          return [...combined].sort();
        });
      }

      // Fetch creator matches
      if (data && data.length > 0) {
        const uniqueUsernames = [...new Set(data.map(v => v.username))];
        await fetchCreatorMatches(uniqueUsernames);
      }

    } catch (error: any) {
      console.error('[ShortimizeVideosTable] Error fetching cached videos:', error);
      toast.error('Failed to fetch videos');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, pagination.page, pagination.limit, sortField, sortDirection, startDate, endDate, usernameFilter]);

  // Trigger a sync of videos from Shortimize
  const triggerSync = async (forceRefresh = false) => {
    if (!campaignId) return;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-campaign-account-videos', {
        body: { campaignId, forceRefresh }
      });

      if (error) throw error;
      
      if (data.error) {
        if (data.error.includes('not configured')) {
          setHasApiKey(false);
          return;
        }
        throw new Error(data.error);
      }

      toast.success(`Synced ${data.videos_synced} videos from ${data.accounts_processed} accounts`);
      
      // Refresh cached videos and sync status
      await fetchSyncStatus();
      await fetchCachedVideos();
      
    } catch (error: any) {
      console.error('[ShortimizeVideosTable] Sync error:', error);
      toast.error(error.message || 'Failed to sync videos');
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial load: fetch sync status and cached videos
  useEffect(() => {
    if (campaignId) {
      fetchSyncStatus();
      fetchCachedVideos();
    }
  }, [campaignId, fetchCachedVideos]);

  // Refetch when filters change
  useEffect(() => {
    if (campaignId) {
      fetchCachedVideos();
    }
  }, [sortField, sortDirection, pagination.page, startDate, endDate, usernameFilter]);

  // Auto-sync if no cached data or stale (older than 6 hours)
  useEffect(() => {
    if (campaignId && syncStatus) {
      const shouldSync = !syncStatus.last_synced_at || 
        (new Date().getTime() - new Date(syncStatus.last_synced_at).getTime() > 6 * 60 * 60 * 1000);
      
      if (shouldSync && syncStatus.sync_status !== 'in_progress') {
        triggerSync(false);
      }
    }
  }, [campaignId, syncStatus?.last_synced_at]);

  const handleManualRefresh = () => {
    triggerSync(true);
  };
  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };
  const getPlatformIcon = (platform: string) => {
    const logo = platformLogos[platform?.toLowerCase() as keyof typeof platformLogos];
    if (logo) {
      return <img src={logo} alt={platform} className="h-4 w-4" />;
    }
    return <span className="h-4 w-4 flex items-center justify-center text-xs">🎬</span>;
  };
  const getThumbnailUrl = (video: CachedVideo) => {
    const platformId = extractPlatformId(video.video_url || '', video.platform);
    if (!platformId) return null;
    return `${THUMBNAIL_BASE_URL}/${video.username}/${platformId}_${video.platform}.jpg`;
  };
  const getCreatorInfo = (video: CachedVideo): CreatorInfo | null => {
    const key = `${video.username.toLowerCase()}_${video.platform.toLowerCase()}`;
    return creatorMatches.get(key) || null;
  };
  const startIndex = (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);
  return <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap py-[10px]">
        <div className="flex items-center gap-2">
          <Button type="button" onClick={handleManualRefresh} variant="ghost" size="icon" disabled={isLoading || isSyncing || !campaignId} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 ${isLoading || isSyncing ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* Sync Status Indicator */}
          {syncStatus?.last_synced_at && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground tracking-[-0.5px]">
              <Clock className="h-3 w-3" />
              <span>Synced {formatDistanceToNow(new Date(syncStatus.last_synced_at), { addSuffix: true })}</span>
              {syncStatus.videos_synced > 0 && (
                <span className="text-foreground">({syncStatus.videos_synced} videos)</span>
              )}
            </div>
          )}
          {isSyncing && (
            <span className="text-xs text-muted-foreground tracking-[-0.5px]">Syncing...</span>
          )}
          
          {/* Sort Selector */}
          <Select value={sortField} onValueChange={value => {
            setSortField(value as SortField);
            setPagination(prev => ({
              ...prev,
              page: 1
            }));
          }}>
            <SelectTrigger className="h-8 w-[140px] text-xs tracking-[-0.5px] border-0 bg-muted/50 hover:bg-muted">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => <SelectItem key={option.value} value={option.value} className="text-xs tracking-[-0.5px]">
                  {option.label}
                </SelectItem>)}
            </SelectContent>
          </Select>

          {/* Account Filter */}
          <Select value={usernameFilter} onValueChange={value => {
            setUsernameFilter(value === 'all' ? '' : value);
            setPagination(prev => ({
              ...prev,
              page: 1
            }));
          }}>
            <SelectTrigger className="h-8 w-[160px] text-xs tracking-[-0.5px] border-0 bg-muted/50 hover:bg-muted">
              <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs tracking-[-0.5px]">All Accounts</SelectItem>
              {availableUsernames.map(username => (
                <SelectItem key={username} value={username} className="text-xs tracking-[-0.5px]">
                  @{username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 tracking-[-0.5px] h-8 text-xs min-w-[200px] justify-start bg-muted/50 hover:bg-muted">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {startDate && endDate ? <span>{format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</span> : startDate ? <span>{format(startDate, 'MMM d, yyyy')} - ...</span> : <span className="text-muted-foreground">Filter by upload date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 bg-black/50 backdrop-blur-xl border-none" align="end">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.5px] text-center">Start Date</p>
                    <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} disabled={date => customEndDate ? date > customEndDate : false} initialFocus className="rounded-md border-none" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.5px] text-center">End Date</p>
                    <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} disabled={date => customStartDate ? date < customStartDate : false} className="rounded-md border-none" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button variant="ghost" size="sm" className="text-xs tracking-[-0.5px]" onClick={() => {
                  setCustomStartDate(undefined);
                  setCustomEndDate(undefined);
                }}>
                    Clear
                  </Button>
                  <Button size="sm" className="text-xs tracking-[-0.5px]" onClick={() => {
                  setPagination(prev => ({
                    ...prev,
                    page: 1
                  }));
                }}>
                    Apply Filter
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {(customStartDate || customEndDate) && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
          setCustomStartDate(undefined);
          setCustomEndDate(undefined);
          setPagination(prev => ({
            ...prev,
            page: 1
          }));
        }}>
              <X className="h-3.5 w-3.5" />
            </Button>}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-card/30 overflow-hidden border border-table-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-table-border">
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-foreground w-[300px]">Video</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-foreground">Account</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-foreground">Creator</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-foreground">Upload Date</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-foreground text-right">Views</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-foreground text-right">Likes</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-foreground text-right">Comments</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-foreground text-right">Shares</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({
            length: 10
          }).map((_, i) => <TableRow key={i} className="border-b border-table-border bg-transparent">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-16 w-9 rounded" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                </TableRow>) : hasApiKey === false ? <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground tracking-[-0.5px]">
                  <div className="space-y-2">
                    <p>Video tracking not configured</p>
                    <p className="text-xs">Connect a Shortimize API key in brand settings to enable video analytics.</p>
                  </div>
                </TableCell>
              </TableRow> : videos.length === 0 ? <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground tracking-[-0.5px]">
                  <div className="space-y-2">
                    <p>No videos found{collectionName ? ` for collection "${collectionName}"` : ''}</p>
                    <p className="text-xs">Make sure your campaign is linked to the correct Shortimize collection and try adjusting your filters.</p>
                  </div>
                </TableCell>
              </TableRow> : videos.map(video => {
            const creatorInfo = getCreatorInfo(video);
            return <TableRow key={video.id} className="border-b border-table-border bg-transparent hover:bg-[#F4F4F4] dark:hover:bg-[#0a0a0a]">
                    <TableCell>
                      <a href={video.video_url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                        <div className="relative h-16 w-9 rounded overflow-hidden bg-muted/50 flex-shrink-0">
                          {getThumbnailUrl(video) && <img src={getThumbnailUrl(video)!} alt={video.title || 'Video thumbnail'} className="h-full w-full object-cover" onError={e => {
                      e.currentTarget.style.display = 'none';
                    }} />}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-3 w-3 text-white fill-white" />
                          </div>
                        </div>
                        <span className="text-sm tracking-[-0.5px] line-clamp-2 group-hover:underline transition-all">
                          {video.title || 'Untitled'}
                        </span>
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(video.platform)}
                        <span className="text-sm tracking-[-0.5px]">@{video.username.toLowerCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {creatorInfo ? <button onClick={() => setSelectedCreator(creatorInfo)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={creatorInfo.avatar_url || ''} alt={creatorInfo.name} />
                            <AvatarFallback className="text-[10px]">
                              {creatorInfo.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm tracking-[-0.5px] text-foreground">
                            {creatorInfo.username.toLowerCase()}
                          </span>
                        </button> : <span className="text-sm tracking-[-0.5px] text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-sm tracking-[-0.5px] text-muted-foreground">
                      {video.uploaded_at ? format(new Date(video.uploaded_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-sm tracking-[-0.5px] text-right font-medium">
                      {formatNumber(video.views)}
                    </TableCell>
                    <TableCell className="text-sm tracking-[-0.5px] text-right">
                      {formatNumber(video.likes)}
                    </TableCell>
                    <TableCell className="text-sm tracking-[-0.5px] text-right">
                      {formatNumber(video.comments)}
                    </TableCell>
                    <TableCell className="text-sm tracking-[-0.5px] text-right">
                      {formatNumber(video.shares)}
                    </TableCell>
                  </TableRow>;
          })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.total > 0 && <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground tracking-[-0.5px]">
            {startIndex} - {endIndex} of {pagination.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pagination.page <= 1} onClick={() => setPagination(prev => ({
          ...prev,
          page: prev.page - 1
        }))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pagination.page >= pagination.total_pages} onClick={() => setPagination(prev => ({
          ...prev,
          page: prev.page + 1
        }))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>}

      {/* Creator Details Popup */}
      <Dialog open={!!selectedCreator} onOpenChange={open => !open && setSelectedCreator(null)}>
        <DialogContent className="max-w-md font-inter tracking-[-0.5px] p-0 gap-0 overflow-hidden max-h-[90vh]">
          <div className="p-4 sm:p-6 pb-3 sm:pb-4">
            <DialogHeader className="p-0">
              <DialogTitle className="font-inter tracking-[-0.5px] text-base">Creator Details</DialogTitle>
            </DialogHeader>
          </div>
          
          {selectedCreator && <div className="pb-4 sm:pb-6 space-y-4 sm:space-y-5 px-4 sm:px-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Profile Header */}
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shrink-0">
                  <AvatarImage src={selectedCreator.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm sm:text-base font-medium">
                    {selectedCreator.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{selectedCreator.name || selectedCreator.username}</h3>
                  <p className="text-xs text-muted-foreground truncate">@{selectedCreator.username}</p>
                  {selectedCreator.email && <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
                      <span className="truncate">{selectedCreator.email}</span>
                    </p>}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-lg bg-muted/30 p-2.5 sm:p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Total Views</p>
                  <p className="font-medium text-sm">{selectedCreator.total_views.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2.5 sm:p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Total Earnings</p>
                  <p className="font-medium text-sm text-emerald-500">${selectedCreator.total_earnings.toFixed(2)}</p>
                </div>
              </div>

              {/* Social Accounts */}
              {selectedCreator.social_accounts.length > 0 && <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Connected Accounts</h4>
                  <div className="space-y-1.5">
                    {selectedCreator.social_accounts.map((account, idx) => <div key={idx} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => account.account_link && window.open(account.account_link, "_blank")}>
                        {account.avatar_url ? <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                            <AvatarImage src={account.avatar_url} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                              {account.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar> : <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                            <img src={platformLogos[account.platform.toLowerCase() as keyof typeof platformLogos]} alt={account.platform} className="h-3.5 w-3.5 sm:h-4 sm:w-4 object-contain" />
                          </div>}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <img src={platformLogos[account.platform.toLowerCase() as keyof typeof platformLogos]} alt={account.platform} className="h-3 w-3 object-contain shrink-0" />
                            <span className="text-xs font-medium truncate">@{account.username}</span>
                          </div>
                          {account.follower_count && account.follower_count > 0 && <p className="text-[10px] text-muted-foreground">{account.follower_count.toLocaleString()} followers</p>}
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      </div>)}
                  </div>
                </div>}

              {/* View Profile Button */}
              <Button variant="outline" size="sm" className="w-full tracking-[-0.5px]" onClick={() => window.open(`/u/${selectedCreator.username}`, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}