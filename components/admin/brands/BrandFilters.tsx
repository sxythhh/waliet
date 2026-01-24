import { useState, useCallback } from "react";
import { Search, X, ChevronDown, Link2, Link2Off, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  BrandFilters as BrandFiltersType,
  SUBSCRIPTION_STATUS_OPTIONS,
  BRAND_TYPE_OPTIONS,
  SOURCE_OPTIONS,
} from "@/types/brand-filters";
import { CloseLeadStatus } from "@/hooks/useCloseBrand";
import { MultiSelectDropdown } from "./MultiSelectDropdown";
import { RangeFilterPopover } from "./RangeFilterPopover";
import { DateRangeFilterPopover } from "./DateRangeFilterPopover";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

interface BrandFiltersProps {
  filters: BrandFiltersType;
  onFiltersChange: (updates: Partial<BrandFiltersType>) => void;
  onClear: () => void;
  closeStatuses: CloseLeadStatus[];
  activeFilterCount: number;
}

// Format currency for display
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

// Tri-state toggle button component
function TriStateToggle({
  label,
  value,
  onChange,
  trueLabel = "Yes",
  falseLabel = "No",
  trueIcon,
  falseIcon,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  trueLabel?: string;
  falseLabel?: string;
  trueIcon?: React.ReactNode;
  falseIcon?: React.ReactNode;
}) {
  const cycleValue = () => {
    if (value === null) onChange(true);
    else if (value === true) onChange(false);
    else onChange(null);
  };

  const hasValue = value !== null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={cycleValue}
      className={cn(
        "h-8 gap-1.5 px-2.5 font-inter tracking-[-0.5px] text-xs border-border/50 bg-transparent hover:bg-muted/50",
        hasValue && "bg-muted/30"
      )}
    >
      {value === true && trueIcon}
      {value === false && falseIcon}
      <span className={cn(hasValue && "font-medium")}>
        {value === null ? label : value ? trueLabel : falseLabel}
      </span>
    </Button>
  );
}

