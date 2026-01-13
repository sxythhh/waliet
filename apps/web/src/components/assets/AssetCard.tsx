import { Download, Eye, MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AssetThumbnailLarge } from "./AssetThumbnail";
import { formatFileSize, getExtensionFromMimeType } from "@/types/assets";
import type { BrandAsset } from "@/types/assets";

interface AssetCardProps {
  asset: BrandAsset;
  onPreview: () => void;
  onDownload: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
  className?: string;
}

export function AssetCard({
  asset,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  isAdmin = false,
  className,
}: AssetCardProps) {
  const extension = getExtensionFromMimeType(asset.mime_type);
  const fileInfo = asset.type === "link"
    ? "External Link"
    : `${extension}${asset.file_size ? ` • ${formatFileSize(asset.file_size)}` : ""}`;

  return (
    <Card
      variant="bordered"
      className={cn(
        "group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-md",
        className
      )}
    >
      {/* Thumbnail area - clickable for preview */}
      <button
        onClick={onPreview}
        className="w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <AssetThumbnailLarge
          type={asset.type}
          thumbnailUrl={asset.thumbnail_url}
          fileUrl={asset.file_url}
          name={asset.name}
        />
      </button>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3
          className="truncate text-sm font-medium text-foreground"
          title={asset.name}
        >
          {asset.name}
        </h3>

        {/* Meta info */}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {fileInfo}
        </p>

        {/* Download count */}
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Download size={12} />
          <span>{asset.download_count} downloads</span>
        </div>

        {/* Actions - visible on hover */}
        <div className="mt-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="flex-1 gap-1.5"
          >
            <Eye size={14} />
            Preview
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onDownload}
            className="flex-1 gap-1.5"
          >
            {asset.type === "link" ? (
              <>
                <ExternalLink size={14} />
                Open
              </>
            ) : (
              <>
                <Download size={14} />
                Download
              </>
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
    </Card>
  );
}

/**
 * Skeleton loading state for AssetCard
 */
export function AssetCardSkeleton() {
  return (
    <Card variant="bordered" className="overflow-hidden">
      <div className="aspect-video w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </Card>
  );
}
