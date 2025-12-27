import { Card } from "@/components/ui/card";
import { Bookmark, Maximize2 } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";

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
  onClick?: () => void;
  onBookmarkClick?: (e: React.MouseEvent) => void;
  onFullscreenClick?: (e: React.MouseEvent) => void;
  showBookmark?: boolean;
  showFullscreen?: boolean;
}

// Generate a vibrant gradient based on brand color or index
const gradientPresets = [
  "from-purple-500 via-purple-600 to-pink-500",
  "from-emerald-400 via-green-500 to-teal-600",
  "from-blue-400 via-cyan-500 to-blue-600",
  "from-orange-400 via-amber-500 to-yellow-500",
  "from-rose-400 via-pink-500 to-purple-500",
  "from-indigo-400 via-blue-500 to-purple-600",
  "from-teal-400 via-cyan-500 to-blue-500",
  "from-fuchsia-500 via-purple-500 to-indigo-500",
];

function getGradientClass(id: string, brandColor?: string | null): string {
  // Use the id to consistently pick a gradient
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradientPresets[hash % gradientPresets.length];
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
  onClick,
  onBookmarkClick,
  onFullscreenClick,
  showBookmark = true,
  showFullscreen = true,
}: CampaignCardProps) {
  const budgetPercentage = budget > 0 ? Math.min((budget_used / budget) * 100, 100) : 0;
  const gradientClass = getGradientClass(id, brand_color);

  return (
    <div className="flex flex-col gap-2">
      <Card
        className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border-0 bg-gradient-to-br ${gradientClass}`}
        onClick={onClick}
      >
        {/* Action Buttons */}
        {(showBookmark || showFullscreen) && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {showFullscreen && onFullscreenClick && (
              <button
                onClick={onFullscreenClick}
                className="md:hidden p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            {showBookmark && onBookmarkClick && (
              <button
                onClick={onBookmarkClick}
                className={`p-2 rounded-full backdrop-blur-sm transition-all ${
                  isBookmarked
                    ? "bg-white text-primary"
                    : "bg-black/40 text-white hover:bg-black/60"
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
              </button>
            )}
          </div>
        )}

        {/* Card Content */}
        <div className="relative aspect-[4/5] p-4 flex flex-col">
          {/* Banner Image Area */}
          <div className="flex-1 flex items-center justify-center">
            {banner_url ? (
              <div className="w-full h-full flex items-center justify-center">
                <OptimizedImage
                  src={banner_url}
                  alt={title}
                  className="max-w-[85%] max-h-[85%] object-contain drop-shadow-2xl rounded-lg"
                />
              </div>
            ) : brand_logo_url ? (
              <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/20">
                <OptimizedImage
                  src={brand_logo_url}
                  alt={brand_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                <span className="text-4xl font-bold text-white">
                  {brand_name?.charAt(0) || "?"}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className="mt-auto space-y-2">
            {/* Title */}
            <h3 className="text-xl font-black text-white uppercase tracking-wide text-center drop-shadow-lg line-clamp-2 leading-tight">
              {title}
            </h3>
            
            {/* Brand Badge */}
            <div className="flex items-center justify-center gap-1.5">
              <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                  {brand_logo_url && (
                    <div className="w-4 h-4 rounded-full overflow-hidden">
                      <OptimizedImage
                        src={brand_logo_url}
                        alt={brand_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    {brand_name}
                  </span>
                  {brand_is_verified && <VerifiedBadge size="sm" className="text-white" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Status indicator below the card */}
      <div className="flex items-center gap-1.5 px-1">
        <div className={`w-2 h-2 rounded-full ${isEnded ? 'bg-muted-foreground' : 'bg-emerald-500'} animate-pulse`} />
        <span className="text-xs text-muted-foreground font-medium">
          {is_infinite_budget ? (
            <><span className="text-foreground font-semibold">∞</span> unlimited</>
          ) : (
            <>
              <span className="text-foreground font-semibold">
                ${Math.ceil(budget - budget_used).toLocaleString()}
              </span>
              {' '}remaining
            </>
          )}
        </span>
      </div>
    </div>
  );
}