export function BrandFilters({
  filters,
  onFiltersChange,
  onClear,
  closeStatuses,
  activeFilterCount,
}: BrandFiltersProps) {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  // Debounced search handler (300ms)
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      onFiltersChange({ search: value });
    },
    300
  );

  // Convert Close statuses to options format
  const statusOptions = closeStatuses.map((s) => ({
    value: s.id,
    label: s.label,
  }));

  // Count filters in "More Filters" section
  const moreFiltersCount =
    (filters.brandTypes.length > 0 ? 1 : 0) +
    (filters.sources.length > 0 ? 1 : 0) +
    (filters.opportunityCountMin !== null ||
    filters.opportunityCountMax !== null
      ? 1
      : 0) +
    (filters.lastActivityFrom !== null || filters.lastActivityTo !== null
      ? 1
      : 0) +
    (filters.createdFrom !== null || filters.createdTo !== null ? 1 : 0) +
    (filters.updatedFrom !== null || filters.updatedTo !== null ? 1 : 0) +
    (filters.syncedFrom !== null || filters.syncedTo !== null ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-border/50 bg-muted/5">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[180px] max-w-[240px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search brands..."
          defaultValue={filters.search}
          onChange={(e) => debouncedSearch(e.target.value)}
          className="pl-8 h-8 text-xs font-inter tracking-[-0.5px] bg-muted/30 border-0 rounded-lg placeholder:text-muted-foreground/60"
        />
      </div>

      <div className="h-5 w-px bg-border/50" />

      {/* Close Status Multi-Select */}
      {statusOptions.length > 0 && (
        <MultiSelectDropdown
          label="Status"
          options={statusOptions}
          selected={filters.closeStatusIds}
          onChange={(ids) => onFiltersChange({ closeStatusIds: ids })}
        />
      )}

      {/* Linked/Unlinked Toggle */}
      <TriStateToggle
        label="Close"
        value={filters.hasCloseLead}
        onChange={(v) => onFiltersChange({ hasCloseLead: v })}
        trueLabel="Linked"
        falseLabel="Unlinked"
        trueIcon={<Link2 className="h-3 w-3" />}
        falseIcon={<Link2Off className="h-3 w-3" />}
      />

      {/* Pipeline Value Range */}
      <RangeFilterPopover
        label="Pipeline"
        min={filters.pipelineValueMin}
        max={filters.pipelineValueMax}
        onChange={(min, max) =>
          onFiltersChange({ pipelineValueMin: min, pipelineValueMax: max })
        }
        prefix="$"
        formatValue={formatCurrency}
        step={1000}
      />

      {/* Subscription Status Multi-Select */}
      <MultiSelectDropdown
        label="Subscription"
        options={[...SUBSCRIPTION_STATUS_OPTIONS]}
        selected={filters.subscriptionStatuses}
        onChange={(statuses) =>
          onFiltersChange({ subscriptionStatuses: statuses })
        }
      />

      {/* Verified Toggle */}
      <TriStateToggle
        label="Verified"
        value={filters.isVerified}
        onChange={(v) => onFiltersChange({ isVerified: v })}
        trueLabel="Verified"
        falseLabel="Unverified"
        trueIcon={<CheckCircle2 className="h-3 w-3 text-emerald-500" />}
        falseIcon={<XCircle className="h-3 w-3 text-muted-foreground" />}
      />

      {/* More Filters Dropdown */}
      <Popover open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1.5 px-2.5 font-inter tracking-[-0.5px] text-xs border-border/50 bg-transparent hover:bg-muted/50",
              moreFiltersCount > 0 && "bg-muted/30"
            )}
          >
            <span className={cn(moreFiltersCount > 0 && "font-medium")}>
              More
              {moreFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                  {moreFiltersCount}
                </span>
              )}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-4" align="end">
          <div className="space-y-4">
            <h4 className="text-sm font-medium font-inter tracking-[-0.5px]">
              Additional Filters
            </h4>

            {/* Brand Type */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Brand Type
              </label>
              <MultiSelectDropdown
                label="Select types"
                options={[...BRAND_TYPE_OPTIONS]}
                selected={filters.brandTypes}
                onChange={(types) => onFiltersChange({ brandTypes: types })}
                className="w-full justify-between"
              />
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Source
              </label>
              <MultiSelectDropdown
                label="Select sources"
                options={[...SOURCE_OPTIONS]}
                selected={filters.sources}
                onChange={(sources) => onFiltersChange({ sources })}
                className="w-full justify-between"
              />
            </div>

            {/* Opportunity Count */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Opportunity Count
              </label>
              <RangeFilterPopover
                label="Any count"
                min={filters.opportunityCountMin}
                max={filters.opportunityCountMax}
                onChange={(min, max) =>
                  onFiltersChange({
                    opportunityCountMin: min,
                    opportunityCountMax: max,
                  })
                }
                step={1}
                className="w-full justify-between"
              />
            </div>

            <div className="h-px bg-border/50" />

            {/* Date Filters */}
            <div className="space-y-3">
              <label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Date Ranges
              </label>

              <DateRangeFilterPopover
                label="Last Activity"
                from={filters.lastActivityFrom}
                to={filters.lastActivityTo}
                onChange={(from, to) =>
                  onFiltersChange({
                    lastActivityFrom: from,
                    lastActivityTo: to,
                  })
                }
                className="w-full justify-between"
              />

              <DateRangeFilterPopover
                label="Created Date"
                from={filters.createdFrom}
                to={filters.createdTo}
                onChange={(from, to) =>
                  onFiltersChange({ createdFrom: from, createdTo: to })
                }
                className="w-full justify-between"
              />

              <DateRangeFilterPopover
                label="Updated Date"
                from={filters.updatedFrom}
                to={filters.updatedTo}
                onChange={(from, to) =>
                  onFiltersChange({ updatedFrom: from, updatedTo: to })
                }
                className="w-full justify-between"
              />

              <DateRangeFilterPopover
                label="Last Synced"
                from={filters.syncedFrom}
                to={filters.syncedTo}
                onChange={(from, to) =>
                  onFiltersChange({ syncedFrom: from, syncedTo: to })
                }
                className="w-full justify-between"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear All Button */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px]"
        >
          <X className="h-3 w-3 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
