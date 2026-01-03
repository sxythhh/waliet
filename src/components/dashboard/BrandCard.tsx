import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { Briefcase, Zap, ArrowUpRight } from "lucide-react";

export interface BrandCardProps {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_verified?: boolean;
  brand_color?: string | null;
  campaign_count?: number;
  boost_count?: number;
  description?: string | null;
  website_url?: string | null;
  instagram_handle?: string | null;
  tiktok_handle?: string | null;
  onClick?: () => void;
}

export const BrandCard = memo(function BrandCard({
  id,
  name,
  slug,
  logo_url,
  is_verified,
  brand_color,
  campaign_count = 0,
  boost_count = 0,
  description,
  website_url,
  instagram_handle,
  tiktok_handle,
  onClick,
}: BrandCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/b/${slug}`);
    }
  };

  const totalOpportunities = campaign_count + boost_count;

  return (
    <div
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-300",
        "bg-gradient-to-b from-card to-card/80",
        "border border-border/40 hover:border-border/80",
        "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
        "cursor-pointer"
      )}
      onClick={handleClick}
    >
      {/* Accent bar at top */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: brand_color || "#6366f1" }}
      />

      <div className="p-4">
        {/* Logo and Arrow */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md ring-1 ring-black/5"
            style={{ backgroundColor: brand_color || "#1a1a1a" }}
          >
            {logo_url ? (
              <OptimizedImage
                src={logo_url}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {name?.charAt(0) || "B"}
                </span>
              </div>
            )}
          </div>
          <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Name and Verified */}
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-sm font-semibold text-foreground truncate tracking-[-0.3px]">
            {name}
          </h3>
          {is_verified && <VerifiedBadge size="sm" />}
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
            {description}
          </p>
        )}

        {/* Stats Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {campaign_count > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              <Briefcase className="h-3 w-3" />
              <span className="text-xs font-medium">{campaign_count} {campaign_count === 1 ? 'Campaign' : 'Campaigns'}</span>
            </div>
          )}
          {boost_count > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500">
              <Zap className="h-3 w-3" />
              <span className="text-xs font-medium">{boost_count} {boost_count === 1 ? 'Boost' : 'Boosts'}</span>
            </div>
          )}
          {totalOpportunities === 0 && (
            <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-muted/50">No active opportunities</span>
          )}
        </div>
      </div>
    </div>
  );
});
