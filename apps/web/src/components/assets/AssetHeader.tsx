import { Search, LayoutGrid, List, Plus, MessageSquarePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssetTypeTabs } from "./AssetTypeFilter";
import type { AssetType, AssetViewMode } from "@/types/assets";

interface AssetHeaderProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Filters
  activeFilter: AssetType | "all";
  onFilterChange: (filter: AssetType | "all") => void;
  filterCounts?: Record<AssetType | "all", number>;

  // View mode
  viewMode: AssetViewMode;
  onViewModeChange: (mode: AssetViewMode) => void;

  // Actions
  isAdmin?: boolean;
  onUpload?: () => void;
  onRequestAsset?: () => void;

  className?: string;
}

export function AssetHeader({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filterCounts,
  viewMode,
  onViewModeChange,
  isAdmin = false,
  onUpload,
  onRequestAsset,
  className,
}: AssetHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Top row: Search + View toggle + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View toggle + Actions */}
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-border">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "rounded-r-none",
                viewMode !== "grid" && "hover:bg-accent"
              )}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "rounded-l-none border-l border-border",
                viewMode !== "list" && "hover:bg-accent"
              )}
              title="List view"
            >
              <List size={16} />
            </Button>
          </div>

          {/* Request Asset button (for all users) */}
          {onRequestAsset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestAsset}
              className="gap-1.5 hidden sm:flex"
            >
              <MessageSquarePlus size={14} />
              Request
            </Button>
          )}

          {/* Upload button (admin only) */}
          {isAdmin && onUpload && (
            <Button onClick={onUpload} size="sm" className="gap-1.5">
              <Plus size={14} />
              Add Asset
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <AssetTypeTabs
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        counts={filterCounts}
      />
    </div>
  );
}

/**
 * Compact header variant for mobile or embedded views
 */
interface AssetHeaderCompactProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: AssetViewMode;
  onViewModeChange: (mode: AssetViewMode) => void;
  className?: string;
}

export function AssetHeaderCompact({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  className,
}: AssetHeaderCompactProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Search */}
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* View toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onViewModeChange(viewMode === "grid" ? "list" : "grid")}
      >
        {viewMode === "grid" ? <List size={16} /> : <LayoutGrid size={16} />}
      </Button>
    </div>
  );
}
