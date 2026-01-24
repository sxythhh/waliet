import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface PublicFormHeaderProps {
  brandName: string;
  brandLogo: string | null;
  brandColor: string;
  isVerified?: boolean;
  boostTitle: string;
}

export function PublicFormHeader({
  brandName,
  brandLogo,
  brandColor,
  isVerified,
  boostTitle,
}: PublicFormHeaderProps) {
  return (
    <div className="text-center space-y-4 pb-6 border-b border-border/50">
      {/* Brand Logo */}
      {brandLogo && (
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-offset-2 ring-offset-background"
            style={{ ringColor: brandColor }}
          >
            <OptimizedImage
              src={brandLogo}
              alt={brandName}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Brand Name */}
      <div className="flex items-center justify-center gap-1.5">
        <h2 className="text-lg font-medium text-foreground font-inter tracking-[-0.5px]">
          {brandName}
        </h2>
        {isVerified && <VerifiedBadge />}
      </div>

      {/* Boost Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-inter tracking-[-0.5px]">
        {boostTitle}
      </h1>
    </div>
  );
}
