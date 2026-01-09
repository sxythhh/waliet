import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  rpm_rate: number;
  budget: number;
  budget_used: number | null;
  status: string | null;
  slug: string;
  is_featured: boolean;
  is_private: boolean | null;
  requires_application: boolean;
  hashtags: string[] | null;
  tags: string[] | null;
  category: string | null;
  created_at: string | null;
  brand_id: string | null;
}

export interface UserCampaign extends Campaign {
  status: string;
  joined_at: string;
  total_views: number;
  total_earnings: number;
  video_count: number;
}

// Fetch public/discoverable campaigns
export function useDiscoverCampaigns() {
  return useQuery({
    queryKey: ["campaigns", "discover"],
    queryFn: async (): Promise<Campaign[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "active")
        .eq("is_private", false)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // Discover data refreshes every 2 minutes
  });
}

// Fetch user's joined campaigns with aggregated stats
export function useUserCampaigns() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["campaigns", "user", user?.id],
    queryFn: async (): Promise<UserCampaign[]> => {
      if (!user?.id) return [];

      // Fetch campaign videos for this user
      const { data: campaignVideos, error: videosError } = await supabase
        .from("campaign_videos")
        .select(`
          campaign_id,
          video_views,
          created_at,
          status,
          campaigns (
            id, title, brand_name, brand_logo_url, banner_url, 
            description, rpm_rate, budget, budget_used, status, 
            slug, is_featured, is_private, requires_application,
            hashtags, tags, category, created_at, brand_id
          )
        `)
        .eq("creator_id", user.id);

      if (videosError) throw videosError;

      // Group by campaign and calculate stats
      const campaignMap = new Map<string, UserCampaign>();

      for (const video of campaignVideos || []) {
        const campaign = video.campaigns as unknown as Campaign;
        if (!campaign) continue;

        const existing = campaignMap.get(campaign.id);
        const views = video.video_views || 0;
        const earnings = (views / 1000) * (campaign.rpm_rate || 0);

        if (existing) {
          existing.total_views += views;
          existing.total_earnings += earnings;
          existing.video_count += 1;
        } else {
          campaignMap.set(campaign.id, {
            ...campaign,
            status: video.status || "pending",
            joined_at: video.created_at || "",
            total_views: views,
            total_earnings: earnings,
            video_count: 1,
          });
        }
      }

      return Array.from(campaignMap.values());
    },
    enabled: !!user?.id,
    staleTime: 3 * 60 * 1000, // User campaigns stay fresh for 3 minutes
  });
}

// Fetch single campaign by ID or slug
export function useCampaign(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ["campaign", idOrSlug],
    queryFn: async (): Promise<Campaign | null> => {
      if (!idOrSlug) return null;

      // Try by ID first, then by slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq(isUUID ? "id" : "slug", idOrSlug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  });
}
