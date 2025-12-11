import { useState, useEffect } from "react";
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
import { RefreshCw, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Play, ExternalLink, ArrowUpDown, X } from "lucide-react";
import { format } from "date-fns";
import tiktokLogo from "@/assets/tiktok-logo-black.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";

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
  name: string;
  avatar_url: string | null;
  user_id: string;
  username: string;
}

interface ShortimizeVideosTableProps {
  brandId: string;
  collectionName?: string;
  campaignId?: string;
}

type SortField = 'uploaded_at' | 'latest_views' | 'latest_likes' | 'latest_comments' | 'latest_shares';
type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS = [
  { value: 'uploaded_at', label: 'Most Recent' },
  { value: 'latest_views', label: 'Most Viewed' },
  { value: 'latest_likes', label: 'Most Liked' },
  { value: 'latest_comments', label: 'Most Comments' },
  { value: 'latest_shares', label: 'Most Shares' },
] as const;

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

export function ShortimizeVideosTable({ brandId, collectionName, campaignId }: ShortimizeVideosTableProps) {
  const [videos, setVideos] = useState<ShortimizeVideo[]>([]);
  const [creatorMatches, setCreatorMatches] = useState<Map<string, CreatorInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [sortField, setSortField] = useState<SortField>('uploaded_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, total_pages: 0 });
  const [selectedCreator, setSelectedCreator] = useState<CreatorInfo | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const fetchCreatorMatches = async (usernames: string[]) => {
    if (usernames.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('username, platform, user_id, profiles:user_id(full_name, username, avatar_url)')
        .in('username', usernames);
      
      if (error) throw error;
      
      const matches = new Map<string, CreatorInfo>();
      data?.forEach((account: any) => {
        const key = `${account.username.toLowerCase()}_${account.platform.toLowerCase()}`;
        const creatorName = account.profiles?.full_name || account.profiles?.username || null;
        if (creatorName && account.user_id) {
          matches.set(key, {
            name: creatorName,
            avatar_url: account.profiles?.avatar_url || null,
            user_id: account.user_id,
            username: account.profiles?.username || account.username
          });
        }
      });
      setCreatorMatches(matches);
    } catch (error) {
      console.error('Error fetching creator matches:', error);
    }
  };

  const fetchVideos = async () => {
    console.log('[ShortimizeVideosTable] fetchVideos called, brandId:', brandId, 'collectionName:', collectionName, 'campaignId:', campaignId);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-shortimize-videos', {
        body: {
          brandId,
          collectionName,
          campaignId,
          page: pagination.page,
          limit: 50,
          orderBy: sortField,
          orderDirection: sortDirection,
          uploadedAtStart: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
          uploadedAtEnd: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        },
      });

      console.log('[ShortimizeVideosTable] fetch response:', { 
        error, 
        hasData: !!data, 
        videosCount: data?.videos?.length,
        pagination: data?.pagination,
        debug: data?.debug
      });

      if (error) {
        console.error('[ShortimizeVideosTable] Supabase function error:', error);
        throw error;
      }

      if (data.error) {
        // Handle "API key not configured" gracefully - not an error, just no integration
        if (data.error.includes('API key not configured')) {
          console.log('[ShortimizeVideosTable] Shortimize not configured for this brand');
          setHasApiKey(false);
          setVideos([]);
          return;
        }
        console.error('[ShortimizeVideosTable] API error:', data.error, 'Debug:', data.debug);
        throw new Error(data.error);
      }

      setHasApiKey(true);
      const videosData = data.videos || [];
      setVideos(videosData);
      setPagination(prev => ({ ...prev, ...data.pagination }));
      
      if (videosData.length === 0) {
        console.log('[ShortimizeVideosTable] No videos found. Debug info:', {
          collectionUsed: data?.debug?.collectionUsed,
          pagination: data?.pagination
        });
      } else {
        console.log('[ShortimizeVideosTable] videos set successfully, count:', videosData.length);
      }
      
      // Fetch creator matches for unique usernames
      const uniqueUsernames = [...new Set(videosData.map((v: ShortimizeVideo) => v.username))] as string[];
      await fetchCreatorMatches(uniqueUsernames);
    } catch (error: any) {
      console.error('[ShortimizeVideosTable] Error fetching videos:', error);
      // Don't show toast for "API key not configured" error
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('API key not configured')) {
        toast.error(errorMsg || 'Failed to fetch videos');
      } else {
        setHasApiKey(false);
      }
    } finally {
      console.log('[ShortimizeVideosTable] setting isLoading to false');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch when we have brandId and either collectionName or campaignId (for hashtag filtering)
    if (brandId && (collectionName || campaignId)) {
      fetchVideos();
    }
  }, [brandId, collectionName, campaignId, sortField, sortDirection, pagination.page]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchVideos();
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
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

  const getThumbnailUrl = (video: ShortimizeVideo) => {
    const platformId = extractPlatformId(video.ad_link, video.platform);
    if (!platformId) return null;
    return `${THUMBNAIL_BASE_URL}/${video.username}/${platformId}_${video.platform}.jpg`;
  };

  const getCreatorInfo = (video: ShortimizeVideo): CreatorInfo | null => {
    const key = `${video.username.toLowerCase()}_${video.platform.toLowerCase()}`;
    return creatorMatches.get(key) || null;
  };

  const startIndex = (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button type="button" onClick={fetchVideos} variant="ghost" size="icon" disabled={isLoading || (!collectionName && !campaignId)} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* Sort Selector */}
          <Select 
            value={sortField} 
            onValueChange={(value) => {
              setSortField(value as SortField);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs tracking-[-0.5px] border-0 bg-muted/50 hover:bg-muted">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value} className="text-xs tracking-[-0.5px]">
                  {option.label}
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
                {startDate && endDate ? (
                  <span>{format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</span>
                ) : startDate ? (
                  <span>{format(startDate, 'MMM d, yyyy')} - ...</span>
                ) : (
                  <span className="text-muted-foreground">Filter by upload date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.5px]">Start Date</p>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => endDate ? date > endDate : false}
                      initialFocus
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.5px]">End Date</p>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      className="rounded-md border"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs tracking-[-0.5px]"
                    onClick={() => {
                      setStartDate(undefined);
                      setEndDate(undefined);
                    }}
                  >
                    Clear
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs tracking-[-0.5px]"
                    onClick={() => {
                      setPagination(prev => ({ ...prev, page: 1 }));
                      fetchVideos();
                    }}
                  >
                    Apply Filter
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {(startDate || endDate) && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
                setPagination(prev => ({ ...prev, page: 1 }));
                setTimeout(fetchVideos, 0);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
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
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i} className="border-b border-table-border bg-transparent">
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
                </TableRow>
              ))
            ) : hasApiKey === false ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground tracking-[-0.5px]">
                  <div className="space-y-2">
                    <p>Video tracking not configured</p>
                    <p className="text-xs">Connect a Shortimize API key in brand settings to enable video analytics.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground tracking-[-0.5px]">
                  <div className="space-y-2">
                    <p>No videos found{collectionName ? ` for collection "${collectionName}"` : ''}</p>
                    <p className="text-xs">Videos are filtered by campaign hashtags. Check that your videos have the correct hashtags.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              videos.map((video) => {
                const creatorInfo = getCreatorInfo(video);
                return (
                  <TableRow key={video.ad_id} className="border-b border-table-border bg-transparent hover:bg-[#F4F4F4] dark:hover:bg-[#0a0a0a]">
                    <TableCell>
                      <a 
                        href={video.ad_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 group"
                      >
                        <div className="relative h-16 w-9 rounded overflow-hidden bg-muted/50 flex-shrink-0">
                          {getThumbnailUrl(video) && (
                            <img 
                              src={getThumbnailUrl(video)!} 
                              alt={video.title || 'Video thumbnail'}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
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
                      {creatorInfo ? (
                        <button
                          onClick={() => setSelectedCreator(creatorInfo)}
                          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={creatorInfo.avatar_url || ''} alt={creatorInfo.name} />
                            <AvatarFallback className="text-[10px]">
                              {creatorInfo.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm tracking-[-0.5px] text-foreground">
                            {creatorInfo.username.toLowerCase()}
                          </span>
                        </button>
                      ) : (
                        <span className="text-sm tracking-[-0.5px] text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm tracking-[-0.5px] text-muted-foreground">
                      {video.uploaded_at ? format(new Date(video.uploaded_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-sm tracking-[-0.5px] text-right font-medium">
                      {formatNumber(video.latest_views)}
                    </TableCell>
                    <TableCell className="text-sm tracking-[-0.5px] text-right">
                      {formatNumber(video.latest_likes)}
                    </TableCell>
                    <TableCell className="text-sm tracking-[-0.5px] text-right">
                      {formatNumber(video.latest_comments)}
                    </TableCell>
                    <TableCell className="text-sm tracking-[-0.5px] text-right">
                      {formatNumber(video.latest_shares)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground tracking-[-0.5px]">
            {startIndex} - {endIndex} of {pagination.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Creator Popup */}
      <Dialog open={!!selectedCreator} onOpenChange={(open) => !open && setSelectedCreator(null)}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-[#0a0a0a] border-border">
          {selectedCreator && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">Creator Details</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 ring-2 ring-background">
                    <AvatarImage src={selectedCreator.avatar_url || ''} alt={selectedCreator.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {selectedCreator.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold tracking-[-0.5px]">{selectedCreator.name}</h3>
                    <p className="text-sm text-muted-foreground tracking-[-0.5px]">@{selectedCreator.username.toLowerCase()}</p>
                  </div>
                </div>

                {/* View Profile Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full tracking-[-0.5px]"
                  onClick={() => window.open(`/u/${selectedCreator.username}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Profile
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
