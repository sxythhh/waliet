import { Card, CardContent } from "@/components/ui/card";
import { Bookmark, Maximize2 } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";

export interface CampaignCardProps {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_is_verified?: boolean;
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

export function CampaignCard({
  id,
  title,
  brand_name,
  brand_logo_url,
  brand_is_verified,
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
  const budgetPercentage = budget > 0 ? (budget_used / budget) * 100 : 0;

  return (
    <Card
      className={`group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border border-[#dce1eb] dark:border-[#0f0f0f] relative dark:hover:bg-[#0f0f0f] ${isEnded ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      onClick={onClick}
    >
      {/* Action Buttons */}
      {(showBookmark || showFullscreen) && (
        <div className="absolute top-2 right-2 z-[5] flex items-center gap-1.5">
          {showFullscreen && onFullscreenClick && (
            <button
              onClick={onFullscreenClick}
              className="md:hidden p-1.5 rounded-md transition-all bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
          {showBookmark && onBookmarkClick && (
            <button
              onClick={onBookmarkClick}
              className={`p-1.5 rounded-md transition-all ${
                isBookmarked
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"
              }`}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
            </button>
          )}
        </div>
      )}

      <CardContent className="p-4 flex-1 flex flex-col gap-1.5">
        {/* Brand Info with Banner */}
        <div className="flex items-center gap-2.5">
          {/* Campaign Banner */}
          {banner_url ? (
            <div className="w-14 h-10 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-border/50">
              <OptimizedImage
                src={banner_url}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0 ring-1 ring-border/50">
              <span className="text-xs font-semibold text-muted-foreground">
                {title?.charAt(0) || "C"}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {/* Brand Logo */}
              {brand_logo_url ? (
                <div className="w-4 h-4 rounded-[3px] overflow-hidden flex-shrink-0 ring-1 ring-border/50">
                  <OptimizedImage
                    src={brand_logo_url}
                    alt={brand_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-[3px] bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-semibold text-muted-foreground">
                    {brand_name?.charAt(0) || "B"}
                  </span>
                </div>
              )}
              <span className="text-xs text-foreground font-semibold font-['Inter'] tracking-[-0.5px] flex items-center gap-1">
                {brand_name}
                {brand_is_verified && <VerifiedBadge size="sm" />}
              </span>
            </div>
            <h3 className="text-sm font-semibold line-clamp-1 leading-snug group-hover:underline font-['Inter'] tracking-[-0.5px]">
              {title}
            </h3>
          </div>
        </div>

        {/* Budget Section */}
        <div className="rounded-lg space-y-1.5">
          {is_infinite_budget ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5 font-['Inter'] tracking-[-0.5px]">
                  <span className="text-base font-bold">∞ Unlimited Budget</span>
                </div>
                {platforms && platforms.length > 0 && (
                  <div className="flex items-center gap-1 opacity-65">
                    {platforms.includes("tiktok") && (
                      <img
                        src={tiktokLogo}
                        alt="TikTok"
                        className="w-3.5 h-3.5 object-contain"
                      />
                    )}
                    {platforms.includes("instagram") && (
                      <img
                        src={instagramLogo}
                        alt="Instagram"
                        className="w-3.5 h-3.5 object-contain"
                      />
                    )}
                    {platforms.includes("youtube") && (
                      <img
                        src={youtubeLogo}
                        alt="YouTube"
                        className="w-3.5 h-3.5 object-contain"
                      />
                    )}
                  </div>
                )}
              </div>
              <div
                className="relative h-1.5 rounded-full overflow-hidden"
                style={{
                  background:
                    "linear-gradient(45deg, hsl(217, 91%, 60%) 25%, hsl(217, 91%, 45%) 25%, hsl(217, 91%, 45%) 50%, hsl(217, 91%, 60%) 50%, hsl(217, 91%, 60%) 75%, hsl(217, 91%, 45%) 75%, hsl(217, 91%, 45%))",
                  backgroundSize: "20px 20px",
                  animation: "slide 1s linear infinite",
                }}
              />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
                <span>No budget limit</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-xs font-semibold font-['Inter'] tracking-[-0.5px]"
                    style={{ color: "#a1a1a1" }}
                  >
                    $
                    {Math.ceil(budget).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                {platforms && platforms.length > 0 && (
                  <div className="flex items-center gap-1 opacity-65">
                    {platforms.includes("tiktok") && (
                      <img
                        src={tiktokLogo}
                        alt="TikTok"
                        className="w-3.5 h-3.5 object-contain"
                      />
                    )}
                    {platforms.includes("instagram") && (
                      <img
                        src={instagramLogo}
                        alt="Instagram"
                        className="w-3.5 h-3.5 object-contain"
                      />
                    )}
                    {platforms.includes("youtube") && (
                      <img
                        src={youtubeLogo}
                        alt="YouTube"
                        className="w-3.5 h-3.5 object-contain"
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="relative h-1.5 rounded-full overflow-hidden bg-muted">
                <div
                  className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium font-['Inter'] tracking-[-0.5px]">
                <span className="font-semibold font-['Inter'] tracking-[-0.5px]">
                  {budgetPercentage.toFixed(0)}% used
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
