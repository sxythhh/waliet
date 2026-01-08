import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bookmark, Maximize2, Circle } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useNavigate } from "react-router-dom";

export interface CampaignCardProps {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_is_verified?: boolean;
  brand_color?: string | null;
  banner_url: string | null;
  budget: number;
  budget_used?: number;
  is_infinite_budget?: boolean;
  platforms?: string[];
  isEnded?: boolean;
  isBookmarked?: boolean;
  slug?: string;
  brand_slug?: string;
  onClick?: () => void;
  onBookmarkClick?: (e: React.MouseEvent) => void;
  onFullscreenClick?: (e: React.MouseEvent) => void;
  showBookmark?: boolean;
  showFullscreen?: boolean;
}

export const CampaignCard = memo(function CampaignCard({
  id,
  title,
  brand_name,
  brand_logo_url,
  brand_is_verified,
  brand_color,
  banner_url,
  budget,
  budget_used = 0,
  is_infinite_budget,
  platforms = [],
  isEnded,
  isBookmarked,
  slug,
  brand_slug,
  onClick,
  onBookmarkClick,
  onFullscreenClick,
  showBookmark = true,
  showFullscreen = true
}: CampaignCardProps) {
  const navigate = useNavigate();
  const budgetPercentage = is_infinite_budget ? 100 : Math.min((budget_used / budget) * 100, 100);

  return (
    <div className="group">
      <Card
        className="relative overflow-hidden rounded-xl cursor-pointer transition-all duration-200 ease-out border border-border/50 bg-card"
        onClick={onClick}
      >
        {/* Full-width Banner - Top */}
        <div className="relative w-full aspect-[21/9]">
          {banner_url ? (
            <OptimizedImage
              src={banner_url}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{ backgroundColor: brand_color || '#1a1a1a' }}
            >
              {brand_logo_url && (
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
                  <OptimizedImage
                    src={brand_logo_url}
                    alt={brand_name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons - Top Right */}
          {(showBookmark || showFullscreen) && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {showFullscreen && onFullscreenClick && (
                <button
                  onClick={onFullscreenClick}
                  aria-label="View fullscreen"
                  className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              )}
              {showBookmark && onBookmarkClick && (
                <button
                  onClick={onBookmarkClick}
                  aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                  className={`p-1.5 rounded-lg backdrop-blur-sm transition-all ${
                    isBookmarked
                      ? "bg-blue-500 text-white"
                      : "bg-black/50 text-white hover:bg-black/70"
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-current" : ""}`} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content - Below Banner */}
        <div className="p-3 space-y-2.5 font-['Inter',sans-serif]" style={{ letterSpacing: '-0.5px' }}>
          {/* Title Row with Status */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2 flex-1">
              {title}
            </h3>

            {/* Status Indicator - Minimal dot style */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium shrink-0 ${
              isEnded
                ? 'bg-muted text-muted-foreground'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isEnded ? 'bg-muted-foreground' : 'bg-emerald-500 animate-pulse'
              }`} />
              {isEnded ? 'Ended' : 'Live'}
            </div>
          </div>

          {/* Brand Info */}
          <div className="flex items-center gap-1.5">
            {brand_logo_url && (
              <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                <OptimizedImage
                  src={brand_logo_url}
                  alt={brand_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (brand_slug) navigate(`/b/${brand_slug}`);
              }}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate"
            >
              {brand_name}
            </button>
            {brand_is_verified && <VerifiedBadge size="sm" />}
          </div>

          {/* Budget Progress */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground font-medium">
                {is_infinite_budget ? (
                  <span className="text-emerald-600 dark:text-emerald-400">∞ Unlimited</span>
                ) : (
                  <>
                    <span className="text-foreground font-semibold">${budget_used.toLocaleString()}</span>
                    <span className="text-muted-foreground"> / ${budget.toLocaleString()}</span>
                  </>
                )}
              </span>
            </div>
            {!is_infinite_budget && (
              <Progress
                value={budgetPercentage}
                className="h-1.5 rounded-full"
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
});
