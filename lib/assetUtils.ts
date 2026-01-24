/**
 * Asset utility functions
 */

/**
 * Cleans up a filename for display:
 * - Removes file extension
 * - Replaces underscores and dashes with spaces
 * - Converts to title case
 * - Handles common patterns like IMG_, DSC_, Screenshot, etc.
 *
 * @example
 * cleanupFilename("product-shot-final.jpg") => "Product Shot Final"
 * cleanupFilename("IMG_4532.png") => "Img 4532"
 * cleanupFilename("hero_banner_v2_FINAL.webp") => "Hero Banner V2 Final"
 */
export function cleanupFilename(filename: string): string {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

  // Replace underscores and dashes with spaces
  const withSpaces = nameWithoutExt.replace(/[_-]+/g, " ");

  // Remove extra spaces
  const trimmed = withSpaces.replace(/\s+/g, " ").trim();

  // Convert to title case
  const titleCase = trimmed
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      // Keep all-uppercase short words (like V2, HD, etc.) as is
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }
      // Title case: first letter uppercase, rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return titleCase || "Untitled";
}

/**
 * Generates a name for pasted screenshots
 */
export function generateScreenshotName(): string {
  return "Screenshot";
}

/**
 * Detects the asset type from a file's MIME type
 */
export function detectAssetType(mimeType: string): "image" | "video" | "document" {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "document";
}

/**
 * Validates if a file type is supported for upload
 */
export function isValidFileType(file: File): boolean {
  const supportedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];
  const supportedVideoTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];
  const supportedDocumentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ];

  return [
    ...supportedImageTypes,
    ...supportedVideoTypes,
    ...supportedDocumentTypes,
  ].includes(file.type);
}

/**
 * Gets a human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
