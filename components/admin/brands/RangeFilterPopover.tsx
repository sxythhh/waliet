import { useState, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RangeFilterPopoverProps {
  label: string;
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
  prefix?: string;
  formatValue?: (value: number) => string;
  step?: number;
  className?: string;
}

export function RangeFilterPopover({
  label,
  min,
  max,
  onChange,
  prefix = "",
  formatValue,
  step = 1,
  className,
}: RangeFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState<string>(min?.toString() || "");
  const [localMax, setLocalMax] = useState<string>(max?.toString() || "");

  // Sync local state when props change
  useEffect(() => {
    setLocalMin(min?.toString() || "");
    setLocalMax(max?.toString() || "");
  }, [min, max]);

  const applyFilter = () => {
    const newMin = localMin ? parseFloat(localMin) : null;
    const newMax = localMax ? parseFloat(localMax) : null;
    onChange(newMin, newMax);
    setOpen(false);
  };

  const clearFilter = () => {
    setLocalMin("");
    setLocalMax("");
    onChange(null, null);
    setOpen(false);
  };

  const hasValue = min !== null || max !== null;

  // Format display value
  const getDisplayValue = () => {
    if (!hasValue) return null;

    const format = formatValue || ((v: number) => `${prefix}${v}`);

    if (min !== null && max !== null) {
      return `${format(min)} - ${format(max)}`;
    }
    if (min !== null) {
      return `≥ ${format(min)}`;
    }
    if (max !== null) {
      return `≤ ${format(max)}`;
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
          <span className={cn(hasValue && "font-medium")}>
            {displayValue || label}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-3" align="start">
        <div className="space-y-3">
          {/* Min Input */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              Minimum
            </Label>
            <div className="relative">
              {prefix && (
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {prefix}
                </span>
              )}
              <Input
                type="number"
                step={step}
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                placeholder="No min"
                className={cn(
                  "h-8 text-xs bg-muted/30 border-0",
                  prefix && "pl-6"
                )}
              />
            </div>
          </div>

          {/* Max Input */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              Maximum
            </Label>
            <div className="relative">
              {prefix && (
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {prefix}
                </span>
              )}
              <Input
                type="number"
                step={step}
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                placeholder="No max"
                className={cn(
                  "h-8 text-xs bg-muted/30 border-0",
                  prefix && "pl-6"
                )}
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
