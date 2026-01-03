import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Pencil, Globe } from "lucide-react";

interface ProfileDetailsCardProps {
  profile: {
    bio: string | null;
    city: string | null;
    country: string | null;
    show_location: boolean;
    content_styles: string[] | null;
    content_languages: string[] | null;
  };
  onEdit: () => void;
}

export function ProfileDetailsCard({ profile, onEdit }: ProfileDetailsCardProps) {
  const hasLocation = profile.show_location && (profile.city || profile.country);
  const hasContentStyles = profile.content_styles && profile.content_styles.length > 0;
  const hasContentLanguages = profile.content_languages && profile.content_languages.length > 0;
  const hasBio = profile.bio && profile.bio.trim().length > 0;

  const isEmpty = !hasBio && !hasLocation && !hasContentStyles && !hasContentLanguages;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground font-['Inter'] tracking-[-0.5px]">
          About
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
      </div>

      {isEmpty ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">
            Add details about yourself to help brands get to know you
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="mt-3"
          >
            Complete Profile
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bio */}
          {hasBio && (
            <p className="text-sm text-foreground font-['Inter'] tracking-[-0.5px] leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Location */}
          {hasLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="font-['Inter'] tracking-[-0.5px]">
                {[profile.city, profile.country].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          {/* Content Styles */}
          {hasContentStyles && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                Content Styles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.content_styles!.map((style, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs font-normal capitalize"
                  >
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Content Languages */}
          {hasContentLanguages && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <span className="font-['Inter'] tracking-[-0.5px]">
                {profile.content_languages!.join(", ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
