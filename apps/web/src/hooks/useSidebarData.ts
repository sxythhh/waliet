import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types
export interface JoinedCampaign {
  id: string;
  title: string;
  slug: string;
  brand_name: string;
  brand_logo_url: string | null;
  description: string | null;
  status: string;
  budget: number;
  budget_used?: number | null;
  rpm_rate: number;
  allowed_platforms: string[] | null;
  end_date: string | null;
  created_at: string;
  hashtags?: string[] | null;
  guidelines?: string | null;
  embed_url?: string | null;
  asset_links?: { url: string; label?: string }[] | null;
  requirements?: string[] | null;
  campaign_update?: string | null;
  campaign_update_at?: string | null;
  payout_day_of_week?: number | null;
  blueprint_id?: string | null;
  payment_model?: string | null;
  post_rate?: number | null;
  type: "campaign" | "boost";
}

export interface BrandMembership {
  brand_id: string;
  role: string;
  brands: {
    name: string;
    slug: string;
    logo_url: string | null;
    brand_color: string | null;
  };
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
}

// Fetch joined campaigns and boosts for a user
async function fetchJoinedCampaigns(userId: string): Promise<JoinedCampaign[]> {
  const items: JoinedCampaign[] = [];

  // Fetch campaigns the user has joined (via approved submissions)
  const { data: submissions } = await supabase
    .from("campaign_submissions")
    .select("campaign_id")
    .eq("creator_id", userId)
    .eq("status", "approved")
    .limit(50);

  if (submissions && submissions.length > 0) {
    const campaignIds = submissions.map((s) => s.campaign_id);

    // Fetch campaign details with brand info
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select(`
        id, title, slug, description, status, budget, budget_used,
        rpm_rate, allowed_platforms, end_date, created_at, hashtags,
        guidelines, embed_url, asset_links, requirements, campaign_update,
        campaign_update_at, payout_day_of_week, blueprint_id, payment_model, post_rate,
        brands (name, logo_url)
      `)
      .in("id", campaignIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (campaigns) {
      items.push(...campaigns.map((c: any) => ({
        ...c,
        brand_name: c.brands?.name || "Unknown Brand",
        brand_logo_url: c.brands?.logo_url || null,
        type: "campaign" as const,
      })));
    }
  }

  // Fetch boosts the user has been accepted to
  const { data: boostApplications } = await supabase
    .from("bounty_applications")
    .select("bounty_campaign_id")
    .eq("user_id", userId)
    .eq("status", "accepted")
    .limit(50);

  if (boostApplications && boostApplications.length > 0) {
    const boostIds = boostApplications.map((a) => a.bounty_campaign_id);

    // Fetch boost details with brand info
    const { data: boosts } = await supabase
      .from("bounty_campaigns")
      .select(`
        id, title, slug, description, status, monthly_retainer,
        videos_per_month, end_date, created_at, blueprint_id,
        brands (name, logo_url)
      `)
      .in("id", boostIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (boosts) {
      items.push(...boosts.map((b: any) => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        brand_name: b.brands?.name || "Unknown Brand",
        brand_logo_url: b.brands?.logo_url || null,
        description: b.description,
        status: b.status,
        budget: b.monthly_retainer || 0,
        budget_used: null,
        rpm_rate: 0,
        allowed_platforms: null,
        end_date: b.end_date,
        created_at: b.created_at,
        hashtags: null,
        guidelines: null,
        embed_url: null,
        asset_links: null,
        requirements: null,
        campaign_update: null,
        campaign_update_at: null,
        payout_day_of_week: null,
        blueprint_id: b.blueprint_id,
        payment_model: "monthly_retainer",
        post_rate: null,
        type: "boost" as const,
      })));
    }
  }

  // Sort by created date (newest first)
  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Fetch brand memberships for a user
async function fetchBrandMemberships(userId: string): Promise<BrandMembership[]> {
  const { data } = await supabase
    .from("brand_members")
    .select("brand_id, role, brands(name, slug, logo_url, brand_color)")
    .eq("user_id", userId);

  return (data as unknown as BrandMembership[]) || [];
}

// Fetch all brands (for admin)
async function fetchAllBrands(): Promise<Brand[]> {
  const { data } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url, brand_color")
    .order("name");

  return data || [];
}

// Hook for joined campaigns
export function useJoinedCampaigns(userId: string | undefined) {
  return useQuery({
    queryKey: ["joinedCampaigns", "v2", userId],
    queryFn: () => fetchJoinedCampaigns(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for brand memberships
export function useBrandMemberships(userId: string | undefined) {
  return useQuery({
    queryKey: ["brandMemberships", userId],
    queryFn: () => fetchBrandMemberships(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for all brands (admin only)
export function useAllBrands(enabled: boolean) {
  return useQuery({
    queryKey: ["allBrands"],
    queryFn: fetchAllBrands,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Brand campaign/boost for sidebar
export interface BrandCampaignItem {
  id: string;
  title: string;
  cover_url: string | null;
  type: "campaign" | "boost";
}

// Fetch brand campaigns and boosts for sidebar
async function fetchBrandCampaignsForSidebar(brandId: string): Promise<BrandCampaignItem[]> {
  // Fetch campaigns for this brand
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, cover_url")
    .eq("brand_id", brandId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Fetch boosts for this brand
  const { data: boosts } = await supabase
    .from("boosts")
    .select("id, title, cover_url")
    .eq("brand_id", brandId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const items: BrandCampaignItem[] = [];

  // Add campaigns
  if (campaigns) {
    items.push(...campaigns.map(c => ({
      id: c.id,
      title: c.title,
      cover_url: c.cover_url,
      type: "campaign" as const,
    })));
  }

  // Add boosts
  if (boosts) {
    items.push(...boosts.map(b => ({
      id: b.id,
      title: b.title,
      cover_url: b.cover_url,
      type: "boost" as const,
    })));
  }

  return items;
}

// Hook for brand campaigns and boosts for sidebar
export function useBrandCampaignsForSidebar(brandId: string | undefined | null) {
  return useQuery({
    queryKey: ["brandCampaignsForSidebar", brandId],
    queryFn: () => fetchBrandCampaignsForSidebar(brandId!),
    enabled: !!brandId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Hook for current brand info
export function useCurrentBrandInfo(brandId: string | undefined | null) {
  return useQuery({
    queryKey: ["currentBrandInfo", brandId],
    queryFn: async () => {
      if (!brandId) return null;

      const [brandResult, memberCountResult] = await Promise.all([
        supabase
          .from("brands")
          .select("id, name, slug, logo_url, brand_color, subscription_status, subscription_plan")
          .eq("id", brandId)
          .single(),
        supabase
          .from("brand_members")
          .select("id", { count: "exact", head: true })
          .eq("brand_id", brandId),
      ]);

      if (!brandResult.data) return null;

      return {
        ...brandResult.data,
        memberCount: memberCountResult.count || 0,
      };
    },
    enabled: !!brandId,
    staleTime: 2 * 60 * 1000, // 2 minutes for brand info
    gcTime: 5 * 60 * 1000,
  });
}

// User profile data for sidebar
export interface UserProfileData {
  avatar_url: string | null;
  banner_url: string | null;
  full_name: string | null;
  username: string | null;
  account_type: string | null;
}

// Hook for user profile (cached to prevent flicker on navigation)
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async (): Promise<UserProfileData | null> => {
      if (!userId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, banner_url, full_name, username, account_type")
        .eq("id", userId)
        .single();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}
