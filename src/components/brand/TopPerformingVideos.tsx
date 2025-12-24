import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import { format } from "date-fns";
import tiktokLogo from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-black-new.png";

export interface VideoData {
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

interface TopPerformingVideosProps {
  videos: VideoData[];
  totalVideos: number;
  hashtagsConfigured?: boolean;
  hashtags?: string[];
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

const getPlatformIcon = (platform: string) => {
  const normalizedPlatform = platform?.toLowerCase() || '';
  switch (normalizedPlatform) {
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

export function TopPerformingVideos({ 
  videos, 
  totalVideos, 
  hashtagsConfigured = true,
  hashtags = []
}: TopPerformingVideosProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-[-0.5px]">Top Performing Videos</h2>
        <span className="text-sm text-muted-foreground tracking-[-0.5px]">
          {totalVideos.toLocaleString()} video results
        </span>
      </div>

      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {videos.slice(0, 3).map((video, index) => (
            <a 
              key={`${video.ad_id}-${index}`} 
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
                          onError={e => { e.currentTarget.style.display = 'none'; }} 
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
          <div className="text-center text-muted-foreground tracking-[-0.5px] space-y-2">
            {!hashtagsConfigured ? (
              <>
                <p className="font-medium text-foreground">No Hashtags Configured</p>
                <p>Add hashtags to your campaign settings to filter and track videos.</p>
              </>
            ) : (
              <p>No videos found matching hashtags: {hashtags.join(', ')}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
