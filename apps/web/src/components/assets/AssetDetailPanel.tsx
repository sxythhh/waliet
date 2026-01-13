import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatFileSize, getExtensionFromMimeType } from "@/types/assets";
import { useAssetDownload } from "@/hooks/assets/useAssetDownload";
import type { BrandAsset } from "@/types/assets";

interface AssetDetailPanelProps {
  asset: BrandAsset;
  onClose: () => void;
  onDownload?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  /** When true, adjusts styling for full-height right panel mode */
  fullHeight?: boolean;
}

export function AssetDetailPanel({
  asset,
  onClose,
  onDownload,
  onEdit,
  onDelete,
  className,
  fullHeight = false,
}: AssetDetailPanelProps) {
  // Use internal download if no handler provided
  const downloadMutation = useAssetDownload();

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    }
    downloadMutation.mutate(asset);
  };
  const extension = getExtensionFromMimeType(asset.mime_type);
  const isMedia = asset.type === "image" || asset.type === "video";
  const isLink = asset.type === "link";

  // Get icon based on type
  const getTypeIcon = () => {
    switch (asset.type) {
      case "image":
        return "material-symbols:image-outline";
      case "video":
        return "material-symbols:videocam-outline";
      case "document":
        return "material-symbols:description-outline";
      case "link":
        return "material-symbols:link";
      default:
        return "material-symbols:draft-outline";
    }
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className={cn(
        "flex-shrink-0 border-l border-border/50 bg-card/50 flex flex-col",
        fullHeight ? "w-64" : "w-80",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3 className="text-sm font-medium text-foreground truncate pr-2">
          {asset.name}
        </h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon icon="material-symbols:close" className="w-5 h-5" />
        </button>
      </div>

      {/* Preview */}
      <div className="p-4 border-b border-border/50">
        {isMedia && asset.thumbnail_url ? (
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            {asset.type === "image" ? (
              <img
                src={asset.thumbnail_url || asset.file_url || ""}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={asset.thumbnail_url || ""}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Icon icon="material-symbols:play-arrow" className="w-6 h-6 text-black ml-0.5" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-muted/50 flex flex-col items-center justify-center">
            <Icon icon={getTypeIcon()} className="w-10 h-10 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {asset.type}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        {asset.description && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">
              Description
            </label>
            <p className="mt-1 text-sm text-foreground">
              {asset.description}
            </p>
          </div>
        )}

        {/* File info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Type</span>
            <span className="text-sm text-foreground capitalize">{asset.type}</span>
          </div>

          {extension && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Format</span>
              <span className="text-sm text-foreground uppercase">{extension}</span>
            </div>
          )}

          {asset.file_size && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Size</span>
              <span className="text-sm text-foreground">{formatFileSize(asset.file_size)}</span>
            </div>
          )}

          {isLink && asset.external_url && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">URL</span>
              <span className="text-sm text-foreground truncate max-w-[160px]">
                {new URL(asset.external_url).hostname}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Added</span>
            <span className="text-sm text-foreground">{formatDate(asset.created_at)}</span>
          </div>

          {/* Download count - subtle */}
          {(asset.download_count ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Downloads</span>
              <span className="text-sm text-muted-foreground">{asset.download_count}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">
              Tags
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {asset.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <Button onClick={handleDownload} className="w-full gap-2">
          {isLink ? (
            <>
              <Icon icon="material-symbols:open-in-new" className="w-4 h-4" />
              Open Link
            </>
          ) : (
            <>
              <Icon icon="material-symbols:download" className="w-4 h-4" />
              Download
            </>
          )}
        </Button>

        {(onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
              >
                <Icon icon="material-symbols:edit-outline" className="w-4 h-4" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-muted/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors"
              >
                <Icon icon="material-symbols:delete-outline" className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
