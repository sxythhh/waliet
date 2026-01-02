import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Video, Play } from "lucide-react";

interface VideoPreviewProps {
  thumbnailUrl: string | null;
  className?: string;
  /** When true, fills parent container. When false, creates its own aspect ratio container */
  fill?: boolean;
  /** Show play icon overlay (default: true) */
  showPlayIcon?: boolean;
}

export const VideoPreview = forwardRef<HTMLDivElement, VideoPreviewProps>(
  function VideoPreview(
    {
      thumbnailUrl,
      className,
      fill = false,
      showPlayIcon = true,
    },
    ref
  ) {
    const content = (
      <>
        {/* Thumbnail layer */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className={cn(
              "w-full h-full object-cover",
              fill ? "absolute inset-0" : ""
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

        {/* Play icon overlay */}
        {showPlayIcon && thumbnailUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
            <div className="bg-black/60 rounded-full p-3">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>
        )}
      </>
    );

    if (fill) {
      return (
        <div
          ref={ref}
          className={cn("absolute inset-0", className)}
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
      >
        {content}
      </div>
    );
  }
);
