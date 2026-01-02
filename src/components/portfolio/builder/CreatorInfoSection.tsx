import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      <div className="space-y-3">
        <Label>Content Niches</Label>
        <div className="flex flex-wrap gap-2">
          {contentNiches.map((niche) => (
            <Badge
              key={niche}
              variant="secondary"
              className="pl-3 pr-1 py-1.5 text-sm flex items-center gap-1.5"
            >
              {niche}
              <button
                onClick={() => handleRemoveNiche(niche)}
                className="p-0.5 rounded-full hover:bg-background/50 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Select onValueChange={handleAddNiche}>
          <SelectTrigger className="w-full">
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
      </div>

      {/* Equipment */}
      <div className="space-y-3">
        <Label>Equipment</Label>
        <div className="flex flex-wrap gap-2">
          {equipment.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className="pl-3 pr-1 py-1.5 text-sm flex items-center gap-1.5"
            >
              {item}
              <button
                onClick={() => handleRemoveEquipment(item)}
                className="p-0.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Select onValueChange={handleAddEquipment}>
          <SelectTrigger className="w-full">
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
      </div>

      {/* Languages */}
      <div className="space-y-3">
        <Label>Languages</Label>
        <div className="flex flex-wrap gap-2">
          {languages.map((lang) => (
            <Badge
              key={lang}
              variant="outline"
              className="pl-3 pr-1 py-1.5 text-sm flex items-center gap-1.5"
            >
              {lang}
              <button
                onClick={() => handleRemoveLanguage(lang)}
                className="p-0.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Select onValueChange={handleAddLanguage}>
          <SelectTrigger className="w-full">
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
      </div>

      {/* Availability */}
      <div className="space-y-3">
        <Label>Availability</Label>
        <Select value={availability || ""} onValueChange={onAvailabilityChange}>
          <SelectTrigger className="w-full">
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
      </div>

      {/* Rate Range */}
      <div className="space-y-3">
        <Label>Rate Range (optional)</Label>
        <div className="grid grid-cols-4 gap-2">
          <Select
            value={rateRange?.currency || "USD"}
            onValueChange={(value) => updateRateRange("currency", value)}
          >
            <SelectTrigger>
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
            onChange={(e) => updateRateRange("min", parseInt(e.target.value) || 0)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={rateRange?.max || ""}
            onChange={(e) => updateRateRange("max", parseInt(e.target.value) || 0)}
          />
          <Select
            value={rateRange?.type || "project"}
            onValueChange={(value) => updateRateRange("type", value)}
          >
            <SelectTrigger>
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
        <p className="text-xs text-muted-foreground">
          {rateRange?.min && rateRange?.max
            ? `${CURRENCY_OPTIONS.find((c) => c.id === rateRange.currency)?.symbol}${rateRange.min} - ${CURRENCY_OPTIONS.find((c) => c.id === rateRange.currency)?.symbol}${rateRange.max} ${RATE_TYPE_OPTIONS.find((t) => t.id === rateRange.type)?.label.toLowerCase()}`
            : "Set your rate range to help brands understand your pricing"}
        </p>
      </div>
    </div>
  );
}
