import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { Briefcase, Zap, ArrowRight } from "lucide-react";

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
        "group relative rounded-xl overflow-hidden transition-all duration-300",
        "bg-card border border-border/50",
        "hover:-translate-y-1 hover:shadow-lg",
        "cursor-pointer font-['Inter',sans-serif]"
      )}
      style={{ letterSpacing: '-0.5px' }}
      onClick={handleClick}
    >
      {/* Background glow effect using brand color */}
      <div
        className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"
        style={{
          background: brand_color
            ? `radial-gradient(circle at top right, ${brand_color}, transparent 70%)`
            : undefined,
        }}
      />

      <div className="relative p-4">
        {/* Header: Logo + Brand Info */}
        <div className="flex items-center gap-3 mb-3">
          {/* Logo */}
          <div
            className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-border/50 group-hover:ring-border transition-all"
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
                <span className="text-base font-bold text-white">
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

          {/* Arrow */}
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-primary group-hover:text-white transition-all">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        {/* Stats Row */}
        {totalOpportunities > 0 && (
          <div className="flex items-center gap-3 pt-3 border-t border-border/50">
            {campaign_count > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {campaign_count} {campaign_count === 1 ? 'Campaign' : 'Campaigns'}
                </span>
              </div>
            )}
            {campaign_count > 0 && boost_count > 0 && (
              <span className="text-border">•</span>
            )}
            {boost_count > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {boost_count} {boost_count === 1 ? 'Boost' : 'Boosts'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
