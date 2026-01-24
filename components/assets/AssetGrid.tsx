import { cn } from "@/lib/utils";
import { AssetCard, AssetCardSkeleton } from "./AssetCard";
import type { BrandAsset } from "@/types/assets";

interface AssetGridProps {
  assets: BrandAsset[];
  onPreview: (asset: BrandAsset) => void;
  onDownload: (asset: BrandAsset) => void;
  onEdit?: (asset: BrandAsset) => void;
  onDelete?: (asset: BrandAsset) => void;
  isAdmin?: boolean;
  className?: string;
}

export function AssetGrid({
  assets,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  isAdmin = false,
  className,
}: AssetGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onPreview={() => onPreview(asset)}
          onDownload={() => onDownload(asset)}
          onEdit={onEdit ? () => onEdit(asset) : undefined}
          onDelete={onDelete ? () => onDelete(asset) : undefined}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

/**
 * Loading skeleton for AssetGrid
 */
interface AssetGridSkeletonProps {
  count?: number;
  className?: string;
}

export function AssetGridSkeleton({
  count = 8,
  className,
}: AssetGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <AssetCardSkeleton key={i} />
      ))}
    </div>
  );
}
