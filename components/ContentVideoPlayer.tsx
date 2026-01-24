import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentVideoPlayerProps {
  videoUrl: string;
  className?: string;
}

export function ContentVideoPlayer({ videoUrl, className }: ContentVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

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

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const percentage = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(percentage);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      videoRef.current.currentTime = percentage * videoRef.current.duration;
    }
  };

  return (
    <div className={cn("group relative rounded-xl overflow-hidden bg-black aspect-[9/16] w-full max-w-md mx-auto shadow-lg", className)}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
      />
      
      {/* Minimalist progress bar - always visible at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <div
          className="h-1 bg-white/10 cursor-pointer hover:h-1.5 transition-all"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Play/Pause button - shows on hover or when paused */}
      <div 
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
          isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        )}
      >
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-105 backdrop-blur-sm"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 text-black" fill="black" />
          ) : (
            <Play className="h-6 w-6 text-black ml-0.5" fill="black" />
          )}
        </button>
      </div>
    </div>
  );
}
