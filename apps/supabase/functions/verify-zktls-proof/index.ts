import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// Use ESM import for lighter footprint - just the verify function
import { verifyProof } from "https://esm.sh/@reclaimprotocol/js-sdk@3.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Reclaim Protocol credentials
const RECLAIM_APP_ID = Deno.env.get("RECLAIM_APP_ID") || "0x680b1C60dbd34ffaBfAF0e030615965582abc3d8";
const RECLAIM_APP_SECRET = Deno.env.get("RECLAIM_APP_SECRET") || "";

// TikTok Provider IDs
const TIKTOK_ACCOUNT_PROVIDER_ID = "603b4a67-f8fe-42bf-8154-4c88a2672244"; // Account-wide audience insights
const TIKTOK_DEMOGRAPHICS_PROVIDER_ID = "6392b7c7-684e-4a08-814d-f12fe085fd65"; // Viewer demographics (TikTok Studio)
const TIKTOK_VIDEO_PROVIDER_ID = "9ec60ce1-e131-428c-b4fc-865f9782a09c"; // Per-video analytics

// Instagram Provider IDs
const INSTAGRAM_ACCOUNT_PROVIDER_ID = "7729ae3e-179c-4ac8-8c5d-4bcd909c864d"; // Account-wide profile
const INSTAGRAM_POST_PROVIDER_ID = "04c62f5c-acd6-4ac0-a2f7-4d614a406ab6"; // Per-post insights

// Reclaim proof structure types
interface ReclaimClaimData {
  provider: string;
  parameters: string | Record<string, unknown>;
  owner: string;
  timestampS: number;
  context: string | { extractedParameters?: Record<string, string> };
  identifier: string;
  epoch: number;
}

interface ReclaimProofItem {
  identifier?: string;
  claimData?: ReclaimClaimData;
  signatures?: string[];
  witnesses?: Array<{ id: string; url: string }>;
  extractedParameterValues?: Record<string, string>;
  publicData?: Record<string, unknown>;
}

interface ReclaimProofWrapper {
  proofs?: ReclaimProofItem[];
  claimData?: ReclaimClaimData;
  extractedParameterValues?: Record<string, string>;
  publicData?: Record<string, unknown>;
}

// Standard demographics structure used throughout the app
interface Demographics {
  countries: Record<string, number>;
  age_groups: Record<string, number>;
  gender: Record<string, number>;
}

