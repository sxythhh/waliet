import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { formatFileSize, getExtensionFromMimeType } from "@/types/assets";
import type { BrandAsset } from "@/types/assets";

interface AssetDocumentRowProps {
  asset: BrandAsset;
  onClick: () => void;
  className?: string;
}

export function AssetDocumentRow({
  asset,
  onClick,
  className,
}: AssetDocumentRowProps) {
  const isLink = asset.type === "link";
  const extension = getExtensionFromMimeType(asset.mime_type);
  const hasDownloads = (asset.download_count ?? 0) > 0;

  // Get icon based on type and extension
  const getIcon = () => {
    if (isLink) {
      // Check for known link types
      if (asset.external_url?.includes("drive.google.com")) {
        return "logos:google-drive";
      }
      if (asset.external_url?.includes("dropbox.com")) {
        return "logos:dropbox";
      }
      if (asset.external_url?.includes("notion.")) {
        return "simple-icons:notion";
      }
      if (asset.external_url?.includes("figma.")) {
        return "logos:figma";
      }
      return "material-symbols:link";
    }

    // Document icons based on extension
    const ext = extension?.toLowerCase();
    if (ext === "pdf") return "material-symbols:picture-as-pdf";
    if (["doc", "docx"].includes(ext || "")) return "material-symbols:description";
    if (["xls", "xlsx"].includes(ext || "")) return "material-symbols:table-chart";
    if (["ppt", "pptx"].includes(ext || "")) return "material-symbols:slideshow";
    if (["txt", "md"].includes(ext || "")) return "material-symbols:article";

    return "material-symbols:draft";
  };

  // Format date
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Get hostname for links
  const getHostname = () => {
    if (!asset.external_url) return null;
    try {
      return new URL(asset.external_url).hostname.replace("www.", "");
    } catch {
      return null;
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-3 px-4 py-3 text-left",
        "hover:bg-muted/30",
        className
      )}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/50">
        <Icon
          icon={getIcon()}
          className="w-5 h-5 text-muted-foreground"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name + type badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {asset.name}
          </span>
          {extension && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] uppercase tracking-wide rounded bg-muted text-muted-foreground">
              {extension}
            </span>
          )}
        </div>

        {/* Description or URL */}
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {asset.description || (isLink && getHostname()) || "No description"}
        </p>
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-4 flex-shrink-0 text-xs text-muted-foreground">
        {/* Size for documents */}
        {asset.file_size && (
          <span className="hidden sm:block w-16 text-right">
            {formatFileSize(asset.file_size)}
          </span>
        )}

        {/* Download count */}
        {hasDownloads && (
          <span className="hidden sm:flex items-center gap-1 w-12">
            <Icon icon="material-symbols:download" className="w-3.5 h-3.5" />
            {asset.download_count}
          </span>
        )}

        {/* Date */}
        <span className="w-20 text-right">
          {formatDate(asset.created_at)}
        </span>

        {/* Chevron */}
        <Icon
          icon="material-symbols:chevron-right"
          className="w-5 h-5 text-muted-foreground/50"
        />
      </div>
    </button>
  );
}
