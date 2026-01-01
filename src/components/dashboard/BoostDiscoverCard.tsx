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
  onFullscreenClick
}: BoostDiscoverCardProps) {
  const navigate = useNavigate();
  const spotsRemaining = max_accepted_creators - accepted_creators_count;
  const isFull = spotsRemaining <= 0;
  const perVideoRate = videos_per_month > 0 ? monthly_retainer / videos_per_month : 0;
  return <div className={cn("group relative rounded-xl overflow-hidden transition-all duration-200", "border border-border/60 hover:border-border", "bg-transparent hover:bg-muted/20", isEnded ? "opacity-50 cursor-not-allowed" : "cursor-pointer")} onClick={onClick}>
      {/* Bookmark & Fullscreen Buttons */}
      <div className="absolute top-3 right-3 z-[5] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {onFullscreenClick && <button onClick={onFullscreenClick} className="md:hidden p-1.5 rounded-full bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>}
        {onBookmarkClick && <button onClick={onBookmarkClick} className={cn("p-1.5 rounded-full backdrop-blur-sm transition-colors", isBookmarked ? "bg-primary text-primary-foreground" : "bg-background/90 text-muted-foreground hover:text-foreground")}>
            <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-current")} />
          </button>}
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="text-[15px] font-semibold leading-tight line-clamp-2 text-foreground tracking-[-0.3px] group-hover:underline transition-all pr-8">
          {title}
        </h3>

        {/* Stats */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-['Inter'] tracking-[-0.5px]">
              <span className="text-foreground font-medium">${monthly_retainer}</span>/mo
            </span>
            <span className="text-border">·</span>
            <span className="font-['Inter'] tracking-[-0.5px]">
              <span className="text-foreground font-medium">{videos_per_month}</span>
              <span className="text-muted-foreground">videos</span>
            </span>
            <span className="text-border">·</span>
            <span className="font-['Inter'] tracking-[-0.5px]">
              <span className="text-foreground font-medium">${perVideoRate.toFixed(0)}</span>/video
            </span>
          </div>
        </div>

        {/* Spots Info */}
        <div className="flex items-center gap-2 font-['Inter'] tracking-[-0.5px]">
          {isEnded ? <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
              Ended
            </span> : isFull ? <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              No spots available
            </span> : <span className="text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{spotsRemaining}</span> spots left
            </span>}
          
        </div>
      </div>

      {/* Brand Footer */}
      <div className="px-4 py-3 bg-muted/40 dark:bg-[#1a1a1a] border-t border-border/40 flex items-center gap-2.5">
        {brand_logo_url ? <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-background">
            <OptimizedImage src={brand_logo_url} alt={brand_name} className="w-full h-full object-cover" />
          </div> : <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">
              {brand_name?.charAt(0) || "B"}
            </span>
          </div>}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-['Inter'] tracking-[-0.5px] text-sm font-medium text-foreground truncate hover:underline cursor-pointer transition-colors" onClick={e => {
          e.stopPropagation();
          if (brand_slug) navigate(`/b/${brand_slug}`);
        }}>
            {brand_name}
          </span>
          {brand_is_verified && <VerifiedBadge size="sm" />}
        </div>
      </div>
    </div>;
});