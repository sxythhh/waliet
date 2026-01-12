import { useState, useEffect } from "react";
import { ChevronDown, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface DateRangeFilterPopoverProps {
  label: string;
  from: string | null; // ISO date string (YYYY-MM-DD)
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
  className?: string;
}

// Preset date ranges
const PRESETS = [
  {
    label: "Last 7 days",
    getValue: () => ({
      from: format(subDays(new Date(), 7), "yyyy-MM-dd"),
      to: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({
      from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
      to: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "Last 90 days",
    getValue: () => ({
      from: format(subDays(new Date(), 90), "yyyy-MM-dd"),
      to: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "This month",
    getValue: () => ({
      from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    }),
  },
  {
    label: "Last month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        to: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      };
    },
  },
];

export function DateRangeFilterPopover({
  label,
  from,
  to,
  onChange,
  className,
}: DateRangeFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState<string>(from || "");
  const [localTo, setLocalTo] = useState<string>(to || "");

  // Sync local state when props change
  useEffect(() => {
    setLocalFrom(from || "");
    setLocalTo(to || "");
  }, [from, to]);

  const applyFilter = () => {
    onChange(localFrom || null, localTo || null);
    setOpen(false);
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    const { from: presetFrom, to: presetTo } = preset.getValue();
    setLocalFrom(presetFrom);
    setLocalTo(presetTo);
    onChange(presetFrom, presetTo);
    setOpen(false);
  };

  const clearFilter = () => {
    setLocalFrom("");
    setLocalTo("");
    onChange(null, null);
    setOpen(false);
  };

  const hasValue = from !== null || to !== null;

  // Format display value
  const getDisplayValue = () => {
    if (!hasValue) return null;

    const formatDate = (d: string) => {
      try {
        return format(new Date(d), "MMM d");
      } catch {
        return d;
      }
    };

    if (from && to) {
      return `${formatDate(from)} - ${formatDate(to)}`;
    }
    if (from) {
      return `From ${formatDate(from)}`;
    }
    if (to) {
      return `Until ${formatDate(to)}`;
    }
    return null;
  };

  const displayValue = getDisplayValue();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-2.5 font-inter tracking-[-0.5px] text-xs border-border/50 bg-transparent hover:bg-muted/50",
            hasValue && "bg-muted/30",
            className
          )}
        >
          <Calendar className="h-3 w-3 opacity-50" />
          <span className={cn(hasValue && "font-medium")}>
            {displayValue || label}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-3" align="start">
        <div className="space-y-3">
          {/* Presets */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              Quick select
            </Label>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="h-6 px-2 text-[10px] font-inter tracking-[-0.3px] border-border/50"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Custom Range */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                From
              </Label>
              <Input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="h-8 text-xs bg-muted/30 border-0"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                To
              </Label>
              <Input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="h-8 text-xs bg-muted/30 border-0"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="default"
              size="sm"
              onClick={applyFilter}
              className="flex-1 h-7 text-xs"
            >
              Apply
            </Button>
            {hasValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilter}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
