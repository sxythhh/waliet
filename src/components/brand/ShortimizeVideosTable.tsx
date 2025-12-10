import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Play, ExternalLink } from "lucide-react";
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
}

interface ShortimizeVideosTableProps {
  brandId: string;
  collectionName?: string;
}

type SortField = 'uploaded_at' | 'latest_views' | 'latest_likes' | 'latest_comments' | 'latest_shares';
type SortDirection = 'asc' | 'desc';

const THUMBNAIL_BASE_URL = "https://wtmetnsnhqfbswfddkdr.supabase.co/storage/v1/object/public/ads_tracked_thumbnails";

// Extract platform-specific video ID from ad_link
const extractPlatformId = (adLink: string, platform: string): string | null => {
  try {
    if (platform?.toLowerCase() === 'tiktok') {
      // TikTok: https://www.tiktok.com/@username/video/VIDEO_ID
      const match = adLink.match(/\/video\/(\d+)/);
      return match ? match[1] : null;
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

export function ShortimizeVideosTable({ brandId, collectionName }: ShortimizeVideosTableProps) {
  const [videos, setVideos] = useState<ShortimizeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [sortField, setSortField] = useState<SortField>('uploaded_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, total_pages: 0 });

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-shortimize-videos', {
        body: {
          brandId,
          collectionName,
          page: pagination.page,
          limit: 50,
          orderBy: sortField,
          orderDirection: sortDirection,
          uploadedAtStart: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
          uploadedAtEnd: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setVideos(data.videos || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch videos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (brandId) {
      fetchVideos();
    }
  }, [brandId, collectionName, sortField, sortDirection, pagination.page]);

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

  const startIndex = (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={fetchVideos} variant="ghost" size="icon" disabled={isLoading} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 tracking-[-0.5px] h-8 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                {startDate ? format(startDate, 'MMM d, yyyy') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  setStartDate(date);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground text-xs">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 tracking-[-0.5px] h-8 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                {endDate ? format(endDate, 'MMM d, yyyy') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  setEndDate(date);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleSearch} variant="secondary" size="sm" className="tracking-[-0.5px] h-8 text-xs">
            Apply
          </Button>

          {(startDate || endDate) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
                setPagination(prev => ({ ...prev, page: 1 }));
                setTimeout(fetchVideos, 0);
              }}
              className="text-muted-foreground tracking-[-0.5px] h-8 text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-card/30 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/20">
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-muted-foreground w-[300px]">Video</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-muted-foreground">Account</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-muted-foreground">Upload Date</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-muted-foreground text-right">Views</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-muted-foreground text-right">Likes</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-muted-foreground text-right">Comments</TableHead>
              <TableHead className="tracking-[-0.5px] text-xs font-medium text-muted-foreground text-right">Shares</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border/10">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-16 w-9 rounded" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground tracking-[-0.5px]">
                  No videos found. Make sure your brand has a Shortimize API key and collection configured.
                </TableCell>
              </TableRow>
            ) : (
              videos.map((video) => (
                <TableRow key={video.ad_id} className="border-b border-border/10 hover:bg-muted/20">
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
                      <span className="text-sm tracking-[-0.5px] line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title || 'Untitled'}
                      </span>
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(video.platform)}
                      <span className="text-sm tracking-[-0.5px]">@{video.username}</span>
                    </div>
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
              ))
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
    </div>
  );
}
