import { Image, Video, FileText, Link2, File } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetType } from "@/types/assets";

interface AssetThumbnailProps {
  type: AssetType;
  thumbnailUrl?: string | null;
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const TYPE_ICONS: Record<AssetType, typeof Image> = {
  image: Image,
  video: Video,
  document: FileText,
  link: Link2,
};

const TYPE_COLORS: Record<AssetType, string> = {
  image: "bg-blue-500/20 text-blue-400",
  video: "bg-purple-500/20 text-purple-400",
  document: "bg-orange-500/20 text-orange-400",
  link: "bg-green-500/20 text-green-400",
};

const SIZE_CLASSES = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

const ICON_SIZES = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function AssetThumbnail({
  type,
  thumbnailUrl,
  name,
  className,
  size = "md",
}: AssetThumbnailProps) {
  const Icon = TYPE_ICONS[type] || File;
  const colorClass = TYPE_COLORS[type] || "bg-muted text-muted-foreground";
  const iconSize = ICON_SIZES[size];

  // If we have a thumbnail URL (for images), show the image
  if (thumbnailUrl && type === "image") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-md bg-muted",
          SIZE_CLASSES[size],
          className
        )}
      >
        <img
          src={thumbnailUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* Type badge overlay */}
        <div className="absolute bottom-0.5 right-0.5">
          <div
            className={cn(
              "rounded p-0.5",
              TYPE_COLORS[type]
            )}
          >
            <Icon size={10} />
          </div>
        </div>
      </div>
    );
  }

  // For videos with thumbnails
  if (thumbnailUrl && type === "video") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-md bg-muted",
          SIZE_CLASSES[size],
          className
        )}
      >
        <img
          src={thumbnailUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="rounded-full bg-white/90 p-1">
            <Video size={12} className="text-purple-600" />
          </div>
        </div>
      </div>
    );
  }

  // Default: show type icon
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md",
        SIZE_CLASSES[size],
        colorClass,
        className
      )}
    >
      <Icon size={iconSize} />
    </div>
  );
}

/**
 * Larger thumbnail for grid cards with aspect ratio
 */
interface AssetThumbnailLargeProps {
  type: AssetType;
  thumbnailUrl?: string | null;
  fileUrl?: string | null;
  name: string;
  className?: string;
}

export function AssetThumbnailLarge({
  type,
  thumbnailUrl,
  fileUrl,
  name,
  className,
}: AssetThumbnailLargeProps) {
  const Icon = TYPE_ICONS[type] || File;
  const colorClass = TYPE_COLORS[type] || "bg-muted text-muted-foreground";

  // For images, show the actual image
  if (type === "image" && (thumbnailUrl || fileUrl)) {
    return (
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-md bg-muted",
          className
        )}
      >
        <img
          src={thumbnailUrl || fileUrl || ""}
          alt={name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        {/* Type badge */}
        <div className="absolute bottom-2 right-2">
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
              "bg-black/60 text-white backdrop-blur-sm"
            )}
          >
            <Icon size={12} />
            <span>Image</span>
          </div>
        </div>
      </div>
    );
  }

  // For videos with thumbnails
  if (type === "video" && thumbnailUrl) {
    return (
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-md bg-muted",
          className
        )}
      >
        <img
          src={thumbnailUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/60 p-3 backdrop-blur-sm transition-transform group-hover:scale-110">
            <Video size={24} className="text-white" />
          </div>
        </div>
        {/* Type badge */}
        <div className="absolute bottom-2 right-2">
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
              "bg-black/60 text-white backdrop-blur-sm"
            )}
          >
            <Video size={12} />
            <span>Video</span>
          </div>
        </div>
      </div>
    );
  }

  // Default: centered icon with gradient background
  return (
    <div
      className={cn(
        "relative flex aspect-video w-full items-center justify-center rounded-md",
        colorClass,
        className
      )}
    >
      <Icon size={48} className="opacity-60" />
      {/* Type label */}
      <div className="absolute bottom-2 right-2">
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
            "bg-black/40 text-white backdrop-blur-sm"
          )}
        >
          <Icon size={12} />
          <span className="capitalize">{type}</span>
        </div>
      </div>
    </div>
  );
}
