/**
 * Brand Assets Hooks
 *
 * React Query hooks for managing brand assets including:
 * - Asset listing and filtering
 * - Asset upload, update, and deletion
 * - Download tracking
 * - Creator asset requests
 */

// Asset queries and cache management
export {
  useAssets,
  useAsset,
  useAssetCounts,
  useInvalidateAssets,
  assetKeys,
} from "./useAssets";

// Asset mutations (upload, update, delete)
export {
  useAssetUpload,
  useAssetUpdate,
  useAssetDelete,
  useAssetBulkDelete,
} from "./useAssetUpload";

// Download tracking
export {
  useAssetDownload,
  useAssetView,
  useAssetDownloadHistory,
  useAssetDownloadStats,
} from "./useAssetDownload";

// Asset requests
export {
  useAssetRequestsByBrand,
  useMyAssetRequests,
  usePendingRequestCount,
  useCreateAssetRequest,
  useUpdateAssetRequest,
  useDeleteAssetRequest,
  assetRequestKeys,
} from "./useAssetRequests";
