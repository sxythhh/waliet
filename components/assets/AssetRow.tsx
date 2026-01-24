import { Download, Eye, MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AssetThumbnail } from "./AssetThumbnail";
import { formatFileSize, getExtensionFromMimeType } from "@/types/assets";
import type { BrandAsset, AssetType } from "@/types/assets";

interface AssetRowProps {
  asset: BrandAsset;
  onPreview: () => void;
  onDownload: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
  className?: string;
}

const TYPE_BADGE_VARIANTS: Record<AssetType, "default" | "secondary" | "outline"> = {
  image: "default",
  video: "secondary",
  document: "outline",
  link: "outline",
};

export function AssetRow({
  asset,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  isAdmin = false,
  className,
}: AssetRowProps) {
  const extension = getExtensionFromMimeType(asset.mime_type);
  const dateAdded = new Date(asset.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-accent/50",
        className
      )}
    >
      {/* Thumbnail */}
      <button
        onClick={onPreview}
        className="shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
      >
        <AssetThumbnail
          type={asset.type}
          thumbnailUrl={asset.thumbnail_url}
          name={asset.name}
          size="md"
        />
      </button>

      {/* Name and description */}
      <div className="min-w-0 flex-1">
        <button
          onClick={onPreview}
          className="block text-left focus:outline-none"
        >
          <h3 className="truncate text-sm font-medium text-foreground hover:text-primary">
            {asset.name}
          </h3>
          {asset.description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {asset.description}
            </p>
          )}
        </button>
      </div>

      {/* Type badge */}
      <div className="hidden w-24 shrink-0 sm:block">
        <Badge variant={TYPE_BADGE_VARIANTS[asset.type]} className="capitalize">
          {asset.type}
        </Badge>
      </div>

      {/* File size */}
      <div className="hidden w-20 shrink-0 text-right text-sm text-muted-foreground md:block">
        {asset.type === "link" ? (
          <span className="text-xs">Link</span>
        ) : (
          formatFileSize(asset.file_size)
        )}
      </div>

      {/* Downloads */}
      <div className="hidden w-20 shrink-0 lg:flex items-center justify-end gap-1 text-sm text-muted-foreground">
        <Download size={12} />
        <span>{asset.download_count}</span>
      </div>

      {/* Date */}
      <div className="hidden w-16 shrink-0 text-right text-sm text-muted-foreground xl:block">
        {dateAdded}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPreview}
          title="Preview"
        >
          <Eye size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDownload}
          title={asset.type === "link" ? "Open Link" : "Download"}
        >
          {asset.type === "link" ? (
            <ExternalLink size={16} />
          ) : (
            <Download size={16} />
          )}
        </Button>

        {/* Admin dropdown */}
        {isAdmin && (onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil size={14} className="mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for AssetRow
 */
export function AssetRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3">
      <div className="h-12 w-12 animate-pulse rounded-md bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
      </div>
      <div className="hidden h-5 w-16 animate-pulse rounded bg-muted sm:block" />
      <div className="hidden h-4 w-12 animate-pulse rounded bg-muted md:block" />
      <div className="hidden h-4 w-12 animate-pulse rounded bg-muted lg:block" />
    </div>
  );
}

/**
 * List header for column labels
 */
export function AssetListHeader() {
  return (
    <div className="flex items-center gap-4 border-b border-border px-3 pb-2 text-xs font-medium text-muted-foreground">
      <div className="w-12 shrink-0" /> {/* Thumbnail space */}
      <div className="flex-1">Name</div>
      <div className="hidden w-24 shrink-0 sm:block">Type</div>
      <div className="hidden w-20 shrink-0 text-right md:block">Size</div>
      <div className="hidden w-20 shrink-0 text-right lg:block">Downloads</div>
      <div className="hidden w-16 shrink-0 text-right xl:block">Added</div>
      <div className="w-24 shrink-0" /> {/* Actions space */}
    </div>
  );
}
