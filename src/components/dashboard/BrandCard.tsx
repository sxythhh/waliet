import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";

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
        "group relative rounded-xl overflow-hidden transition-colors duration-200",
        "bg-card border border-border/50 hover:border-border",
        "cursor-pointer font-['Inter',sans-serif]"
      )}
      style={{ letterSpacing: '-0.5px' }}
      onClick={handleClick}
    >
      <div className="p-4">
        {/* Header: Logo + Brand Info */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div
            className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
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

          {/* Name and Verified */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {name}
              </h3>
              {is_verified && <VerifiedBadge size="sm" />}
            </div>
            {/* Opportunity count inline */}
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalOpportunities > 0
                ? `${totalOpportunities} active ${totalOpportunities === 1 ? 'opportunity' : 'opportunities'}`
                : 'No active opportunities'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
});
