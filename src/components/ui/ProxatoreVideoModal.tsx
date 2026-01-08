import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
  Heart,
  MessageCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
} from "lucide-react";
import { useCobaltVideo } from "@/hooks/useCobaltVideo";
import { useTheme } from "@/components/ThemeProvider";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    video_url: string;
    platform: string;
    video_title?: string | null;
    video_author_username?: string | null;
    video_thumbnail_url?: string | null;
    views?: number | null;
    likes?: number | null;
    comments?: number | null;
  } | null;
}

export function ProxatoreVideoModal({
  open,
  onOpenChange,
  video,
}: VideoModalProps) {
  const { resolvedTheme } = useTheme();
  const { fetchVideoUrl, loading, error, clearError } = useCobaltVideo();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoData, setVideoData] = useState<{
    url: string;
    type: "video" | "embed";
    platform: string;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Fetch video URL when modal opens
  useEffect(() => {
    if (open && video) {
      setVideoData(null);
      setIframeLoading(true);
      clearError();
      fetchVideoUrl(video.video_url, video.platform).then((result) => {
        if (result) {
          setVideoData({ url: result.url, type: result.type, platform: result.platform });
        }
      });
    }
  }, [open, video?.video_url]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setVideoData(null);
      setIsPlaying(false);
      setIframeLoading(true);
      clearError();
    }
  }, [open]);

  if (!video) return null;

  const isDark = resolvedTheme === "dark";

  const getPlatformLogo = () => {
    const platform = video.platform?.toLowerCase();
    switch (platform) {
      case "tiktok":
        return isDark ? tiktokLogoWhite : tiktokLogoBlack;
      case "instagram":
        return isDark ? instagramLogoWhite : instagramLogoBlack;
      case "youtube":
        return isDark ? youtubeLogoWhite : youtubeLogoBlack;
      default:
        return isDark ? tiktokLogoWhite : tiktokLogoBlack;
    }
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "—";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleOpenExternal = () => {
    window.open(video.video_url, "_blank", "noopener,noreferrer");
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleRetry = () => {
    clearError();
    setVideoData(null);
    setIframeLoading(true);
    fetchVideoUrl(video.video_url, video.platform).then((result) => {
      if (result) {
        setVideoData({ url: result.url, type: result.type, platform: result.platform });
      }
    });
  };

  const isTikTok = videoData?.platform === "tiktok";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        className="p-0 gap-0 overflow-hidden"
        style={isTikTok ? { maxWidth: "320px" } : undefined}
      >
        {/* Header - hide for TikTok since embed shows it */}
        {videoData?.platform !== "tiktok" && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <img
                src={getPlatformLogo()}
                alt={video.platform}
                className="w-6 h-6"
              />
              <div className="flex-1 min-w-0">
                {video.video_author_username && (
                  <p className="text-sm font-medium truncate">
                    @{video.video_author_username}
                  </p>
                )}
                {video.video_title && (
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {video.video_title}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenExternal}
              className="gap-1.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </Button>
          </div>
        )}

        {/* Video Container */}
        <div
          className="relative bg-black aspect-[9/16] max-h-[70vh]"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(isPlaying ? false : true)}
        >
          {loading ? (
            // Loading state
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              {video.video_thumbnail_url && (
                <img
                  src={video.video_thumbnail_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
              )}
              <Loader2 className="h-10 w-10 animate-spin text-white z-10" />
              <p className="text-sm text-white/70 z-10">Loading video...</p>
            </div>
          ) : error ? (
            // Error state
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Failed to load video
                </p>
                <p className="text-xs text-muted-foreground mb-4 max-w-[250px]">
                  {error}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRetry} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button onClick={handleOpenExternal} variant="default" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Externally
                </Button>
              </div>
            </div>
          ) : videoData?.type === "embed" ? (
            // Iframe embed (TikTok, Instagram)
            <>
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
              )}
              <div className="w-full h-full overflow-hidden">
                <iframe
                  src={videoData.url}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  scrolling="no"
                  onLoad={() => setIframeLoading(false)}
                  style={{
                    opacity: iframeLoading ? 0 : 1,
                    overflow: "hidden",
                  }}
                />
              </div>
            </>
          ) : videoData?.type === "video" ? (
            // Native video player (YouTube via Cobalt, etc.)
            <>
              <video
                ref={videoRef}
                src={videoData.url}
                className="w-full h-full object-contain"
                loop
                playsInline
                muted={isMuted}
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                poster={video.video_thumbnail_url || undefined}
              />

              {/* Play button overlay when paused */}
              {!isPlaying && (
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
                  onClick={togglePlay}
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                    <Play className="h-8 w-8 text-black fill-black ml-1" />
                  </div>
                </div>
              )}

              {/* Controls overlay */}
              {showControls && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5 text-white" />
                        ) : (
                          <Play className="h-5 w-5 text-white ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={toggleMute}
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        {isMuted ? (
                          <VolumeX className="h-5 w-5 text-white" />
                        ) : (
                          <Volume2 className="h-5 w-5 text-white" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={handleFullscreen}
                      className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <Maximize className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Stats Footer */}
        {(video.views || video.likes || video.comments) && (
          <div className="flex items-center justify-center gap-6 p-3 border-t border-border bg-muted/30">
            {video.views !== null && video.views !== undefined && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {formatNumber(video.views)}
                </span>
              </div>
            )}
            {video.likes !== null && video.likes !== undefined && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {formatNumber(video.likes)}
                </span>
              </div>
            )}
            {video.comments !== null && video.comments !== undefined && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {formatNumber(video.comments)}
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
