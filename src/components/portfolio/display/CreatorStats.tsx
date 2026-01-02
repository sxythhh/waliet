import { Briefcase, Camera, Globe, Clock, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CURRENCY_OPTIONS, RATE_TYPE_OPTIONS, AVAILABILITY_OPTIONS } from "@/types/portfolio";
import type { RateRange } from "@/types/portfolio";

interface CreatorStatsProps {
  contentNiches: string[];
  equipment: string[];
  languages: string[];
  availability: string | null;
  rateRange: RateRange | null;
}

export function CreatorStats({
  contentNiches,
  equipment,
  languages,
  availability,
  rateRange,
}: CreatorStatsProps) {
  const availabilityLabel = AVAILABILITY_OPTIONS.find((a) => a.id === availability)?.label;
  const currencySymbol = CURRENCY_OPTIONS.find((c) => c.id === rateRange?.currency)?.symbol || "$";
  const rateTypeLabel = RATE_TYPE_OPTIONS.find((t) => t.id === rateRange?.type)?.label?.toLowerCase();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Content Niches */}
      {contentNiches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span className="text-sm font-medium">Content Niches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {contentNiches.map((niche) => (
              <Badge key={niche} variant="secondary" className="px-2.5 py-1">
                {niche}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Equipment */}
      {equipment.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Camera className="h-4 w-4" />
            <span className="text-sm font-medium">Equipment</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {equipment.map((item) => (
              <Badge key={item} variant="outline" className="px-2.5 py-1">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium">Languages</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <Badge key={lang} variant="outline" className="px-2.5 py-1">
                {lang}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Availability & Rates */}
      <div className="space-y-4">
        {availability && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Availability</span>
            </div>
            <Badge
              variant={availability === "not-available" ? "destructive" : "secondary"}
              className="px-3 py-1.5"
            >
              {availabilityLabel}
            </Badge>
          </div>
        )}

        {rateRange && rateRange.min > 0 && rateRange.max > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Rate Range</span>
            </div>
            <p className="text-lg font-semibold">
              {currencySymbol}{rateRange.min.toLocaleString()} - {currencySymbol}{rateRange.max.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {rateTypeLabel}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
