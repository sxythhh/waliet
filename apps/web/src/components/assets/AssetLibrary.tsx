import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useAssets, useAssetCounts } from "@/hooks/assets/useAssets";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AssetMediaCard } from "./AssetMediaCard";
import { AssetDocumentRow } from "./AssetDocumentRow";
import { AssetUploadQueue } from "./AssetUploadQueue";
import { isValidFileType } from "@/lib/assetUtils";
import { toast } from "sonner";
import type { BrandAsset, AssetFilters } from "@/types/assets";
import { useAssetDownload } from "@/hooks/assets/useAssetDownload";

interface AssetLibraryProps {
  brandId: string;
  isAdmin?: boolean;
  selectedAsset?: BrandAsset | null;
  onSelectAsset?: (asset: BrandAsset | null) => void;
  onUpload?: () => void;
  onRequestAsset?: () => void;
  onEdit?: (asset: BrandAsset) => void;
  onDelete?: (asset: BrandAsset) => void;
  className?: string;
}

export function AssetLibrary({
  brandId,
  isAdmin = false,
  selectedAsset,
  onSelectAsset,
  onUpload,
  onRequestAsset,
  onEdit,
  onDelete,
  className,
}: AssetLibraryProps) {
  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Multi-select state (no mode toggle - checkbox on hover triggers selection)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const hasSelection = selectedIds.size > 0;

  // Drag-drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [isUploadQueueOpen, setIsUploadQueueOpen] = useState(false);
  const [isScreenshotUpload, setIsScreenshotUpload] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // Download mutation
  const downloadMutation = useAssetDownload();

  // Debounce search input
  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearch(value);
  }, 300);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  // Build filters
  const filters: AssetFilters = {
    type: "all",
    search: debouncedSearch || undefined,
  };

  // Fetch assets
  const {
    data: assets = [],
    isLoading,
    error,
  } = useAssets({ brandId, filters });

  // Fetch counts
  const { data: counts } = useAssetCounts(brandId);

  // Split assets into media (images/videos) and documents (documents/links)
  const { mediaAssets, documentAssets } = useMemo(() => {
    const media: BrandAsset[] = [];
    const docs: BrandAsset[] = [];

    assets.forEach((asset) => {
      if (asset.type === "image" || asset.type === "video") {
        media.push(asset);
      } else {
        docs.push(asset);
      }
    });

    return { mediaAssets: media, documentAssets: docs };
  }, [assets]);

  // Handlers
  const handleSelect = useCallback((asset: BrandAsset) => {
    // If already showing in detail panel, toggle bulk selection
    if (selectedAsset?.id === asset.id) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(asset.id)) {
          next.delete(asset.id);
        } else {
          next.add(asset.id);
        }
        return next;
      });
    } else {
      // First click opens detail panel
      onSelectAsset?.(asset);
    }
  }, [selectedAsset, onSelectAsset]);

  // Toggle selection via checkbox
  const handleToggleSelection = useCallback((asset: BrandAsset) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) {
        next.delete(asset.id);
      } else {
        next.add(asset.id);
      }
      return next;
    });
  }, []);

  // Select all visible media assets (not documents)
  const handleSelectAll = useCallback(() => {
    const mediaIds = new Set(mediaAssets.map((a) => a.id));
    setSelectedIds(mediaIds);
  }, [mediaAssets]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk download
  const handleBulkDownload = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const selectedAssets = assets.filter((a) => selectedIds.has(a.id));
    // Filter out links - can't download those in bulk
    const downloadableAssets = selectedAssets.filter((a) => a.type !== "link" && a.file_url);

    if (downloadableAssets.length === 0) {
      toast.error("No downloadable files selected");
      return;
    }

    setIsDownloading(true);
    toast.info(`Downloading ${downloadableAssets.length} files...`);

    // Download sequentially with a small delay
    for (let i = 0; i < downloadableAssets.length; i++) {
      const asset = downloadableAssets[i];
      try {
        await downloadMutation.mutateAsync(asset);
        // Small delay between downloads to prevent browser blocking
        if (i < downloadableAssets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to download ${asset.name}:`, error);
      }
    }

    setIsDownloading(false);
    toast.success(`Downloaded ${downloadableAssets.length} files`);

    // Clear selection after download
    setSelectedIds(new Set());
  }, [selectedIds, assets, downloadMutation]);

  // Handle files for upload (validates and opens queue)
  const handleFilesForUpload = useCallback(
    (files: File[], isScreenshot = false) => {
      if (!isAdmin) return;

      // Filter valid files
      const validFiles = files.filter((file) => {
        if (!isValidFileType(file)) {
          toast.error(`"${file.name}" is not a supported file type`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setUploadQueue(validFiles);
      setIsScreenshotUpload(isScreenshot);
      setIsUploadQueueOpen(true);
    },
    [isAdmin]
  );

  // Drag-drop handlers
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAdmin) return;

      dragCounterRef.current++;
      if (e.dataTransfer.types.includes("Files")) {
        setIsDragOver(true);
      }
    },
    [isAdmin]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAdmin) return;

      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragOver(false);
      }
    },
    [isAdmin]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAdmin) return;

      dragCounterRef.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFilesForUpload(files);
      }
    },
    [isAdmin, handleFilesForUpload]
  );

  // Clipboard paste handler
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!isAdmin) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        handleFilesForUpload(imageFiles, true);
      }
    },
    [isAdmin, handleFilesForUpload]
  );

  // Set up paste listener
  useEffect(() => {
    if (!isAdmin) return;

    const container = containerRef.current;
    if (!container) return;

    // Add paste listener to document when component mounts
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [isAdmin, handlePaste]);

  // Handle upload queue completion
  const handleUploadComplete = useCallback(() => {
    setUploadQueue([]);
    setIsUploadQueueOpen(false);
    setIsScreenshotUpload(false);
  }, []);

  // Determine states
  const hasAssets = assets.length > 0;
  const hasAnyAssets = (counts?.all ?? 0) > 0;
  const isSearching = debouncedSearch.length > 0;
  const noSearchResults = isSearching && !hasAssets && hasAnyAssets;

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col min-h-0 relative", className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay - only visible when dragging files */}
      {isDragOver && isAdmin && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon icon="material-symbols:upload" className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">Drop files to upload</p>
              <p className="text-sm text-muted-foreground">Images, videos, and documents</p>
            </div>
          </div>
        </div>
      )}

      {/* Header - search and actions */}
      {hasAnyAssets && (
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Icon
              icon="material-symbols:search"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-6 pr-6 py-1.5 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/60"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Icon icon="material-symbols:close" className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Admin upload button */}
          {isAdmin && onUpload && (
            <button
              onClick={onUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              <Icon icon="material-symbols:add" className="w-4 h-4" />
              Add
            </button>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
          {/* Loading state */}
          {isLoading && <LoadingSkeleton />}

          {/* Error state */}
          {error && !isLoading && (
            <div className="py-12 text-center">
              <Icon icon="material-symbols:error-outline" className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load assets</p>
            </div>
          )}

          {/* Empty state - no assets at all */}
          {!isLoading && !error && !hasAnyAssets && (
            <EmptyState
              isAdmin={isAdmin}
              onUpload={onUpload}
              onRequestAsset={onRequestAsset}
            />
          )}

          {/* No search results */}
          {!isLoading && !error && noSearchResults && (
            <NoResultsState
              searchQuery={debouncedSearch}
              onClear={() => handleSearchChange("")}
              onRequestAsset={onRequestAsset}
            />
          )}

          {/* Assets display - grouped sections */}
          {!isLoading && !error && hasAssets && (
            <div className="space-y-8">
              {/* Media Section (Images & Videos) */}
              {mediaAssets.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    Media ({mediaAssets.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {mediaAssets.map((asset) => (
                      <AssetMediaCard
                        key={asset.id}
                        asset={asset}
                        isSelected={selectedIds.has(asset.id)}
                        isDetailSelected={selectedAsset?.id === asset.id}
                        onClick={() => handleSelect(asset)}
                        onToggleSelection={() => handleToggleSelection(asset)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Documents Section (Documents & Links) */}
              {documentAssets.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    Documents ({documentAssets.length})
                  </h3>
                  <div className="border border-border/50 rounded-lg overflow-hidden divide-y divide-border/50">
                    {documentAssets.map((asset) => (
                      <AssetDocumentRow
                        key={asset.id}
                        asset={asset}
                        onClick={() => onSelectAsset?.(asset)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Subtle request link at bottom */}
              {onRequestAsset && (
                <div className="pt-4 text-center">
                  <button
                    onClick={onRequestAsset}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Can't find what you need?{" "}
                    <span className="underline underline-offset-2">Request an asset</span>
                  </button>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Bulk selection action bar - fixed to bottom of viewport */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg py-2 px-3 flex items-center gap-2 shadow-lg">
          <span className="text-sm font-medium text-foreground px-1">
            {selectedIds.size} selected
          </span>
          <div className="w-px h-4 bg-border/50" />
          <button
            onClick={handleSelectAll}
            className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 py-1 rounded transition-colors"
          >
            Select all
          </button>
          <button
            onClick={handleClearSelection}
            className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded transition-colors"
          >
            <Icon icon="material-symbols:close" className="w-3.5 h-3.5" />
          </button>
          <Button
            onClick={handleBulkDownload}
            disabled={isDownloading}
            size="sm"
            className="gap-1.5 ml-1"
          >
            {isDownloading ? (
              <>
                <Icon icon="material-symbols:progress-activity" className="w-4 h-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Icon icon="material-symbols:download" className="w-4 h-4" />
                Download
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload Queue Modal */}
      <AssetUploadQueue
        brandId={brandId}
        files={uploadQueue}
        isOpen={isUploadQueueOpen}
        onClose={() => setIsUploadQueueOpen(false)}
        onComplete={handleUploadComplete}
        isScreenshot={isScreenshotUpload}
      />
    </div>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Media section skeleton */}
      <section>
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
      {/* Documents section skeleton */}
      <section>
        <div className="h-4 w-28 bg-muted rounded animate-pulse mb-4" />
        <div className="border border-border/50 rounded-lg overflow-hidden divide-y divide-border/50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/30 animate-pulse" />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Empty state - instructional
 */
interface EmptyStateProps {
  isAdmin?: boolean;
  onUpload?: () => void;
  onRequestAsset?: () => void;
}

function EmptyState({ isAdmin, onUpload, onRequestAsset }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon icon="material-symbols:folder-outline" className="w-6 h-6 text-muted-foreground" />
      </div>

      <h3 className="text-base font-medium text-foreground mb-2">
        Brand Assets
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {isAdmin
          ? "Share logos, product photos, videos, and documents with your creators. Assets uploaded here will be available in all your campaigns."
          : "This is where the brand shares materials for your content — logos, product photos, videos, guidelines, and useful links. Check back later or request what you need."}
      </p>

      {/* Asset type hints */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground mb-8">
        <div className="flex items-center gap-1.5">
          <Icon icon="material-symbols:image-outline" className="w-4 h-4" />
          <span>Images</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon icon="material-symbols:videocam-outline" className="w-4 h-4" />
          <span>Videos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon icon="material-symbols:description-outline" className="w-4 h-4" />
          <span>Documents</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon icon="material-symbols:link" className="w-4 h-4" />
          <span>Links</span>
        </div>
      </div>

      {/* Actions */}
      {isAdmin && onUpload ? (
        <Button onClick={onUpload} className="gap-2">
          <Icon icon="material-symbols:upload" className="w-4 h-4" />
          Upload Asset
        </Button>
      ) : onRequestAsset ? (
        <Button onClick={onRequestAsset} variant="outline" className="gap-2">
          <Icon icon="material-symbols:chat-add-on-outline" className="w-4 h-4" />
          Request an Asset
        </Button>
      ) : null}
    </div>
  );
}

/**
 * No search results state
 */
interface NoResultsStateProps {
  searchQuery: string;
  onClear: () => void;
  onRequestAsset?: () => void;
}

function NoResultsState({ searchQuery, onClear, onRequestAsset }: NoResultsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon icon="material-symbols:search-off" className="w-6 h-6 text-muted-foreground" />
      </div>

      <h3 className="text-base font-medium text-foreground mb-2">
        No results found
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        No assets match "{searchQuery}". Try a different search or request what you need.
      </p>

      <div className="flex items-center gap-3">
        <Button onClick={onClear} variant="outline" size="sm">
          Clear search
        </Button>
        {onRequestAsset && (
          <Button onClick={onRequestAsset} variant="outline" size="sm" className="gap-1.5">
            <Icon icon="material-symbols:chat-add-on-outline" className="w-4 h-4" />
            Request Asset
          </Button>
        )}
      </div>
    </div>
  );
}
