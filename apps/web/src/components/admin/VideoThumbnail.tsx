import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";

interface VideoThumbnailProps {
  src: string;
  onClick: () => void;
  isSelected?: boolean;
  className?: string;
}

export function VideoThumbnail({ src, onClick, isSelected, className }: VideoThumbnailProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle hover play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVisible) return;

    if (isHovering) {
      video.play().catch(() => {
        // Autoplay may be blocked, that's ok
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isHovering, isVisible]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "relative aspect-[9/16] bg-muted rounded-lg overflow-hidden cursor-pointer",
        "border-2 transition-all duration-200",
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-transparent hover:border-muted-foreground/50",
        className
      )}
    >
      {isVisible && !hasError ? (
        <video
          ref={videoRef}
          src={src}
          preload="metadata"
          muted
          playsInline
          loop
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : hasError ? (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <span className="text-xs">Failed to load</span>
        </div>
      ) : (
        <div className="w-full h-full bg-muted animate-pulse" />
      )}

      {/* Play overlay - hidden when hovering */}
      {!isHovering && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
          <PlayCircleIcon
            className="text-white/90 drop-shadow-lg"
            sx={{ fontSize: 48 }}
          />
        </div>
      )}

      {/* Hover indicator */}
      {isHovering && !hasError && (
        <div className="absolute bottom-2 left-2 right-2 flex justify-center">
          <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">
            Click to review
          </span>
        </div>
      )}
    </div>
  );
}
