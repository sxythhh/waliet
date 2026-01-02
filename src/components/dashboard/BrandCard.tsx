import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { Briefcase, Zap, Globe, Instagram } from "lucide-react";

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
  const hasSocials = website_url || instagram_handle || tiktok_handle;

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-200",
        "border border-border/60 hover:border-border",
        "bg-card/50 hover:bg-card",
        "cursor-pointer p-4"
      )}
      onClick={handleClick}
    >
      {/* Logo and Name Row */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm"
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
              <span className="text-sm font-bold text-white">
                {name?.charAt(0) || "B"}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground truncate group-hover:underline">
              {name}
            </h3>
            {is_verified && <VerifiedBadge size="sm" />}
          </div>

          {/* Social Icons */}
          {hasSocials && (
            <div className="flex items-center gap-2 mt-1">
              {website_url && (
                <Globe className="h-3 w-3 text-muted-foreground" />
              )}
              {instagram_handle && (
                <Instagram className="h-3 w-3 text-muted-foreground" />
              )}
              {tiktok_handle && (
                <svg className="h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
          {description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
        {campaign_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="h-3 w-3" />
            <span className="font-medium text-foreground">{campaign_count}</span>
          </div>
        )}
        {boost_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap className="h-3 w-3 text-amber-500" />
            <span className="font-medium text-foreground">{boost_count}</span>
          </div>
        )}
        {totalOpportunities === 0 && (
          <span className="text-xs text-muted-foreground">No active opportunities</span>
        )}
      </div>
    </div>
  );
});
