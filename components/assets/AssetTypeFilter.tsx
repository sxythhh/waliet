import { Image, Video, FileText, Link2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AssetType } from "@/types/assets";

interface AssetTypeFilterProps {
  activeFilter: AssetType | "all";
  onFilterChange: (filter: AssetType | "all") => void;
  counts?: Record<AssetType | "all", number>;
  className?: string;
}

interface FilterOption {
  value: AssetType | "all";
  label: string;
  icon: typeof Image;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: "all", label: "All", icon: Layers },
  { value: "image", label: "Images", icon: Image },
  { value: "video", label: "Videos", icon: Video },
  { value: "document", label: "Documents", icon: FileText },
  { value: "link", label: "Links", icon: Link2 },
];

export function AssetTypeFilter({
  activeFilter,
  onFilterChange,
  counts,
  className,
}: AssetTypeFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {FILTER_OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = activeFilter === value;
        const count = counts?.[value] ?? 0;

        return (
          <Button
            key={value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(value)}
            className={cn(
              "gap-1.5 transition-all",
              !isActive && "bg-transparent hover:bg-accent"
            )}
          >
            <Icon size={14} />
            <span>{label}</span>
            {counts && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.5 text-xs",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Compact tabs variant for smaller spaces
 */
interface AssetTypeTabsProps {
  activeFilter: AssetType | "all";
  onFilterChange: (filter: AssetType | "all") => void;
  counts?: Record<AssetType | "all", number>;
  className?: string;
}

export function AssetTypeTabs({
  activeFilter,
  onFilterChange,
  counts,
  className,
}: AssetTypeTabsProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg bg-muted p-1",
        className
      )}
    >
      {FILTER_OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = activeFilter === value;
        const count = counts?.[value] ?? 0;

        return (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
            {counts && count > 0 && (
              <span
                className={cn(
                  "text-xs",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
