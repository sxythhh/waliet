import { Download, ExternalLink, X, Calendar, HardDrive, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAssetDownload } from "@/hooks/assets/useAssetDownload";
import { formatFileSize, getExtensionFromMimeType, ASSET_TYPE_INFO } from "@/types/assets";
import type { BrandAsset } from "@/types/assets";

interface AssetPreviewDialogProps {
  asset: BrandAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetPreviewDialog({
  asset,
  open,
  onOpenChange,
}: AssetPreviewDialogProps) {
  const downloadMutation = useAssetDownload();

  if (!asset) return null;

  const typeInfo = ASSET_TYPE_INFO[asset.type];
  const extension = getExtensionFromMimeType(asset.mime_type);
  const dateAdded = new Date(asset.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleDownload = () => {
    downloadMutation.mutate(asset);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span className="truncate">{asset.name}</span>
            <Badge variant="outline" className="shrink-0 capitalize">
              {asset.type}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Preview area */}
        <div className="mt-4">
          {/* Image preview */}
          {asset.type === "image" && (asset.file_url || asset.thumbnail_url) && (
            <div className="flex justify-center rounded-lg bg-muted p-4">
              <img
                src={asset.file_url || asset.thumbnail_url || ""}
                alt={asset.name}
                className="max-h-[400px] rounded object-contain"
              />
            </div>
          )}

          {/* Video preview */}
          {asset.type === "video" && asset.file_url && (
            <div className="rounded-lg bg-muted p-4">
              <video
                src={asset.file_url}
                controls
                className="mx-auto max-h-[400px] rounded"
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {/* Document preview - show icon and download CTA */}
          {asset.type === "document" && (
            <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-8">
              <div className="rounded-lg bg-orange-500/10 p-4">
                <HardDrive className="h-12 w-12 text-orange-400" />
              </div>
              <p className="mt-4 text-lg font-medium">{asset.name}</p>
              <p className="text-sm text-muted-foreground">
                {extension} Document • {formatFileSize(asset.file_size)}
              </p>
            </div>
          )}

          {/* Link preview */}
          {asset.type === "link" && asset.external_url && (
            <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-8">
              <div className="rounded-lg bg-green-500/10 p-4">
                <ExternalLink className="h-12 w-12 text-green-400" />
              </div>
              <p className="mt-4 text-lg font-medium">{asset.name}</p>
              <p className="mt-2 max-w-md truncate text-sm text-muted-foreground">
                {asset.external_url}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {asset.description && (
          <p className="mt-4 text-sm text-muted-foreground">
            {asset.description}
          </p>
        )}

        {/* Metadata */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {asset.type !== "link" && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Type:</span>
                <span>{extension || asset.type}</span>
              </div>
              {asset.file_size && (
                <div className="flex items-center gap-1.5">
                  <HardDrive size={14} />
                  <span>{formatFileSize(asset.file_size)}</span>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>Added {dateAdded}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Download size={14} />
            <span>{asset.download_count} downloads</span>
          </div>
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {asset.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} className="gap-2">
            {asset.type === "link" ? (
              <>
                <ExternalLink size={16} />
                Open Link
              </>
            ) : (
              <>
                <Download size={16} />
                Download
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
