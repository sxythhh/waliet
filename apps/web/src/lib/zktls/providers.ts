// zkTLS Provider Configuration
// Supporting TikTok via Reclaim Protocol with two verification types:
// 1. Account-wide audience insights (primary for creator verification)
// 2. Per-video analytics (for brand-requested fraud verification)

import { ZkTLSProvider } from './types';

// TikTok Account-Wide Audience Insights Provider (PRIMARY)
// Extracts comprehensive account analytics: overview, viewers, followers, traffic sources
export const TIKTOK_ACCOUNT_PROVIDER: ZkTLSProvider = {
  id: 'tiktok-account',
  platform: 'tiktok',
  name: 'TikTok Audience Insights',
  reclaimProviderId: '603b4a67-f8fe-42bf-8154-4c88a2672244',
  extractableFields: [
    'user_profile',
    'overview_metrics',
    'viewer_demographics',
    'viewer_active_times',
    'follower_demographics',
    'follower_active_times',
    'traffic_sources',
    'search_terms',
    'rewards',
  ],
  requiresVideoId: false,
};

// TikTok Demographics Provider (via TikTok Studio Insights API)
// Extracts viewer demographics: countries, ages, genders + user profile
// Uses the /aweme/v2/data/insight/ endpoint for viewer analytics
export const TIKTOK_DEMOGRAPHICS_PROVIDER: ZkTLSProvider = {
  id: 'tiktok-demographics',
  platform: 'tiktok',
  name: 'TikTok Viewer Demographics',
  reclaimProviderId: '6392b7c7-684e-4a08-814d-f12fe085fd65',
  extractableFields: [
    'userId',
    'username',
    'viewer_country_city_percent',
    'viewer_age_distribution',
    'viewer_gender_percent',
  ],
  requiresVideoId: false,
};

// TikTok Per-Video Analytics Provider (SECONDARY)
// Used only for brand-requested verification of specific videos suspected of fraud
export const TIKTOK_VIDEO_PROVIDER: ZkTLSProvider = {
  id: 'tiktok-video',
  platform: 'tiktok',
  name: 'TikTok Video Analytics',
  reclaimProviderId: '9ec60ce1-e131-428c-b4fc-865f9782a09c',
  extractableFields: [
    'video_performance',
    'demographics',
    'engagement_rate',
    'traffic_sources',
    'viewer_stats',
  ],
  requiresVideoId: true,
};

// Instagram Account-Wide Profile Provider (PRIMARY)
// Extracts account profile data: username, follower_count, following_count
export const INSTAGRAM_ACCOUNT_PROVIDER: ZkTLSProvider = {
  id: 'instagram-account',
  platform: 'instagram',
  name: 'Instagram Profile Verification',
  reclaimProviderId: '7729ae3e-179c-4ac8-8c5d-4bcd909c864d',
  extractableFields: [
    'username',
    'follower_count',
    'following_count',
  ],
  requiresVideoId: false,
};

// Instagram Per-Post Analytics Provider (SECONDARY)
// Used for brand-requested verification of specific posts/reels
export const INSTAGRAM_POST_PROVIDER: ZkTLSProvider = {
  id: 'instagram-post',
  platform: 'instagram',
  name: 'Instagram Post Insights',
  reclaimProviderId: '04c62f5c-acd6-4ac0-a2f7-4d614a406ab6',
  extractableFields: [
    'total_content_views_count',
    'people_reach_based',
    'instagram_media_id',
  ],
  requiresVideoId: true, // requires content_id (post shortcode)
};

// Legacy export for backwards compatibility
export const TIKTOK_ANALYTICS_PROVIDER = TIKTOK_ACCOUNT_PROVIDER;

// All supported providers
export const ZKTLS_PROVIDERS: Record<string, ZkTLSProvider> = {
  'tiktok-account': TIKTOK_ACCOUNT_PROVIDER,
  'tiktok-demographics': TIKTOK_DEMOGRAPHICS_PROVIDER,
  'tiktok-video': TIKTOK_VIDEO_PROVIDER,
  'instagram-account': INSTAGRAM_ACCOUNT_PROVIDER,
  'instagram-post': INSTAGRAM_POST_PROVIDER,
  // Legacy aliases
  'tiktok-analytics': TIKTOK_ACCOUNT_PROVIDER,
  'instagram-analytics': INSTAGRAM_ACCOUNT_PROVIDER,
};

// Get primary provider by platform (account-wide verification)
export function getProviderByPlatform(platform: string): ZkTLSProvider | null {
  // Return the account-wide provider as default for platform verification
  if (platform === 'tiktok') {
    return TIKTOK_ACCOUNT_PROVIDER;
  }
  if (platform === 'instagram') {
    return INSTAGRAM_ACCOUNT_PROVIDER;
  }
  const providers = Object.values(ZKTLS_PROVIDERS);
  return providers.find((p) => p.platform === platform && !p.requiresVideoId) || null;
}

// Get video/post verification provider by platform
export function getVideoProviderByPlatform(platform: string): ZkTLSProvider | null {
  if (platform === 'tiktok') {
    return TIKTOK_VIDEO_PROVIDER;
  }
  if (platform === 'instagram') {
    return INSTAGRAM_POST_PROVIDER;
  }
  const providers = Object.values(ZKTLS_PROVIDERS);
  return providers.find((p) => p.platform === platform && p.requiresVideoId) || null;
}

// Get provider by ID
export function getProviderById(providerId: string): ZkTLSProvider | null {
  return ZKTLS_PROVIDERS[providerId] || null;
}

// Check if platform supports zkTLS verification
export function isPlatformSupported(platform: string): boolean {
  return Object.values(ZKTLS_PROVIDERS).some((p) => p.platform === platform);
}

// Get all supported platforms
export function getSupportedPlatforms(): string[] {
  return [...new Set(Object.values(ZKTLS_PROVIDERS).map((p) => p.platform))];
}

// Verification validity period (30 days)
export const VERIFICATION_VALIDITY_DAYS = 30;

// Warning threshold for expiring verifications (7 days)
export const EXPIRY_WARNING_DAYS = 7;
