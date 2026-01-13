import { Image, Video, FileText, Link2, Upload, MessageSquarePlus, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AssetEmptyStateProps {
  isAdmin?: boolean;
  onUpload?: () => void;
  onRequestAsset?: () => void;
  className?: string;
}

const ASSET_TYPE_EXAMPLES = [
  {
    icon: Image,
    label: "Images",
    description: "Logos, product photos, graphics",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Video,
    label: "Videos",
    description: "B-roll, intros, outros, tutorials",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: FileText,
    label: "Documents",
    description: "Guidelines, scripts, briefs",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    icon: Link2,
    label: "Links",
    description: "Tools, resources, reference sites",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
];

export function AssetEmptyState({
  isAdmin = false,
  onUpload,
  onRequestAsset,
  className,
}: AssetEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      {/* Icon illustration */}
      <div className="mb-6 flex items-center justify-center gap-2">
        <div className="rounded-lg bg-blue-500/10 p-3">
          <Image className="h-8 w-8 text-blue-400" />
        </div>
        <div className="rounded-lg bg-purple-500/10 p-3">
          <Video className="h-8 w-8 text-purple-400" />
        </div>
        <div className="rounded-lg bg-orange-500/10 p-3">
          <FileText className="h-8 w-8 text-orange-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground">
        No assets uploaded yet
      </h3>

      {/* Description */}
      <p className="mt-2 max-w-md text-muted-foreground">
        {isAdmin
          ? "Upload brand materials for your creators to use in their content."
          : "This brand hasn't uploaded any assets yet. Request materials you need for your content."}
      </p>

      {/* Asset type examples */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ASSET_TYPE_EXAMPLES.map(({ icon: Icon, label, description, color, bg }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-4"
          >
            <div className={cn("rounded-md p-2", bg)}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{label}</div>
              <div className="text-xs text-muted-foreground">{description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {isAdmin && onUpload && (
          <Button onClick={onUpload} size="lg" className="gap-2">
            <Upload size={18} />
            Upload First Asset
          </Button>
        )}
        {onRequestAsset && (
          <Button
            onClick={onRequestAsset}
            variant={isAdmin ? "outline" : "default"}
            size="lg"
            className="gap-2"
          >
            <MessageSquarePlus size={18} />
            Request an Asset
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state for when a filter returns no results
 */
interface AssetNoResultsProps {
  filterType?: string;
  searchQuery?: string;
  onClearFilters?: () => void;
  className?: string;
}

export function AssetNoResults({
  filterType,
  searchQuery,
  onClearFilters,
  className,
}: AssetNoResultsProps) {
  const hasFilters = filterType || searchQuery;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-medium text-foreground">No assets found</h3>

      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {searchQuery
          ? `No assets match "${searchQuery}"`
          : filterType && filterType !== "all"
          ? `No ${filterType} assets available`
          : "No assets match your current filters"}
      </p>

      {hasFilters && onClearFilters && (
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="mt-4"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
