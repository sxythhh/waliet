import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bookmark, Maximize2 } from "lucide-react";
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
    <div className="group flex flex-col gap-2">
      <Card
        className="relative overflow-hidden rounded-xl cursor-pointer transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg border border-border/50 bg-card"
        onClick={onClick}
      >
        {/* Horizontal Layout */}
        <div className="flex">
          {/* Banner Image - Left Side */}
          <div className="relative w-24 h-28 flex-shrink-0">
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
                  <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg">
                    <OptimizedImage
                      src={brand_logo_url}
                      alt={brand_name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Status Badge - Overlaid on banner */}
            <div className="absolute top-2 left-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                isEnded
                  ? 'bg-red-500/90 text-white'
                  : 'bg-emerald-500/90 text-white'
              }`}>
                {isEnded ? 'Ended' : 'Live'}
              </span>
            </div>
          </div>

          {/* Content - Right Side */}
          <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
            {/* Top: Title and Actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {/* Campaign Title */}
                <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2 tracking-[-0.3px]">
                  {title}
                </h3>

                {/* Brand Info */}
                <div className="flex items-center gap-1.5 mt-1">
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
              </div>

              {/* Action Buttons */}
              {(showBookmark || showFullscreen) && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {showFullscreen && onFullscreenClick && (
                    <button
                      onClick={onFullscreenClick}
                      aria-label="View fullscreen"
                      className="p-1.5 rounded-lg bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {showBookmark && onBookmarkClick && (
                    <button
                      onClick={onBookmarkClick}
                      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                      className={`p-1.5 rounded-lg transition-all ${
                        isBookmarked
                          ? "bg-blue-500 text-white"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-current" : ""}`} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom: Budget Progress */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {is_infinite_budget ? (
                    <span className="text-emerald-500">∞ Unlimited Budget</span>
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
        </div>
      </Card>
    </div>
  );
});
