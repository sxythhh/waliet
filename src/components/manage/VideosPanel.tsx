import { Video, RefreshCw, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VideosPanelProps {
  videos: any[];
  loading: boolean;
  collectionName: string;
  lastFetch: Date | null;
  rpmRate: number;
  onCollectionChange: (name: string) => void;
  onFetch: (forceRefresh?: boolean) => void;
  onVideoClick: (video: any) => void;
}

export function VideosPanel({
  videos,
  loading,
  collectionName,
  lastFetch,
  rpmRate,
  onCollectionChange,
  onFetch,
  onVideoClick
}: VideosPanelProps) {
  // Calculate totals
  const totalViews = videos.reduce((sum, v) => sum + (Number(v.latest_views) || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (Number(v.latest_likes) || 0), 0);
  const totalComments = videos.reduce((sum, v) => sum + (Number(v.latest_comments) || 0), 0);
  const totalShares = videos.reduce((sum, v) => sum + (Number(v.latest_shares) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Video className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Campaign Videos</h3>
            <p className="text-xs text-muted-foreground">
              {videos.length} videos {lastFetch && `• Last updated ${lastFetch.toLocaleTimeString()}`}
            </p>
          </div>
        </div>
      </div>

      {/* Collection Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter collection name"
          value={collectionName}
          onChange={(e) => onCollectionChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onFetch(false)}
          className="bg-muted/20 border-0 h-9"
        />
        <Button 
          onClick={() => onFetch(false)} 
          disabled={loading}
          size="sm"
          className="h-9"
        >
          {loading ? "Loading..." : "Fetch"}
        </Button>
        {videos.length > 0 && (
          <Button 
            onClick={() => onFetch(true)} 
            disabled={loading}
            variant="ghost"
            size="sm"
            className="h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      {videos.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-muted/10 rounded-lg p-3 flex items-center gap-3">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Views</p>
              <p className="text-sm font-semibold tabular-nums">{totalViews.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-muted/10 rounded-lg p-3 flex items-center gap-3">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Likes</p>
              <p className="text-sm font-semibold tabular-nums">{totalLikes.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-muted/10 rounded-lg p-3 flex items-center gap-3">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Comments</p>
              <p className="text-sm font-semibold tabular-nums">{totalComments.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-muted/10 rounded-lg p-3 flex items-center gap-3">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Shares</p>
              <p className="text-sm font-semibold tabular-nums">{totalShares.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Videos Table */}
      {videos.length > 0 ? (
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
                  <TableHead className="text-xs text-muted-foreground font-medium">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video, index) => (
                  <TableRow 
                    key={video.ad_id || index}
                    className="border-b border-border/20 cursor-pointer hover:bg-muted/20"
                    onClick={() => onVideoClick(video)}
                  >
                    <TableCell className="text-sm font-medium">{video.username}</TableCell>
                    <TableCell className="text-sm capitalize text-muted-foreground">{video.platform}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{video.title || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {video.uploaded_at ? new Date(video.uploaded_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      {video.latest_views?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      {video.latest_likes?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium text-green-500 tabular-nums">
                      ${(((video.latest_views || 0) / 1000) * rpmRate).toFixed(2)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {video.ad_link && (
                        <a 
                          href={video.ad_link} 
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
        !loading && collectionName && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/10 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              <Video className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">No videos found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Try a different collection name
            </p>
          </div>
        )
      )}
    </div>
  );
}
