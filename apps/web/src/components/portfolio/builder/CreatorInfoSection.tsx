import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CONTENT_NICHES,
  EQUIPMENT_OPTIONS,
  LANGUAGE_OPTIONS,
  AVAILABILITY_OPTIONS,
  CURRENCY_OPTIONS,
  RATE_TYPE_OPTIONS,
} from "@/types/portfolio";
import type { RateRange } from "@/types/portfolio";

interface CreatorInfoSectionProps {
  contentNiches: string[];
  equipment: string[];
  languages: string[];
  availability: string | null;
  rateRange: RateRange | null;
  onContentNichesChange: (value: string[]) => void;
  onEquipmentChange: (value: string[]) => void;
  onLanguagesChange: (value: string[]) => void;
  onAvailabilityChange: (value: string | null) => void;
  onRateRangeChange: (value: RateRange | null) => void;
}

export function CreatorInfoSection({
  contentNiches,
  equipment,
  languages,
  availability,
  rateRange,
  onContentNichesChange,
  onEquipmentChange,
  onLanguagesChange,
  onAvailabilityChange,
  onRateRangeChange,
}: CreatorInfoSectionProps) {
  const handleAddNiche = (niche: string) => {
    if (!contentNiches.includes(niche)) {
      onContentNichesChange([...contentNiches, niche]);
    }
  };

  const handleRemoveNiche = (niche: string) => {
    onContentNichesChange(contentNiches.filter((n) => n !== niche));
  };

  const handleAddEquipment = (item: string) => {
    if (!equipment.includes(item)) {
      onEquipmentChange([...equipment, item]);
    }
  };

  const handleRemoveEquipment = (item: string) => {
    onEquipmentChange(equipment.filter((e) => e !== item));
  };

  const handleAddLanguage = (lang: string) => {
    if (!languages.includes(lang)) {
      onLanguagesChange([...languages, lang]);
    }
  };

  const handleRemoveLanguage = (lang: string) => {
    onLanguagesChange(languages.filter((l) => l !== lang));
  };

  const updateRateRange = (field: keyof RateRange, value: string | number) => {
    const current = rateRange || { min: 0, max: 0, currency: "USD", type: "project" as const };
    onRateRangeChange({ ...current, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Content Niches */}
      <InfoGroup label="Content Niches" description="What topics do you create content about?">
        {contentNiches.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {contentNiches.map((niche) => (
              <TagBadge key={niche} onRemove={() => handleRemoveNiche(niche)}>
                {niche}
              </TagBadge>
            ))}
          </div>
        )}
        <Select onValueChange={handleAddNiche}>
          <SelectTrigger className="bg-muted/30 border-0 focus:ring-1">
            <SelectValue placeholder="Add a niche..." />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_NICHES.filter((n) => !contentNiches.includes(n)).map((niche) => (
              <SelectItem key={niche} value={niche}>
                {niche}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </InfoGroup>

      {/* Equipment */}
      <InfoGroup label="Equipment" description="What gear do you use for content creation?">
        {equipment.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {equipment.map((item) => (
              <TagBadge key={item} onRemove={() => handleRemoveEquipment(item)}>
                {item}
              </TagBadge>
            ))}
          </div>
        )}
        <Select onValueChange={handleAddEquipment}>
          <SelectTrigger className="bg-muted/30 border-0 focus:ring-1">
            <SelectValue placeholder="Add equipment..." />
          </SelectTrigger>
          <SelectContent>
            {EQUIPMENT_OPTIONS.filter((e) => !equipment.includes(e)).map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </InfoGroup>

      {/* Languages */}
      <InfoGroup label="Languages" description="What languages can you create content in?">
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {languages.map((lang) => (
              <TagBadge key={lang} onRemove={() => handleRemoveLanguage(lang)}>
                {lang}
              </TagBadge>
            ))}
          </div>
        )}
        <Select onValueChange={handleAddLanguage}>
          <SelectTrigger className="bg-muted/30 border-0 focus:ring-1">
            <SelectValue placeholder="Add a language..." />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.filter((l) => !languages.includes(l)).map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </InfoGroup>

      {/* Availability */}
      <InfoGroup label="Availability" description="How available are you for new projects?">
        <Select value={availability || ""} onValueChange={onAvailabilityChange}>
          <SelectTrigger className="bg-muted/30 border-0 focus:ring-1">
            <SelectValue placeholder="Select availability..." />
          </SelectTrigger>
          <SelectContent>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availability && (
          <div className="mt-2">
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                availability === "available" && "bg-emerald-500/10 text-emerald-600",
                availability === "limited" && "bg-amber-500/10 text-amber-600",
                availability === "busy" && "bg-red-500/10 text-red-600",
                availability === "unavailable" && "bg-muted text-muted-foreground"
              )}
            >
              {AVAILABILITY_OPTIONS.find((o) => o.id === availability)?.label}
            </span>
          </div>
        )}
      </InfoGroup>

      {/* Rate Range */}
      <InfoGroup label="Rate Range" description="Set your pricing to help brands understand your rates" optional>
        <div className="grid grid-cols-4 gap-2">
          <Select
            value={rateRange?.currency || "USD"}
            onValueChange={(value) => updateRateRange("currency", value)}
          >
            <SelectTrigger className="bg-muted/30 border-0 focus:ring-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.symbol} {opt.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Min"
            value={rateRange?.min || ""}
            onChange={(e) => updateRateRange("min", parseInt(e.target.value, 10) || 0)}
            className="bg-muted/30 border-0 focus-visible:ring-1"
          />
          <Input
            type="number"
            placeholder="Max"
            value={rateRange?.max || ""}
            onChange={(e) => updateRateRange("max", parseInt(e.target.value, 10) || 0)}
            className="bg-muted/30 border-0 focus-visible:ring-1"
          />
          <Select
            value={rateRange?.type || "project"}
            onValueChange={(value) => updateRateRange("type", value)}
          >
            <SelectTrigger className="bg-muted/30 border-0 focus:ring-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATE_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rateRange?.min !== undefined && rateRange?.max !== undefined && rateRange.min > 0 && rateRange.max > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {CURRENCY_OPTIONS.find((c) => c.id === rateRange.currency)?.symbol}
            {rateRange.min.toLocaleString()} – {CURRENCY_OPTIONS.find((c) => c.id === rateRange.currency)?.symbol}
            {rateRange.max.toLocaleString()}{" "}
            {RATE_TYPE_OPTIONS.find((t) => t.id === rateRange.type)?.label.toLowerCase()}
          </p>
        )}
      </InfoGroup>
    </div>
  );
}

// Info Group Component - simplified without icons
function InfoGroup({
  label,
  description,
  optional,
  children,
}: {
  label: string;
  description?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium tracking-[-0.5px]">{label}</Label>
          {optional && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Optional
            </span>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// Tag Badge Component
function TagBadge({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 px-3 py-1.5 rounded-full",
        "bg-muted text-foreground text-sm",
        "border border-border/50"
      )}
    >
      <span>{children}</span>
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full opacity-60 hover:opacity-100 hover:bg-muted-foreground/20 transition-all"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
