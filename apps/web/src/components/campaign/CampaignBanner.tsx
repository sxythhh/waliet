import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface CampaignBannerProps {
  bannerUrl?: string | null;
  brandLogoUrl?: string | null;
  brandName: string;
  brandColor?: string | null;
  isVerified?: boolean;
  campaignTitle: string;
  subtitle?: string;
  className?: string;
}

export function CampaignBanner({
  bannerUrl,
  brandLogoUrl,
  brandName,
  brandColor,
  isVerified,
  campaignTitle,
  subtitle,
  className,
}: CampaignBannerProps) {
  // Generate gradient fallback using brand color or default
  const gradientColor = brandColor || "#5865f2";
  const gradientStyle = !bannerUrl
    ? {
        background: `linear-gradient(135deg, ${gradientColor} 0%, ${gradientColor}99 30%, ${gradientColor}44 70%, hsl(var(--background)) 100%)`,
      }
    : undefined;

  return (
    <div className={cn("relative w-full", className)}>
      {/* Banner Image or Gradient Fallback */}
      <div
        className="h-36 md:h-44 lg:h-52 w-full overflow-hidden rounded-xl relative"
        style={gradientStyle}
      >
        {bannerUrl && (
          <OptimizedImage
            src={bannerUrl}
            alt={campaignTitle}
            className="w-full h-full object-cover"
          />
        )}
        {/* Multiple gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 to-transparent" />

        {/* Decorative elements */}
        {!bannerUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-foreground/5 blur-2xl" />
            <div className="absolute bottom-8 left-8 w-24 h-24 rounded-full bg-foreground/5 blur-xl" />
          </div>
        )}
      </div>

      {/* Brand logo and title positioned at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 lg:px-6 lg:pb-5">
        <div className="flex items-end gap-4">
          {/* Avatar with ring effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-background rounded-xl transform scale-110" />
            <Avatar className="h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 rounded-xl relative shadow-xl ring-4 ring-background">
              <AvatarImage src={brandLogoUrl || undefined} className="object-cover rounded-lg" />
              <AvatarFallback
                className="text-lg md:text-xl font-bold rounded-lg"
                style={{
                  backgroundColor: brandColor || "#5865f2",
                  color: "white"
                }}
              >
                {brandName?.charAt(0) || "B"}
              </AvatarFallback>
            </Avatar>
            {isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                <VerifiedBadge size="sm" />
              </div>
            )}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs md:text-sm font-semibold text-foreground/70 uppercase tracking-wide">
                {brandName}
              </span>
            </div>
            <h1
              className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground truncate tracking-tight"
              title={campaignTitle}
            >
              {campaignTitle}
            </h1>
            {subtitle && (
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="h-3 w-3 text-muted-foreground/60" />
                <p className="text-xs md:text-sm text-muted-foreground">
                  {subtitle}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
