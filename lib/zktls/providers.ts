/**
 * zkTLS provider utilities
 */

const SUPPORTED_PLATFORMS = [
  'tiktok',
  'instagram',
  'youtube',
  'twitter',
  'twitch',
];

/**
 * Check if a platform is supported for zkTLS verification
 */
export function isPlatformSupported(platform: string): boolean {
  return SUPPORTED_PLATFORMS.includes(platform.toLowerCase());
}

/**
 * Get list of supported platforms
 */
export function getSupportedPlatforms(): string[] {
  return [...SUPPORTED_PLATFORMS];
}
