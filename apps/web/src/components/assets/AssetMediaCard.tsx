import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import type { BrandAsset } from "@/types/assets";

interface AssetMediaCardProps {
  asset: BrandAsset;
  /** Selected for bulk download */
  isSelected?: boolean;
  /** Selected for detail panel view */
  isDetailSelected?: boolean;
  onClick: () => void;
  onToggleSelection?: () => void;
  className?: string;
}

export function AssetMediaCard({
  asset,
  isSelected = false,
  isDetailSelected = false,
  onClick,
  onToggleSelection,
  className,
}: AssetMediaCardProps) {
  const isVideo = asset.type === "video";
  const hasDownloads = (asset.download_count ?? 0) > 0;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.();
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative aspect-video rounded-lg overflow-hidden bg-muted/50",
        "border-2 border-transparent hover:border-border/50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className
      )}
    >
      {/* Thumbnail */}
      {asset.thumbnail_url || asset.file_url ? (
        <img
          src={asset.thumbnail_url || asset.file_url || ""}
          alt={asset.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Icon
            icon={isVideo ? "material-symbols:videocam-outline" : "material-symbols:image-outline"}
            className="w-8 h-8 text-muted-foreground"
          />
        </div>
      )}

      {/* Video play indicator */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
            <Icon icon="material-symbols:play-arrow" className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Hover overlay with name */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-xs text-white truncate font-medium">
            {asset.name}
          </p>
        </div>
      </div>

      {/* Download count badge - subtle, top right */}
      {hasDownloads && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm flex items-center gap-1">
          <Icon icon="material-symbols:download" className="w-3 h-3 text-white/80" />
          <span className="text-[10px] text-white/80">{asset.download_count}</span>
        </div>
      )}

      {/* Checkbox - visible on hover or when selected */}
      <div
        onClick={handleCheckboxClick}
        className={cn(
          "absolute top-2 left-2 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <div
          className={cn(
            "w-[18px] h-[18px] rounded border flex items-center justify-center transition-colors",
            isSelected
              ? "bg-primary border-primary"
              : "bg-transparent border-border/50"
          )}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}
