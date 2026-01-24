/**
 * Brand Assets Components
 *
 * UI components for the brand assets management system
 */

// Main container
export { AssetLibrary } from "./AssetLibrary";

// Display components
export { AssetMediaCard } from "./AssetMediaCard";
export { AssetDocumentRow } from "./AssetDocumentRow";
export { AssetDetailPanel } from "./AssetDetailPanel";

// Legacy components (kept for backwards compatibility)
export { AssetHeader, AssetHeaderCompact } from "./AssetHeader";
export { AssetTypeFilter, AssetTypeTabs } from "./AssetTypeFilter";
export { AssetGrid, AssetGridSkeleton } from "./AssetGrid";
export { AssetList, AssetListSkeleton } from "./AssetList";
export { AssetCard, AssetCardSkeleton } from "./AssetCard";
export { AssetRow, AssetRowSkeleton, AssetListHeader } from "./AssetRow";
export { AssetThumbnail, AssetThumbnailLarge } from "./AssetThumbnail";
export { AssetEmptyState, AssetNoResults } from "./AssetEmptyState";

// Dialogs
export { AssetPreviewDialog } from "./AssetPreviewDialog";
export { AssetUploadDialog } from "./AssetUploadDialog";
export { AssetRequestDialog } from "./AssetRequestDialog";
export { AssetDeleteDialog } from "./AssetDeleteDialog";
export { AssetUploadQueue } from "./AssetUploadQueue";

// Admin request management
export { AssetRequestCard, AssetRequestCardSkeleton } from "./AssetRequestCard";
export { AssetRequestsPanel, RequestCountBadge } from "./AssetRequestsPanel";
