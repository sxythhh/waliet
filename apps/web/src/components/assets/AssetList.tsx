import { cn } from "@/lib/utils";
import { AssetRow, AssetRowSkeleton, AssetListHeader } from "./AssetRow";
import type { BrandAsset } from "@/types/assets";

interface AssetListProps {
  assets: BrandAsset[];
  onPreview: (asset: BrandAsset) => void;
  onDownload: (asset: BrandAsset) => void;
  onEdit?: (asset: BrandAsset) => void;
  onDelete?: (asset: BrandAsset) => void;
  isAdmin?: boolean;
  showHeader?: boolean;
  className?: string;
}

export function AssetList({
  assets,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  isAdmin = false,
  showHeader = true,
  className,
}: AssetListProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {showHeader && <AssetListHeader />}
      {assets.map((asset) => (
        <AssetRow
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
 * Loading skeleton for AssetList
 */
interface AssetListSkeletonProps {
  count?: number;
  showHeader?: boolean;
  className?: string;
}

export function AssetListSkeleton({
  count = 5,
  showHeader = true,
  className,
}: AssetListSkeletonProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {showHeader && <AssetListHeader />}
      {Array.from({ length: count }).map((_, i) => (
        <AssetRowSkeleton key={i} />
      ))}
    </div>
  );
}
