import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, ExternalLink, Calendar as CalendarIcon, ChevronUp, ChevronDown, Eye, Heart, MessageSquare, Share2, Bookmark, Search } from "lucide-react";
import { format } from "date-fns";

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

type SortField = 'uploaded_at' | 'latest_views' | 'latest_likes' | 'latest_comments';
type SortDirection = 'asc' | 'desc';

export function ShortimizeVideosTable({ brandId, collectionName }: ShortimizeVideosTableProps) {
  const [videos, setVideos] = useState<ShortimizeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchUsername, setSearchUsername] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [sortField, setSortField] = useState<SortField>('uploaded_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 100, total_pages: 0 });

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-shortimize-videos', {
        body: {
          brandId,
          collectionName,
          page: pagination.page,
          limit: 100,
          orderBy: sortField,
          orderDirection: sortDirection,
          username: searchUsername || undefined,
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
  }, [brandId, collectionName, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchVideos();
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'tiktok':
        return '🎵';
      case 'instagram':
        return '📸';
      case 'youtube':
        return '▶️';
      default:
        return '🎬';
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3 ml-1 inline" /> : 
      <ChevronDown className="h-3 w-3 ml-1 inline" />;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by username..."
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 tracking-[-0.5px]"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 tracking-[-0.5px]">
              <CalendarIcon className="h-4 w-4" />
              {startDate ? format(startDate, 'MMM d, yyyy') : 'Start Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 tracking-[-0.5px]">
              <CalendarIcon className="h-4 w-4" />
              {endDate ? format(endDate, 'MMM d, yyyy') : 'End Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button onClick={handleSearch} variant="secondary" className="gap-2 tracking-[-0.5px]">
          <Search className="h-4 w-4" />
          Search
        </Button>

        <Button onClick={fetchVideos} variant="ghost" size="icon" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        {(startDate || endDate || searchUsername) && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setStartDate(undefined);
              setEndDate(undefined);
              setSearchUsername("");
              fetchVideos();
            }}
            className="text-muted-foreground tracking-[-0.5px]"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      {videos.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span className="tracking-[-0.5px]">{pagination.total} videos</span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {formatNumber(videos.reduce((sum, v) => sum + (v.latest_views || 0), 0))} total views
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            {formatNumber(videos.reduce((sum, v) => sum + (v.latest_likes || 0), 0))} total likes
          </span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="tracking-[-0.5px]">Video</TableHead>
              <TableHead className="tracking-[-0.5px]">Username</TableHead>
              <TableHead className="tracking-[-0.5px]">Platform</TableHead>
              <TableHead 
                className="cursor-pointer tracking-[-0.5px]" 
                onClick={() => handleSort('uploaded_at')}
              >
                Uploaded <SortIcon field="uploaded_at" />
              </TableHead>
              <TableHead 
                className="cursor-pointer tracking-[-0.5px]" 
                onClick={() => handleSort('latest_views')}
              >
                <Eye className="h-4 w-4 inline mr-1" />
                Views <SortIcon field="latest_views" />
              </TableHead>
              <TableHead 
                className="cursor-pointer tracking-[-0.5px]" 
                onClick={() => handleSort('latest_likes')}
              >
                <Heart className="h-4 w-4 inline mr-1" />
                Likes <SortIcon field="latest_likes" />
              </TableHead>
              <TableHead className="tracking-[-0.5px]">
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Comments
              </TableHead>
              <TableHead className="tracking-[-0.5px]">
                <Share2 className="h-4 w-4 inline mr-1" />
                Shares
              </TableHead>
              <TableHead className="tracking-[-0.5px]">Status</TableHead>
              <TableHead className="tracking-[-0.5px]">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground tracking-[-0.5px]">
                  No videos found. Make sure your brand has a Shortimize API key and collection configured.
                </TableCell>
              </TableRow>
            ) : (
              videos.map((video) => (
                <TableRow key={video.ad_id} className="hover:bg-muted/30">
                  <TableCell className="max-w-[200px] truncate tracking-[-0.5px]" title={video.title || 'Untitled'}>
                    {video.title || 'Untitled'}
                  </TableCell>
                  <TableCell className="tracking-[-0.5px]">
                    <span className="font-medium">@{video.username}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-lg" title={video.platform}>
                      {getPlatformIcon(video.platform)}
                    </span>
                  </TableCell>
                  <TableCell className="tracking-[-0.5px]">
                    {video.uploaded_at ? format(new Date(video.uploaded_at), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="tracking-[-0.5px] font-medium">
                    {formatNumber(video.latest_views)}
                  </TableCell>
                  <TableCell className="tracking-[-0.5px]">
                    {formatNumber(video.latest_likes)}
                  </TableCell>
                  <TableCell className="tracking-[-0.5px]">
                    {formatNumber(video.latest_comments)}
                  </TableCell>
                  <TableCell className="tracking-[-0.5px]">
                    {formatNumber(video.latest_shares)}
                  </TableCell>
                  <TableCell>
                    {video.removed ? (
                      <Badge variant="destructive" className="tracking-[-0.5px]">Removed</Badge>
                    ) : video.private ? (
                      <Badge variant="secondary" className="tracking-[-0.5px]">Private</Badge>
                    ) : (
                      <Badge variant="outline" className="tracking-[-0.5px] text-green-500 border-green-500/30">Live</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {video.ad_link && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-8 w-8"
                      >
                        <a href={video.ad_link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground tracking-[-0.5px]">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => {
                setPagination(prev => ({ ...prev, page: prev.page - 1 }));
                fetchVideos();
              }}
              className="tracking-[-0.5px]"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => {
                setPagination(prev => ({ ...prev, page: prev.page + 1 }));
                fetchVideos();
              }}
              className="tracking-[-0.5px]"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
