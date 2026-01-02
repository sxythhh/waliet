import { useState, useRef, useCallback, forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Play, Volume2, VolumeX, Loader2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VideoPreviewProps {
  thumbnailUrl: string | null;
  videoUrl?: string | null;
  /** Original video URL (e.g., TikTok/Instagram link) for lazy-loading video playback URL */
  originalUrl?: string;
  platform?: "tiktok" | "instagram" | "youtube";
  className?: string;
  onVideoError?: () => void;
  /** When true, fills parent container. When false, creates its own aspect ratio container */
  fill?: boolean;
  /** Show mute button (default: true) */
  showMuteButton?: boolean;
}

export const VideoPreview = forwardRef<HTMLDivElement, VideoPreviewProps>(
  function VideoPreview(
    {
      thumbnailUrl,
      videoUrl: initialVideoUrl,
      originalUrl,
      platform,
      className,
      onVideoError,
      fill = false,
      showMuteButton = true,
    },
    ref
  ) {
    const [isHovering, setIsHovering] = useState(false);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [isVideoError, setIsVideoError] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null);
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasFetchedRef = useRef(false);

    // Lazy-load video URL from edge function if not provided
    const fetchVideoUrl = useCallback(async () => {
      if (videoUrl || isFetchingUrl || hasFetchedRef.current || !originalUrl) return;

      hasFetchedRef.current = true;
      setIsFetchingUrl(true);

      try {
        let functionName = '';
        let bodyKey = '';

        if (originalUrl.includes('tiktok.com')) {
          functionName = 'fetch-tiktok-video';
          bodyKey = 'videoUrl';
        } else if (originalUrl.includes('instagram.com')) {
          functionName = 'fetch-instagram-post';
          bodyKey = 'postUrl';
        } else {
          return; // YouTube or unsupported platform
        }

        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { [bodyKey]: originalUrl }
        });

        console.log('[VideoPreview] Edge function response:', { data, error });

        if (!error && data?.data?.videoUrl) {
          console.log('[VideoPreview] Got video URL:', data.data.videoUrl);
          setVideoUrl(data.data.videoUrl);
        } else {
          console.log('[VideoPreview] No video URL in response');
        }
      } catch (err) {
        console.error('[VideoPreview] Error fetching video URL:', err);
      } finally {
        setIsFetchingUrl(false);
      }
    }, [originalUrl, videoUrl, isFetchingUrl]);

    const handleMouseEnter = useCallback(() => {
      // Small delay to avoid loading on quick mouse passes
      hoverTimeoutRef.current = setTimeout(() => {
        console.log('[VideoPreview] Mouse enter - originalUrl:', originalUrl, 'videoUrl:', videoUrl);
        setIsHovering(true);

        // Try to fetch video URL if not available
        if (!videoUrl && originalUrl) {
          console.log('[VideoPreview] Fetching video URL...');
          fetchVideoUrl();
        }

        if (videoRef.current && videoUrl && !isVideoError) {
          videoRef.current.play().catch(() => {
            // Autoplay blocked or video error
            setIsVideoError(true);
          });
        }
      }, 200);
    }, [videoUrl, isVideoError, originalUrl, fetchVideoUrl]);

    // Auto-play when video URL is fetched while hovering
    useEffect(() => {
      if (isHovering && videoUrl && videoRef.current && !isVideoError) {
        videoRef.current.play().catch(() => {
          setIsVideoError(true);
        });
      }
    }, [videoUrl, isHovering, isVideoError]);

    const handleMouseLeave = useCallback(() => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setIsHovering(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }, []);

    const handleVideoLoaded = useCallback(() => {
      setIsVideoLoaded(true);
    }, []);

    const handleVideoErrorCb = useCallback(() => {
      setIsVideoError(true);
      onVideoError?.();
    }, [onVideoError]);

    const toggleMute = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMuted((prev) => !prev);
      if (videoRef.current) {
        videoRef.current.muted = !videoRef.current.muted;
      }
    }, []);

    const hasVideo = videoUrl && !isVideoError;

    // For fill mode, we just render content that fills parent
    // For non-fill mode, we create our own container
    const content = (
      <>
        {/* Thumbnail layer */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              fill ? "absolute inset-0" : "",
              isHovering && isVideoLoaded && hasVideo ? "opacity-0" : "opacity-100"
            )}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className={cn(
            "w-full h-full bg-muted/50 flex items-center justify-center",
            fill ? "absolute inset-0" : ""
          )}>
            <Video className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Video layer - loads on hover */}
        {hasVideo && (
          <video
            ref={videoRef}
            src={videoUrl}
            muted={isMuted}
            loop
            playsInline
            preload="none"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
              isHovering && isVideoLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoadedData={handleVideoLoaded}
            onError={handleVideoErrorCb}
          />
        )}

        {/* Loading indicator - show when fetching URL or loading video */}
        {isHovering && (isFetchingUrl || (hasVideo && !isVideoLoaded)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}

        {/* Mute toggle when video is playing */}
        {showMuteButton && isHovering && isVideoLoaded && hasVideo && (
          <button
            onClick={toggleMute}
            className="absolute bottom-2 right-2 bg-black/60 rounded-full p-1.5 hover:bg-black/80 transition-colors z-20"
          >
            {isMuted ? (
              <VolumeX className="h-3 w-3 text-white" />
            ) : (
              <Volume2 className="h-3 w-3 text-white" />
            )}
          </button>
        )}
      </>
    );

    if (fill) {
      // Just return a fragment-like wrapper for event handling
      return (
        <div
          ref={ref}
          className={cn("absolute inset-0", className)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-xl bg-muted/30 aspect-[9/16]",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </div>
    );
  }
);
