import { Card, CardContent } from "@/components/ui/card";
import { Bookmark, Maximize2 } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import videosIcon from "@/assets/videos-icon.svg";
import personIcon from "@/assets/person-icon.svg";

export interface BoostDiscoverCardProps {
  id: string;
  title: string;
  description?: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  brand_is_verified?: boolean;
  monthly_retainer: number;
  videos_per_month: number;
  max_accepted_creators: number;
  accepted_creators_count: number;
  isEnded?: boolean;
  isBookmarked?: boolean;
  slug?: string;
  onClick?: () => void;
  onBookmarkClick?: (e: React.MouseEvent) => void;
  onFullscreenClick?: (e: React.MouseEvent) => void;
}

export function BoostDiscoverCard({
  id,
  title,
  description,
  brand_name,
  brand_logo_url,
  brand_is_verified,
  monthly_retainer,
  videos_per_month,
  max_accepted_creators,
  accepted_creators_count,
  isEnded,
  isBookmarked,
  onClick,
  onBookmarkClick,
  onFullscreenClick,
}: BoostDiscoverCardProps) {
  const spotsRemaining = max_accepted_creators - accepted_creators_count;
  const isFull = spotsRemaining <= 0;

  return (
    <Card
      className={`group bg-card border border-border/50 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg flex flex-col overflow-hidden relative rounded-xl ${
        isEnded ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
      onClick={onClick}
    >
      {isEnded && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />
      )}

      {/* Bookmark & Fullscreen Buttons */}
      <div className="absolute top-2 right-2 z-[5] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onFullscreenClick && (
          <button
            onClick={onFullscreenClick}
            className="md:hidden p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onBookmarkClick && (
          <button
            onClick={onBookmarkClick}
            className={`p-1.5 rounded-lg backdrop-blur-sm transition-all ${
              isBookmarked
                ? "bg-primary text-primary-foreground"
                : "bg-black/40 text-white hover:bg-black/60"
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      <CardContent className="p-4 flex-1 flex flex-col gap-2">
        {/* Title */}
        <h3 className="text-sm font-semibold line-clamp-2 leading-snug group-hover:underline tracking-[-0.3px] font-['Geist',sans-serif]">
          {title}
        </h3>

        {/* Metadata Row */}
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] font-medium text-muted-foreground tracking-[-0.3px] font-['Geist',sans-serif]">
          <span className="flex items-center gap-1">
            <img src={videosIcon} alt="" className="h-3 w-3 opacity-60 dark:invert" />
            {videos_per_month} videos/mo
          </span>
          <span className={`flex items-center gap-1 ${isFull ? "text-red-400" : ""}`}>
            <img src={personIcon} alt="" className="h-3 w-3 opacity-60 dark:invert" />
            {spotsRemaining > 0 ? `${spotsRemaining} spots left` : "Full"}
          </span>
        </div>

        {/* Retainer Amount */}
        <div className="flex items-baseline gap-1 mt-auto pt-2">
          <span className="text-base font-bold text-emerald-500 tracking-[-0.3px] font-['Geist',sans-serif]">
            ${monthly_retainer.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground tracking-[-0.3px] font-['Geist',sans-serif]">
            /month
          </span>
        </div>

        {/* Brand Info */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
          {brand_logo_url ? (
            <div className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-border/50">
              <OptimizedImage
                src={brand_logo_url}
                alt={brand_name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-semibold text-muted-foreground">
                {brand_name?.charAt(0) || "B"}
              </span>
            </div>
          )}
          <span className="text-[10px] tracking-[-0.3px] font-['Geist',sans-serif] flex items-center gap-1">
            <span className="text-muted-foreground">Created by</span>
            <span className="text-foreground font-medium">{brand_name}</span>
            {brand_is_verified && <VerifiedBadge size="sm" />}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
