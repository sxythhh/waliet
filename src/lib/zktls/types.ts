// zkTLS Verification Types

export type VerificationStatus = 'idle' | 'initializing' | 'waiting' | 'verifying' | 'success' | 'error';

export type TrustLevel = 'none' | 'basic' | 'verified' | 'premium';

// Reclaim Protocol Proof Types
export interface ReclaimClaimData {
  provider: string;
  parameters: string;
  owner: string;
  timestampS: number;
  context: string;
  identifier: string;
  epoch: number;
}

export interface ReclaimWitness {
  id: string;
  url: string;
}

export interface ReclaimProof {
  identifier: string;
  claimData: ReclaimClaimData;
  signatures: string[];
  witnesses: ReclaimWitness[];
  extractedParameterValues: Record<string, string>;
  publicData?: Record<string, unknown>;
}

export interface ZkTLSVerification {
  id: string;
  social_account_id: string;
  user_id: string;
  proof_id: string;
  proof_data: ReclaimProof;
  provider_id: string;
  video_id?: string;
  follower_count?: number;
  demographics?: Demographics;
  engagement_rate?: number;
  avg_views?: number;
  video_metrics?: VideoMetrics;
  public_data?: Record<string, unknown>;
  verified_at: string;
  expires_at: string;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface Demographics {
  countries: Record<string, number>;
  age_groups: Record<string, number>;
  gender: Record<string, number>;
}

export interface VideoMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  completionRate?: number;
  averageViewDuration?: number;
  videoDuration?: number;
  reach?: number;
  newViewersPercentage?: number;
  followersPercentage?: number;
  trafficSources?: Array<{ source: string; percentage: number }>;
}

// Instagram Account Analytics (for account-wide verification)
export interface InstagramAccountAnalytics {
  username: string;
  follower_count: number;
  following_count: number;
}

// Instagram Post Analytics (for per-post verification)
export interface InstagramPostAnalytics {
  contentId: string;
  totalContentViewsCount: number;
  peopleReachBased: number;
  instagramMediaId?: string;
  errorMessage?: string;
}

// Per-Video Analytics (for brand fraud verification)
export interface TikTokVideoAnalytics {
  videoId?: string;
  description?: string;
  createTime?: string;
  performance?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    totalWatchTimeSeconds: number;
    averageViewDurationSeconds: number;
    videoDurationSeconds: number;
    completionRate: number;
  };
  trafficSources?: Array<{ source: string; percentage: number }>;
  retentionRate?: Array<{ timestampSeconds: number; percentage: number }>;
  viewers?: {
    reach: number;
    newViewersPercentage: number;
    returningViewersPercentage: number;
    followersPercentage: number;
    nonFollowersPercentage: number;
  };
  ageDemographics?: Array<{ group: string; percentage: number }>;
  genderDemographics?: Array<{ group: string; percentage: number }>;
  geographicDemographics?: Array<{
    countryCode: string;
    percentage: number;
    cities?: Array<{ name: string; percentage: number }>;
  }>;
}

// Legacy alias
export type TikTokAnalytics = TikTokVideoAnalytics;

// Account-Wide Audience Insights (primary for creator verification)
export interface TikTokAccountAnalytics {
  userProfile: {
    username: string;
    nickname: string;
    avatar: string;
    userId: string;
  };
  overview: {
    postViews: number;
    profileViews: number;
    likes: number;
    comments: number;
    shares: number;
  };
  viewers: {
    demographics: {
      gender: Array<{ label: string; value: number }>;
      age: Array<{ label: string; value: number }>;
      topCountries: Array<{ label: string; value: number }>;
    };
    activeTimes: {
      days: Array<{ day: string; value: number }>;
      hours: Array<{ hour: number; value: number }>;
    };
  };
  followers: {
    demographics: {
      gender: Array<{ label: string; value: number }>;
      age: Array<{ label: string; value: number }>;
      topCountries: Array<{ label: string; value: number }>;
    };
    activeTimes: {
      days: Array<{ day: string; value: number }>;
      hours: Array<{ hour: number; value: number }>;
    };
  };
  trafficSources: Array<{ source: string; percentage: number }>;
  searchTerms: Array<{ term: string; views: number }>;
  rewards?: {
    balance: number;
    currency: string;
    totalEarnings: number;
  };
}

export interface VerifyZkTLSProofRequest {
  social_account_id: string;
  proof: ReclaimProof;
  provider_id?: string;
  video_id?: string;
}

export interface VerifyZkTLSProofResponse {
  success: boolean;
  verification_id: string;
  extracted_data: {
    demographics?: Demographics;
    engagement_rate?: number;
    avg_views?: number;
    video_metrics?: VideoMetrics;
    username?: string;
    user_id?: string;
  };
  expires_at: string;
  trust_level: TrustLevel;
}

export interface ZkTLSProvider {
  id: string;
  platform: string;
  name: string;
  reclaimProviderId: string;
  extractableFields: string[];
  requiresVideoId: boolean;
}

export interface SocialAccountWithZkTLS {
  id: string;
  user_id: string;
  platform: string;
  username: string;
  zktls_verified: boolean;
  zktls_follower_count?: number;
  zktls_demographics?: Demographics;
  zktls_engagement_rate?: number;
  zktls_avg_views?: number;
  zktls_verified_at?: string;
  zktls_expires_at?: string;
  last_zktls_verification_id?: string;
}

export interface ProfileWithZkTLS {
  id: string;
  zktls_verified_at?: string;
  zktls_trust_level: TrustLevel;
}

// Helper functions
export function isVerificationExpired(expiresAt: string | Date): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry < new Date();
}

export function isVerificationExpiringSoon(expiresAt: string | Date, daysThreshold = 7): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysThreshold);
  return expiry < threshold && expiry > new Date();
}

export function getDaysUntilExpiry(expiresAt: string | Date): number {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDemographics(demographics: Demographics): string[] {
  const formatted: string[] = [];

  // Top countries
  const topCountries = Object.entries(demographics.countries)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (topCountries.length > 0) {
    formatted.push(`Top regions: ${topCountries.map(([c, p]) => `${c} (${p.toFixed(1)}%)`).join(', ')}`);
  }

  // Age groups
  const topAges = Object.entries(demographics.age_groups)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2);

  if (topAges.length > 0) {
    formatted.push(`Age: ${topAges.map(([a, p]) => `${a} (${p.toFixed(1)}%)`).join(', ')}`);
  }

  return formatted;
}
