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

export function CampaignCard({
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
  showFullscreen = true,
}: CampaignCardProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-1.5">
      <Card
        className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-200 ease-out hover:-translate-y-1.5 hover:shadow-xl border-0"
        onClick={onClick}
      >
        {/* Banner Background */}
        <div className="relative aspect-[3/4]">
          {banner_url ? (
            <OptimizedImage
              src={banner_url}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div 
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{ backgroundColor: brand_color || 'hsl(var(--muted))' }}
            >
              {brand_logo_url && (
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg">
                  <OptimizedImage
                    src={brand_logo_url}
                    alt={brand_name}
                    className="w-full h-full object-contain rounded-2xl"
                  />
                </div>
              )}
            </div>
          )}

          {/* Gradient Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Action Buttons */}
          {(showBookmark || showFullscreen) && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {showFullscreen && onFullscreenClick && (
                <button
                  onClick={onFullscreenClick}
                  className="md:hidden p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              )}
              {showBookmark && onBookmarkClick && (
                <button
                  onClick={onBookmarkClick}
                  className={`p-1.5 rounded-lg backdrop-blur-sm transition-all ${
                    isBookmarked
                      ? "bg-blue-500 text-white"
                      : "bg-black/40 text-white hover:bg-black/60"
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-current" : ""}`} />
                </button>
              )}
            </div>
          )}

          {/* Bottom Content */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            {/* Title */}
            <h3 className="text-sm font-semibold text-white tracking-[-0.3px] text-center line-clamp-2 leading-tight font-['Geist',sans-serif]">
              {title}
            </h3>
          </div>
        </div>
      </Card>

      {/* Budget progress below the card */}
      <div className="flex flex-col gap-1 px-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-foreground font-semibold tracking-[-0.3px] font-['Geist',sans-serif]">
            {is_infinite_budget ? '∞ unlimited' : `$${budget.toLocaleString()}`}
          </span>
          {!is_infinite_budget && (
            <span className="text-[10px] text-muted-foreground font-medium tracking-[-0.3px] font-['Geist',sans-serif]">
              {Math.round((budget_used / budget) * 100)}% used
            </span>
          )}
        </div>
        {!is_infinite_budget && (
          <Progress 
            value={(budget_used / budget) * 100} 
            className="h-1.5 rounded-full"
          />
        )}
        
        {/* Brand Badge */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-muted-foreground tracking-[-0.3px] font-['Geist',sans-serif]">
            Created by
          </span>
          {brand_logo_url && (
            <div className="w-3.5 h-3.5 rounded-full overflow-hidden">
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
            className="text-[10px] font-medium text-foreground tracking-[-0.3px] font-['Geist',sans-serif] hover:underline cursor-pointer bg-transparent border-none p-0"
          >
            {brand_name}
          </button>
          {brand_is_verified && <VerifiedBadge size="sm" />}
        </div>
      </div>
    </div>
  );
}
