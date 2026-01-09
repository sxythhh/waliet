import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Boost {
  id: string;
  title: string;
  description: string | null;
  brand_id: string;
  status: string;
  monthly_retainer: number;
  videos_per_month: number;
  max_accepted_creators: number;
  accepted_creators_count: number;
  content_style_requirements: string;
  is_private: boolean;
  banner_url: string | null;
  slug: string | null;
  tags: string[] | null;
  created_at: string;
  brands?: {
    id: string;
    name: string;
    logo_url: string | null;
    brand_color: string | null;
  };
}

export interface UserBoost extends Boost {
  application_status: string;
  applied_at: string;
}

// Fetch discoverable boosts
export function useDiscoverBoosts() {
  return useQuery({
    queryKey: ["boosts", "discover"],
    queryFn: async (): Promise<Boost[]> => {
      const { data, error } = await supabase
        .from("bounty_campaigns")
        .select(`
          *,
          brands (id, name, logo_url, brand_color)
        `)
        .eq("status", "active")
        .eq("is_private", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch user's applied/accepted boosts
export function useUserBoosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["boosts", "user", user?.id],
    queryFn: async (): Promise<UserBoost[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("bounty_applications")
        .select(`
          status,
          applied_at,
          bounty_campaigns (
            *,
            brands (id, name, logo_url, brand_color)
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      return (data || []).map((app) => ({
        ...(app.bounty_campaigns as unknown as Boost),
        application_status: app.status,
        applied_at: app.applied_at,
      }));
    },
    enabled: !!user?.id,
    staleTime: 3 * 60 * 1000,
  });
}

// Fetch single boost by ID or slug
export function useBoost(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ["boost", idOrSlug],
    queryFn: async (): Promise<Boost | null> => {
      if (!idOrSlug) return null;

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

      const { data, error } = await supabase
        .from("bounty_campaigns")
        .select(`
          *,
          brands (id, name, logo_url, brand_color)
        `)
        .eq(isUUID ? "id" : "slug", idOrSlug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  });
}