// Video metrics structure
interface VideoMetrics {
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

// Post metrics structure (Instagram)
interface PostMetrics {
  views: number;
  reach: number;
  instagramMediaId?: string;
  errorMessage?: string;
}

interface VerifyRequest {
  social_account_id: string;
  proof: ReclaimProofWrapper;
  provider_id?: string;
  video_id?: string;
}

// Account-wide analytics data structure
interface TikTokAccountAnalytics {
  userProfile?: {
    username: string;
    nickname: string;
    avatar: string;
    userId: string;
  };
  overview?: {
    postViews: number;
    profileViews: number;
    likes: number;
    comments: number;
    shares: number;
  };
  viewers?: {
    demographics?: {
      gender: Array<{ label: string; value: number }>;
      age: Array<{ label: string; value: number }>;
      topCountries: Array<{ label: string; value: number }>;
    };
    activeTimes?: {
      days: Array<{ day: string; value: number }>;
      hours: Array<{ hour: number; value: number }>;
    };
  };
  followers?: {
    demographics?: {
      gender: Array<{ label: string; value: number }>;
      age: Array<{ label: string; value: number }>;
      topCountries: Array<{ label: string; value: number }>;
    };
    activeTimes?: {
      days: Array<{ day: string; value: number }>;
      hours: Array<{ hour: number; value: number }>;
    };
  };
  trafficSources?: Array<{ source: string; percentage: number }>;
  searchTerms?: Array<{ term: string; views: number }>;
  rewards?: {
    balance: number;
    currency: string;
    totalEarnings: number;
  };
}

// Instagram account-wide analytics data structure
interface InstagramAccountAnalytics {
  username?: string;
  follower_count?: number;
  following_count?: number;
}

// Instagram per-post analytics data structure
interface InstagramPostAnalytics {
  total_content_views_count?: number;
  people_reach_based?: number;
  instagram_media_id?: string;
  error_message?: string;
}

// Per-video analytics data structure
interface TikTokVideoAnalytics {
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

function extractAccountWideData(publicData: Record<string, unknown> | null): {
  demographics: Demographics;
  engagement_rate: number | null;
  avg_views: number | null;
  account_analytics: TikTokAccountAnalytics;
} {
  const analytics = (publicData || {}) as TikTokAccountAnalytics;

  // Convert account-wide demographics to standard format
  const demographics = {
    countries: {} as Record<string, number>,
    age_groups: {} as Record<string, number>,
    gender: {} as Record<string, number>,
  };

  // Use follower demographics as primary
  if (analytics.followers?.demographics) {
    const followerDemo = analytics.followers.demographics;

    // Geographic demographics from followers
    if (followerDemo.topCountries) {
      for (const country of followerDemo.topCountries) {
        demographics.countries[country.label] = country.value;
      }
    }

    // Age demographics from followers
    if (followerDemo.age) {
      for (const age of followerDemo.age) {
        demographics.age_groups[age.label] = age.value;
      }
    }

    // Gender demographics from followers
    if (followerDemo.gender) {
      for (const gender of followerDemo.gender) {
        demographics.gender[gender.label] = gender.value;
      }
    }
  }

  // Calculate engagement rate from overview metrics
  let engagement_rate: number | null = null;
  let avg_views: number | null = null;

  if (analytics.overview) {
    const { postViews, likes, comments, shares } = analytics.overview;
    if (postViews > 0) {
      // Engagement rate = (likes + comments + shares) / post views * 100
      engagement_rate = ((likes + comments + shares) / postViews) * 100;
      engagement_rate = Math.round(engagement_rate * 100) / 100; // Round to 2 decimals
    }
    avg_views = postViews;
  }

  // Full account analytics structure
  const account_analytics = {
    userProfile: analytics.userProfile,
    overview: analytics.overview,
    viewers: analytics.viewers,
    followers: analytics.followers,
    trafficSources: analytics.trafficSources,
    searchTerms: analytics.searchTerms,
    rewards: analytics.rewards,
  };

  return {
    demographics,
    engagement_rate,
    avg_views,
    account_analytics,
  };
}

function extractVideoData(publicData: Record<string, unknown> | null): {
  demographics: Demographics;
  engagement_rate: number | null;
  avg_views: number | null;
  video_metrics: VideoMetrics;
} {
  const analytics = (publicData || {}) as TikTokVideoAnalytics;

  // Extract demographics
  const demographics = {
    countries: {} as Record<string, number>,
    age_groups: {} as Record<string, number>,
    gender: {} as Record<string, number>,
  };

  // Geographic demographics
  if (analytics.geographicDemographics) {
    for (const country of analytics.geographicDemographics) {
      demographics.countries[country.countryCode] = country.percentage;
    }
  }

  // Age demographics
  if (analytics.ageDemographics) {
    for (const age of analytics.ageDemographics) {
      demographics.age_groups[age.group] = age.percentage;
    }
  }

  // Gender demographics
  if (analytics.genderDemographics) {
    for (const gender of analytics.genderDemographics) {
      demographics.gender[gender.group] = gender.percentage;
    }
  }

  // Calculate engagement rate from performance metrics
  let engagement_rate: number | null = null;
  let avg_views: number | null = null;

  if (analytics.performance) {
    const { views, likes, comments, shares, saves } = analytics.performance;
    if (views > 0) {
      // Engagement rate = (likes + comments + shares + saves) / views * 100
      engagement_rate = ((likes + comments + shares + saves) / views) * 100;
      engagement_rate = Math.round(engagement_rate * 100) / 100; // Round to 2 decimals
    }
    avg_views = views;
  }

  // Video metrics (full performance data)
  const video_metrics = {
    views: analytics.performance?.views,
    likes: analytics.performance?.likes,
    comments: analytics.performance?.comments,
    shares: analytics.performance?.shares,
    saves: analytics.performance?.saves,
    completionRate: analytics.performance?.completionRate,
    averageViewDuration: analytics.performance?.averageViewDurationSeconds,
    videoDuration: analytics.performance?.videoDurationSeconds,
    reach: analytics.viewers?.reach,
    newViewersPercentage: analytics.viewers?.newViewersPercentage,
    followersPercentage: analytics.viewers?.followersPercentage,
    trafficSources: analytics.trafficSources,
  };

  return {
    demographics,
    engagement_rate,
    avg_views,
    video_metrics,
  };
}

function extractInstagramAccountData(extractedParams: Record<string, string>): {
  demographics: Demographics;
  engagement_rate: number | null;
  avg_views: number | null;
  account_data: InstagramAccountAnalytics;
} {
  // Instagram account provider extracts from parameters, not publicData
  const username = extractedParams.username || '';
  const follower_count = parseInt(extractedParams.follower_count || '0', 10);
  const following_count = parseInt(extractedParams.following_count || '0', 10);

  // No demographics available from this provider
  const demographics = {
    countries: {} as Record<string, number>,
    age_groups: {} as Record<string, number>,
    gender: {} as Record<string, number>,
  };

  const account_data: InstagramAccountAnalytics = {
    username,
    follower_count,
    following_count,
  };

  return {
    demographics,
    engagement_rate: null,
    avg_views: null,
    account_data,
  };
}

function extractInstagramPostData(publicData: Record<string, unknown> | null): {
  demographics: Demographics;
  engagement_rate: number | null;
  avg_views: number | null;
  post_metrics: PostMetrics;
} {
  const analytics = (publicData || {}) as InstagramPostAnalytics;

  // Instagram post provider doesn't return demographics
  const demographics = {
    countries: {} as Record<string, number>,
    age_groups: {} as Record<string, number>,
    gender: {} as Record<string, number>,
  };

  // Get views and reach from the post
  const views = analytics.total_content_views_count || 0;
  const reach = analytics.people_reach_based || 0;

  // Post metrics
  const post_metrics = {
    views: views,
    reach: reach,
    instagramMediaId: analytics.instagram_media_id,
    errorMessage: analytics.error_message,
  };

  return {
    demographics,
    engagement_rate: null, // Not available from this provider
    avg_views: views,
    post_metrics,
  };
}

// TikTok Demographics Provider data structure
// From TikTok Studio /aweme/v2/data/insight/ endpoint
interface DemographicItem {
  country?: string;
  country_code?: string;
  label?: string;
  name?: string;
  age_group?: string;
  age?: string;
  group?: string;
  gender?: string;
  percentage?: number;
  value?: number;
  percent?: number;
}

interface TikTokDemographicsData {
  countries?: DemographicItem[] | Record<string, number | DemographicItem[]>;
  ages?: DemographicItem[] | Record<string, number | DemographicItem[]>;
  genders?: DemographicItem[] | Record<string, number | DemographicItem[]>;
}

function extractTikTokDemographicsData(
  publicData: Record<string, unknown> | null,
  extractedParams: Record<string, string>
): {
  demographics: Demographics;
  engagement_rate: number | null;
  avg_views: number | null;
  user_profile: { userId: string; username: string } | null;
} {
  const data = publicData as TikTokDemographicsData;

  // Initialize demographics
  const demographics = {
    countries: {} as Record<string, number>,
    age_groups: {} as Record<string, number>,
    gender: {} as Record<string, number>,
  };

  // Parse country/city demographics
  // Format varies: could be array of objects or nested structure from TikTok API
  if (data?.countries) {
    try {
      if (Array.isArray(data.countries)) {
        // Array format: [{country: "US", percentage: 25}, ...]
        for (const item of data.countries) {
          const key = item.country || item.country_code || item.label || item.name;
          const value = item.percentage || item.value || item.percent || 0;
          if (key) {
            demographics.countries[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
          }
        }
      } else if (typeof data.countries === 'object') {
        // Object format: {US: 25, UK: 15, ...} or nested structure
        const countriesObj = data.countries.value || data.countries;
        if (Array.isArray(countriesObj)) {
          for (const item of countriesObj) {
            const key = item.country || item.country_code || item.label || item.name;
            const value = item.percentage || item.value || item.percent || 0;
            if (key) {
              demographics.countries[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
            }
          }
        } else {
          for (const [key, val] of Object.entries(countriesObj)) {
            demographics.countries[key] = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
          }
        }
      }
    } catch (e) {
      console.error("Error parsing countries:", e);
    }
  }

  // Parse age demographics
  if (data?.ages) {
    try {
      if (Array.isArray(data.ages)) {
        // Array format: [{age_group: "18-24", percentage: 35}, ...]
        for (const item of data.ages) {
          const key = item.age_group || item.age || item.label || item.name || item.group;
          const value = item.percentage || item.value || item.percent || 0;
          if (key) {
            demographics.age_groups[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
          }
        }
      } else if (typeof data.ages === 'object') {
        const agesObj = data.ages.value || data.ages;
        if (Array.isArray(agesObj)) {
          for (const item of agesObj) {
            const key = item.age_group || item.age || item.label || item.name || item.group;
            const value = item.percentage || item.value || item.percent || 0;
            if (key) {
              demographics.age_groups[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
            }
          }
        } else {
          for (const [key, val] of Object.entries(agesObj)) {
            demographics.age_groups[key] = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
          }
        }
      }
    } catch (e) {
      console.error("Error parsing ages:", e);
    }
  }

  // Parse gender demographics
  if (data?.genders) {
    try {
      if (Array.isArray(data.genders)) {
        // Array format: [{gender: "male", percentage: 55}, ...]
        for (const item of data.genders) {
          const key = item.gender || item.label || item.name || item.group;
          const value = item.percentage || item.value || item.percent || 0;
          if (key) {
            demographics.gender[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
          }
        }
      } else if (typeof data.genders === 'object') {
        const gendersObj = data.genders.value || data.genders;
        if (Array.isArray(gendersObj)) {
          for (const item of gendersObj) {
            const key = item.gender || item.label || item.name || item.group;
            const value = item.percentage || item.value || item.percent || 0;
            if (key) {
              demographics.gender[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
            }
          }
        } else {
          for (const [key, val] of Object.entries(gendersObj)) {
            demographics.gender[key] = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
          }
        }
      }
    } catch (e) {
      console.error("Error parsing genders:", e);
    }
  }

  // Extract user profile from extractedParams
  const user_profile = (extractedParams.userId || extractedParams.username)
    ? {
        userId: extractedParams.userId || '',
        username: extractedParams.username || '',
      }
    : null;

  return {
    demographics,
    engagement_rate: null, // Not available from this provider
    avg_views: null,       // Not available from this provider
    user_profile,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: VerifyRequest = await req.json();
    // Default to account-wide provider
    const { social_account_id, proof, provider_id = TIKTOK_ACCOUNT_PROVIDER_ID, video_id } = body;

    if (!social_account_id || !proof) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: social_account_id, proof" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the social account
    const { data: socialAccount, error: saError } = await supabaseClient
      .from("social_accounts")
      .select("id, user_id, platform, username")
      .eq("id", social_account_id)
      .single();

    if (saError || !socialAccount) {
      return new Response(
        JSON.stringify({ error: "Social account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (socialAccount.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You do not own this social account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify and extract proof data
    let extractedParams: Record<string, string> = {};
    let publicData: Record<string, unknown> | null = null;
    let isProofValid = false;

    try {
      // Handle both proof formats: array of proofs or single proof
      if (proof.proofs && Array.isArray(proof.proofs) && proof.proofs.length > 0) {
        const reclaimProof = proof.proofs[0];

        // Verify proof cryptographically using Reclaim SDK
        try {
          isProofValid = await verifyProof(reclaimProof);
          console.log("Proof verification result:", isProofValid);
        } catch (verifyErr) {
          console.error("Verify error:", verifyErr);
          // If verification fails, still extract data but mark as invalid
          isProofValid = false;
        }

        // Extract parameters from claimData.context.extractedParameters (primary)
        // or claimData.parameters (legacy)
        if (reclaimProof.claimData?.context) {
          try {
            const context = typeof reclaimProof.claimData.context === 'string'
              ? JSON.parse(reclaimProof.claimData.context)
              : reclaimProof.claimData.context;
            if (context.extractedParameters) {
              extractedParams = context.extractedParameters;
            }
          } catch (e) {
            console.error("Error parsing context:", e);
          }
        }

        // Also check claimData.parameters as fallback
        if (Object.keys(extractedParams).length === 0 && reclaimProof.claimData?.parameters) {
          try {
            const params = typeof reclaimProof.claimData.parameters === 'string'
              ? JSON.parse(reclaimProof.claimData.parameters)
              : reclaimProof.claimData.parameters;
            extractedParams = params;
          } catch {
            extractedParams = reclaimProof.claimData.parameters || {};
          }
        }

        // Also check extractedParameterValues (newer format)
        if (reclaimProof.extractedParameterValues) {
          extractedParams = { ...extractedParams, ...reclaimProof.extractedParameterValues };
        }

        if (reclaimProof.publicData) {
          publicData = reclaimProof.publicData;
        }
      } else if (proof.claimData || proof.extractedParameterValues) {
        // Single proof format - verify directly
        try {
          isProofValid = await verifyProof(proof);
          console.log("Single proof verification result:", isProofValid);
        } catch (verifyErr) {
          console.error("Single proof verify error:", verifyErr);
          isProofValid = false;
        }

        // Extract from context first
        if (proof.claimData?.context) {
          try {
            const context = typeof proof.claimData.context === 'string'
              ? JSON.parse(proof.claimData.context)
              : proof.claimData.context;
            if (context.extractedParameters) {
              extractedParams = context.extractedParameters;
            }
          } catch (e) {
            console.error("Error parsing single proof context:", e);
          }
        }

        // Fallback to parameters
        if (Object.keys(extractedParams).length === 0 && proof.claimData?.parameters) {
          try {
            const params = typeof proof.claimData.parameters === 'string'
              ? JSON.parse(proof.claimData.parameters)
              : proof.claimData.parameters;
            extractedParams = params;
          } catch {
            extractedParams = proof.claimData.parameters || {};
          }
        }

        if (proof.extractedParameterValues) {
          extractedParams = { ...extractedParams, ...proof.extractedParameterValues };
        }

        publicData = proof.publicData;
      }

      console.log("Extracted params:", JSON.stringify(extractedParams));
      console.log("Public data:", publicData ? "present" : "null");
    } catch (extractError) {
      console.error("Proof extraction error:", extractError);
      return new Response(
        JSON.stringify({
          error: "Failed to extract proof data",
          details: extractError instanceof Error ? extractError.message : "Unknown error"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isProofValid) {
      return new Response(
        JSON.stringify({ error: "Proof verification failed - invalid signatures" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine provider type and extract appropriate data
    const isTikTokVideoProvider = provider_id === TIKTOK_VIDEO_PROVIDER_ID;
    const isTikTokDemographicsProvider = provider_id === TIKTOK_DEMOGRAPHICS_PROVIDER_ID;
    const isInstagramAccountProvider = provider_id === INSTAGRAM_ACCOUNT_PROVIDER_ID;
    const isInstagramPostProvider = provider_id === INSTAGRAM_POST_PROVIDER_ID;
    let extractedData: {
      demographics: Demographics;
      engagement_rate: number | null;
      avg_views: number | null;
      video_metrics?: VideoMetrics;
      post_metrics?: PostMetrics;
      account_analytics?: TikTokAccountAnalytics;
      instagram_account?: InstagramAccountAnalytics;
      tiktok_user_profile?: { userId: string; username: string };
    };

    if (isTikTokVideoProvider) {
      // Extract per-video analytics (TikTok)
      const videoData = extractVideoData(publicData || {});
      extractedData = {
        demographics: videoData.demographics,
        engagement_rate: videoData.engagement_rate,
        avg_views: videoData.avg_views,
        video_metrics: videoData.video_metrics,
      };
    } else if (isTikTokDemographicsProvider) {
      // Extract viewer demographics from TikTok Studio (TikTok Demographics Provider)
      const demoData = extractTikTokDemographicsData(publicData || {}, extractedParams);
      extractedData = {
        demographics: demoData.demographics,
        engagement_rate: demoData.engagement_rate,
        avg_views: demoData.avg_views,
        tiktok_user_profile: demoData.user_profile || undefined,
      };
    } else if (isInstagramAccountProvider) {
      // Extract account-wide analytics (Instagram)
      const igAccountData = extractInstagramAccountData(extractedParams);
      extractedData = {
        demographics: igAccountData.demographics,
        engagement_rate: igAccountData.engagement_rate,
        avg_views: igAccountData.avg_views,
        instagram_account: igAccountData.account_data,
      };
    } else if (isInstagramPostProvider) {
      // Extract per-post analytics (Instagram)
      const postData = extractInstagramPostData(publicData || {});
      extractedData = {
        demographics: postData.demographics,
        engagement_rate: postData.engagement_rate,
        avg_views: postData.avg_views,
        post_metrics: postData.post_metrics,
      };
    } else {
      // Extract account-wide analytics (default - TikTok account)
      const accountData = extractAccountWideData(publicData || {});
      extractedData = {
        demographics: accountData.demographics,
        engagement_rate: accountData.engagement_rate,
        avg_views: accountData.avg_views,
        account_analytics: accountData.account_analytics,
      };
    }

    // Generate a unique proof ID
    const proofId = `reclaim_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Calculate expiry (30 days from now)
    const verifiedAt = new Date();
    const expiresAt = new Date(verifiedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Use service role client to insert verification
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Determine content ID (video_id for TikTok, content_id for Instagram)
    const contentId = isTikTokVideoProvider
      ? (video_id || extractedParams.postId || null)
      : isInstagramPostProvider
        ? (video_id || extractedParams.content_id || null)
        : null;

    // Prepare video_metrics field (used for video, post, or account-specific data)
    const metricsToStore = extractedData.video_metrics
      || extractedData.post_metrics
      || (extractedData.instagram_account ? {
          username: extractedData.instagram_account.username,
          follower_count: extractedData.instagram_account.follower_count,
          following_count: extractedData.instagram_account.following_count,
        } : null);

    // Insert verification record
    const { data: verification, error: insertError } = await supabaseAdmin
      .from("zktls_verifications")
      .insert({
        social_account_id,
        user_id: user.id,
        proof_id: proofId,
        proof_data: proof,
        provider_id,
        video_id: contentId,
        follower_count: extractedData.instagram_account?.follower_count || null,
        demographics: extractedData.demographics,
        engagement_rate: extractedData.engagement_rate,
        avg_views: extractedData.avg_views,
        video_metrics: metricsToStore,
        public_data: publicData,
        verified_at: verifiedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_valid: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store verification", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get updated trust level
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("zktls_trust_level")
      .eq("id", user.id)
      .single();

    // Determine provider type for response
    const providerType = isTikTokVideoProvider
      ? 'video'
      : isTikTokDemographicsProvider
        ? 'tiktok_demographics'
        : isInstagramPostProvider
          ? 'post'
          : isInstagramAccountProvider
            ? 'instagram_account'
            : 'account';

    // Build response with appropriate data structure
    interface ExtractedResponseData {
      demographics: Demographics;
      engagement_rate: number | null;
      avg_views: number | null;
      username?: string;
      user_id?: string;
      video_metrics?: VideoMetrics;
      post_metrics?: PostMetrics;
      tiktok_user_profile?: { userId: string; username: string };
      follower_count?: number;
      following_count?: number;
      overview?: TikTokAccountAnalytics['overview'];
      followers?: TikTokAccountAnalytics['followers'];
      viewers?: TikTokAccountAnalytics['viewers'];
      trafficSources?: TikTokAccountAnalytics['trafficSources'];
    }

    interface VerificationResponse {
      success: boolean;
      verification_id: string;
      provider_type: string;
      extracted_data: ExtractedResponseData;
      expires_at: string;
      trust_level: string;
    }

    const extractedResponseData: ExtractedResponseData = {
      demographics: extractedData.demographics,
      engagement_rate: extractedData.engagement_rate,
      avg_views: extractedData.avg_views,
      username: extractedParams.username || extractedData.tiktok_user_profile?.username || extractedData.account_analytics?.userProfile?.username || extractedData.instagram_account?.username,
      user_id: extractedParams.userId || extractedData.tiktok_user_profile?.userId || extractedData.account_analytics?.userProfile?.userId,
    };

    // Add provider-specific data
    if (isTikTokVideoProvider) {
      extractedResponseData.video_metrics = extractedData.video_metrics;
    } else if (isTikTokDemographicsProvider) {
      // TikTok Demographics provider - demographics are already in extracted_data
      // Add user profile if available
      if (extractedData.tiktok_user_profile) {
        extractedResponseData.tiktok_user_profile = extractedData.tiktok_user_profile;
      }
    } else if (isInstagramAccountProvider) {
      extractedResponseData.follower_count = extractedData.instagram_account?.follower_count;
      extractedResponseData.following_count = extractedData.instagram_account?.following_count;
    } else if (isInstagramPostProvider) {
      extractedResponseData.post_metrics = extractedData.post_metrics;
    } else {
      extractedResponseData.overview = extractedData.account_analytics?.overview;
      extractedResponseData.followers = extractedData.account_analytics?.followers;
      extractedResponseData.viewers = extractedData.account_analytics?.viewers;
      extractedResponseData.trafficSources = extractedData.account_analytics?.trafficSources;
    }

    const responseData: VerificationResponse = {
      success: true,
      verification_id: verification.id,
      provider_type: providerType,
      extracted_data: extractedResponseData,
      expires_at: expiresAt.toISOString(),
      trust_level: profile?.zktls_trust_level || "verified",
    };

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
