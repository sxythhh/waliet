import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/40 transition-all duration-200",
        "bg-card hover:border-border hover:shadow-md",
        isEnded ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Ended Overlay */}
      {isEnded && (
        <div className="absolute top-3 left-3 z-[5]">
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Ended
          </span>
        </div>
      )}

      {/* Full Badge */}
      {isFull && !isEnded && (
        <div className="absolute top-3 left-3 z-[5]">
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded">
            Full
          </span>
        </div>
      )}

      {/* Bookmark & Fullscreen Buttons */}
      <div className="absolute top-3 right-3 z-[5] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onFullscreenClick && (
          <button
            onClick={onFullscreenClick}
            className="md:hidden p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onBookmarkClick && (
          <button
            onClick={onBookmarkClick}
            className={cn(
              "p-1.5 rounded-md backdrop-blur-sm border transition-colors",
              isBookmarked
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/80 border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-current")} />
          </button>
        )}
      </div>

      <CardContent className="p-4 flex flex-col gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          {brand_logo_url ? (
            <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0 border border-border/50">
              <OptimizedImage
                src={brand_logo_url}
                alt={brand_name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {brand_name?.charAt(0) || "B"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 min-w-0">
            <span
              className="text-xs font-medium text-muted-foreground truncate hover:text-foreground hover:underline cursor-pointer transition-colors"
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
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground tracking-[-0.2px]">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
          <span>
            <span className="text-foreground font-semibold">${monthly_retainer.toLocaleString()}</span>
            <span className="text-muted-foreground/70">/mo</span>
          </span>
          <span className="text-border">·</span>
          <span>
            <span className="text-foreground font-semibold">{videos_per_month}</span>
            <span className="text-muted-foreground/70"> videos</span>
          </span>
          <span className="text-border">·</span>
          <span>
            <span className="text-foreground font-semibold">${perVideoRate.toFixed(0)}</span>
            <span className="text-muted-foreground/70">/video</span>
          </span>
        </div>

        {/* Spots */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {isFull ? (
              <span className="text-amber-600 dark:text-amber-400">No spots available</span>
            ) : (
              <>
                <span className="text-foreground font-medium">{spotsRemaining}</span>
                {" "}spots left
              </>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            {accepted_creators_count}/{max_accepted_creators} joined
          </span>
        </div>
      </CardContent>
    </Card>
  );
});
