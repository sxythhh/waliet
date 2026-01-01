import { memo } from "react";
import { Bookmark, Maximize2 } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface BoostDiscoverCardProps {
  id: string;
  title: string;
  description?: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  brand_is_verified?: boolean;
  brand_slug?: string | null;
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

export const BoostDiscoverCard = memo(function BoostDiscoverCard({
  id,
  title,
  description,
  brand_name,
  brand_logo_url,
  brand_is_verified,
  brand_slug,
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
  const navigate = useNavigate();
  const spotsRemaining = max_accepted_creators - accepted_creators_count;
  const isFull = spotsRemaining <= 0;
  const perVideoRate = videos_per_month > 0 ? monthly_retainer / videos_per_month : 0;

  return (
    <div
      className={cn(
        "group relative rounded-2xl p-5 transition-all duration-300 ease-out",
        "bg-muted/40 hover:bg-muted/60",
        "border border-transparent hover:border-border/50",
        isEnded ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Ended Badge */}
      {isEnded && (
        <div className="absolute top-4 left-4 z-[5]">
          <span className="font-['Inter'] tracking-[-0.5px] text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Ended
          </span>
        </div>
      )}

      {/* Full Badge */}
      {isFull && !isEnded && (
        <div className="absolute top-4 left-4 z-[5]">
          <span className="font-['Inter'] tracking-[-0.5px] text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
            Full
          </span>
        </div>
      )}

      {/* Bookmark & Fullscreen Buttons */}
      <div className="absolute top-4 right-4 z-[5] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {onFullscreenClick && (
          <button
            onClick={onFullscreenClick}
            className="md:hidden p-1.5 rounded-full bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onBookmarkClick && (
          <button
            onClick={onBookmarkClick}
            className={cn(
              "p-1.5 rounded-full backdrop-blur-sm transition-colors",
              isBookmarked
                ? "bg-primary text-primary-foreground"
                : "bg-background/90 text-muted-foreground hover:text-foreground"
            )}
          >
            <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-current")} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Brand Row */}
        <div className="flex items-center gap-2.5">
          {brand_logo_url ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-background">
              <OptimizedImage
                src={brand_logo_url}
                alt={brand_name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">
                {brand_name?.charAt(0) || "B"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="font-['Inter'] tracking-[-0.5px] text-sm font-medium text-foreground truncate hover:underline cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (brand_slug) navigate(`/b/${brand_slug}`);
              }}
            >
              {brand_name}
            </span>
            {brand_is_verified && <VerifiedBadge size="sm" />}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold leading-tight line-clamp-2 text-foreground tracking-[-0.3px] group-hover:underline transition-all">
          {title}
        </h3>

        {/* Stats Row */}
        <div className="flex items-center gap-3 font-['Inter'] tracking-[-0.5px]">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">${monthly_retainer}</span>
            <span className="text-xs text-muted-foreground">/mo</span>
          </div>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-foreground">{videos_per_month}</span>
            <span className="text-xs text-muted-foreground">videos</span>
          </div>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-foreground">${perVideoRate.toFixed(0)}</span>
            <span className="text-xs text-muted-foreground">/video</span>
          </div>
        </div>

        {/* Spots Row */}
        <div className="flex items-center justify-between pt-3 border-t border-border/20">
          <span className="font-['Inter'] tracking-[-0.5px] text-xs text-muted-foreground">
            {isFull ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">No spots available</span>
            ) : (
              <>
                <span className="text-foreground font-medium">{spotsRemaining}</span>
                {" "}spots left
              </>
            )}
          </span>
          <span className="font-['Inter'] tracking-[-0.5px] text-[11px] text-muted-foreground/60">
            {accepted_creators_count}/{max_accepted_creators} joined
          </span>
        </div>
      </div>
    </div>
  );
});
