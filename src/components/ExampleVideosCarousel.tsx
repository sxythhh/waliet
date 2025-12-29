import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExampleVideo {
  url?: string;
  title?: string;
  thumbnail?: string;
  platform?: string;
}

interface ExampleVideosCarouselProps {
  videos: ExampleVideo[];
  className?: string;
}

export function ExampleVideosCarousel({ videos, className }: ExampleVideosCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!videos || videos.length === 0) return null;

  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < videos.length - 1;

  const scrollTo = (index: number) => {
    if (index < 0 || index >= videos.length) return;
    setCurrentIndex(index);
    
    if (containerRef.current) {
      const scrollAmount = index * (containerRef.current.offsetWidth * 0.85 + 12);
      containerRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const itemWidth = containerRef.current.offsetWidth * 0.85 + 12;
      const newIndex = Math.round(scrollLeft / itemWidth);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentIndex(newIndex);
      }
    }
  };

  const getVideoThumbnail = (video: ExampleVideo): string | null => {
    if (video.thumbnail) return video.thumbnail;
    
    // Extract YouTube thumbnail
    if (video.url?.includes('youtube.com') || video.url?.includes('youtu.be')) {
      const videoId = video.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    
    return null;
  };

  const getVideoUrl = (video: ExampleVideo): string => {
    return typeof video === 'string' ? video : (video.url || '');
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Example Videos</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scrollTo(currentIndex - 1)}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px] min-w-[3rem] text-center">
            {currentIndex + 1} / {videos.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scrollTo(currentIndex + 1)}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {videos.map((video, index) => {
          const thumbnail = getVideoThumbnail(video);
          const url = getVideoUrl(video);
          const title = typeof video === 'string' ? `Video ${index + 1}` : (video.title || `Video ${index + 1}`);
          
          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "relative flex-shrink-0 w-[85%] md:w-[280px] aspect-[9/16] rounded-xl overflow-hidden",
                "bg-muted border border-border group snap-start",
                "transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
              )}
            >
              {thumbnail ? (
                <img 
                  src={thumbnail} 
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  <Play className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 transition-transform group-hover:scale-110">
                  <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                </div>
              </div>
              
              {/* Title & external link */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-end justify-between gap-2">
                  <p className="text-sm font-medium text-white truncate font-['Inter'] tracking-[-0.3px]">
                    {title}
                  </p>
                  <ExternalLink className="h-4 w-4 text-white/70 flex-shrink-0" />
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Dots indicator for mobile */}
      {videos.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 md:hidden">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? "w-6 bg-primary" 
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
