import { memo } from "react";
import { Bookmark, Maximize2 } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
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
  created_at?: string;
  tags?: string[] | null;
  content_distribution?: string | null;
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
  created_at,
  tags,
  content_distribution,
  onClick,
  onBookmarkClick,
  onFullscreenClick
}: BoostDiscoverCardProps) {
  const isEditorBoost = content_distribution === 'brand_accounts';
  const navigate = useNavigate();
  const spotsRemaining = max_accepted_creators - accepted_creators_count;
  const isFull = spotsRemaining <= 0;
  const perVideoRate = videos_per_month > 0 ? monthly_retainer / videos_per_month : 0;
  return <div className={cn("group relative rounded-xl overflow-hidden transition-all duration-200", "border border-border/60 hover:border-border", "bg-transparent hover:bg-muted/20", isEnded ? "opacity-50 cursor-not-allowed" : "cursor-pointer")} onClick={onClick}>
      {/* Bookmark & Fullscreen Buttons - Always visible on mobile, hover on desktop */}
      <div className="absolute top-3 right-3 z-[5] flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
        {onFullscreenClick && <button onClick={onFullscreenClick} className="md:hidden p-1.5 rounded-md bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>}
        {onBookmarkClick && <button onClick={onBookmarkClick} className={cn("p-1.5 rounded-md backdrop-blur-sm transition-colors", isBookmarked ? "bg-primary text-primary-foreground" : "bg-background/90 text-muted-foreground hover:text-foreground")}>
            <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-current")} />
          </button>}
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="text-[15px] font-semibold leading-tight line-clamp-2 text-foreground tracking-[-0.3px] group-hover:underline transition-all pr-8">
          {title}
        </h3>

        {/* Posted By Label */}
        <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
          Posted by: <span className="font-medium text-foreground">{isEditorBoost ? 'Brand' : 'You'}</span>
        </span>

        {/* Stats */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-inter tracking-[-0.5px]">
              <span className="text-foreground font-medium">${monthly_retainer}</span>/mo
            </span>
            <span className="text-border">·</span>
            <span className="font-inter tracking-[-0.5px]">
              <span className="text-foreground font-medium">{videos_per_month}</span>
              <span className="text-muted-foreground">videos</span>
            </span>
            <span className="text-border">·</span>
            <span className="font-inter tracking-[-0.5px]">
              <span className="text-foreground font-medium">${perVideoRate.toFixed(0)}</span>/video
            </span>
          </div>
        </div>

        {/* Tags - fixed height container */}
        <div className="h-5 flex items-center">
          {tags && tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0 h-5 font-normal bg-muted/60 text-muted-foreground rounded"
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
              )}
            </div>
          ) : null}
        </div>

        {/* Spots Info */}
        <div className="flex items-center gap-2 font-inter tracking-[-0.5px]">
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
      <div className="px-3 py-2 bg-muted/40 dark:bg-muted border-t border-border/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {brand_logo_url ? <div className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0 bg-background">
              <OptimizedImage src={brand_logo_url} alt={brand_name} className="w-full h-full object-cover" />
            </div> : <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {brand_name?.charAt(0) || "B"}
              </span>
            </div>}
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-inter tracking-[-0.5px] text-xs font-medium text-foreground truncate hover:underline cursor-pointer transition-colors" onClick={e => {
            e.stopPropagation();
            if (brand_slug) navigate(`/b/${brand_slug}`);
          }}>
              {brand_name}
            </span>
            {brand_is_verified && <VerifiedBadge size="sm" />}
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground font-inter tracking-[-0.3px] flex-shrink-0">
          {created_at ? formatDistanceToNow(new Date(created_at), { addSuffix: true }) : 'Recently'}
        </span>
      </div>
    </div>;
});