/**
 * Brand Assets Types
 *
 * Type definitions for the brand assets management system including
 * assets, downloads tracking, and creator requests.
 */

// ==========================================
// Enums
// ==========================================

export type AssetType = "image" | "video" | "document" | "link";

export type AssetRequestPriority = "low" | "normal" | "high";

export type AssetRequestStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "declined";

// ==========================================
// Core Types
// ==========================================

/**
 * Brand asset record from database
 */
export interface BrandAsset {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  type: AssetType;
  file_path: string | null;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  download_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Asset download record for analytics
 */
export interface AssetDownload {
  id: string;
  asset_id: string;
  user_id: string | null;
  downloaded_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * Creator request for a brand asset
 */
export interface AssetRequest {
  id: string;
  brand_id: string;
  requested_by: string;
  title: string;
  description: string;
  asset_type: AssetType | null;
  priority: AssetRequestPriority;
  status: AssetRequestStatus;
  response_note: string | null;
  fulfilled_asset_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

/**
 * Asset request with requester profile info (joined)
 */
export interface AssetRequestWithRequester extends AssetRequest {
  requester?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  };
}

// ==========================================
// Filter & Query Types
// ==========================================

/**
 * Filters for querying assets
 */
export interface AssetFilters {
  type?: AssetType | "all";
  search?: string;
  tags?: string[];
}

/**
 * View mode for asset display
 */
export type AssetViewMode = "grid" | "list";

/**
 * Sort options for assets
 */
export type AssetSortBy = "created_at" | "name" | "download_count" | "type";
export type AssetSortOrder = "asc" | "desc";

export interface AssetSortOptions {
  sortBy: AssetSortBy;
  sortOrder: AssetSortOrder;
}

// ==========================================
// Form/Input Types
// ==========================================

/**
 * Input for creating a new asset
 */
export interface CreateAssetInput {
  brand_id: string;
  name: string;
  description?: string;
  type: AssetType;
  file?: File;
  external_url?: string;
  tags?: string[];
}

/**
 * Input for updating an existing asset
 */
export interface UpdateAssetInput {
  name?: string;
  description?: string | null;
  tags?: string[];
  external_url?: string;
}

/**
 * Input for creating an asset request
 */
export interface CreateAssetRequestInput {
  brand_id: string;
  title: string;
  description: string;
  asset_type?: AssetType;
  priority?: AssetRequestPriority;
}

/**
 * Input for updating an asset request (admin)
 */
export interface UpdateAssetRequestInput {
  status?: AssetRequestStatus;
  response_note?: string;
  fulfilled_asset_id?: string;
}

// ==========================================
// Statistics Types
// ==========================================

/**
 * Asset statistics for a brand
 */
export interface AssetStats {
  total_assets: number;
  assets_by_type: Record<AssetType, number>;
  total_downloads: number;
  total_storage_bytes: number;
  pending_requests: number;
}

/**
 * Individual asset analytics
 */
export interface AssetAnalytics {
  asset_id: string;
  download_count: number;
  view_count: number;
  downloads_last_7_days: number;
  downloads_last_30_days: number;
  top_downloaders: Array<{
    user_id: string;
    username: string | null;
    download_count: number;
  }>;
}

// ==========================================
// File Upload Types
// ==========================================

/**
 * Supported file types by asset category
 */
export const SUPPORTED_FILE_TYPES: Record<AssetType, string[]> = {
  image: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"],
  video: ["video/mp4", "video/quicktime", "video/webm"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ],
  link: [], // Links don't have file uploads
};

/**
 * File size limits by asset type (in bytes)
 */
export const FILE_SIZE_LIMITS: Record<AssetType, number> = {
  image: 25 * 1024 * 1024, // 25 MB
  video: 300 * 1024 * 1024, // 300 MB
  document: 50 * 1024 * 1024, // 50 MB
  link: 0, // Not applicable
};

/**
 * Human-readable file extensions by type
 */
export const FILE_EXTENSIONS: Record<AssetType, string> = {
  image: "PNG, JPG, GIF, WEBP, SVG",
  video: "MP4, MOV, WEBM",
  document: "PDF, DOC, DOCX, TXT, MD",
  link: "N/A",
};

// ==========================================
// UI Helper Types
// ==========================================

/**
 * Asset type metadata for UI display
 */
export interface AssetTypeInfo {
  type: AssetType;
  label: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  accept: string; // Input accept attribute
}

export const ASSET_TYPE_INFO: Record<AssetType, Omit<AssetTypeInfo, "type">> = {
  image: {
    label: "Images",
    icon: "Image",
    color: "text-blue-500",
    accept: "image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml",
  },
  video: {
    label: "Videos",
    icon: "Video",
    color: "text-purple-500",
    accept: "video/mp4,video/quicktime,video/webm",
  },
  document: {
    label: "Documents",
    icon: "FileText",
    color: "text-orange-500",
    accept: "application/pdf,.doc,.docx,.txt,.md",
  },
  link: {
    label: "Links",
    icon: "Link2",
    color: "text-green-500",
    accept: "",
  },
};

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get file extension from mime type
 */
export function getExtensionFromMimeType(mimeType: string | null): string {
  if (!mimeType) return "";

  const mimeToExt: Record<string, string> = {
    "image/png": "PNG",
    "image/jpeg": "JPG",
    "image/jpg": "JPG",
    "image/gif": "GIF",
    "image/webp": "WEBP",
    "image/svg+xml": "SVG",
    "video/mp4": "MP4",
    "video/quicktime": "MOV",
    "video/webm": "WEBM",
    "application/pdf": "PDF",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "text/plain": "TXT",
    "text/markdown": "MD",
  };

  return mimeToExt[mimeType] || mimeType.split("/")[1]?.toUpperCase() || "";
}
