import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types
export interface JoinedTask {
  id: string;
  title: string;
  slug: string | null;
  type: "task"; // For sidebar compatibility
  business_name: string;
  business_logo_url: string | null;
  // Legacy aliases for sidebar compatibility
  brand_name: string;
  brand_logo_url: string | null;
  description: string | null;
  status: string | null;
  reward_amount: number | null;
  created_at: string | null;
  deadline: string | null;
  application_status: string | null;
}

export interface BusinessMembership {
  business_id: string;
  brand_id: string; // Legacy alias
  role: string | null;
  businesses: {
    name: string;
    slug: string;
    logo_url: string | null;
    brand_color?: string | null;
  };
  // Legacy alias for AppSidebar compatibility
  brands: {
    name: string;
    slug: string;
    logo_url: string | null;
    brand_color?: string | null;
  };
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color?: string | null;
}

// Fetch joined tasks for a user (tasks they've been accepted to)
async function fetchJoinedTasks(userId: string): Promise<JoinedTask[]> {
  // Fetch task applications that are accepted or completed
  const { data: applications } = await supabase
    .from("task_applications")
    .select(`
      id,
      status,
      task_id,
      tasks (
        id,
        title,
        slug,
        description,
        status,
        reward_amount,
        created_at,
        deadline,
        businesses (
          name,
          logo_url
        )
      )
    `)
    .eq("user_id", userId)
    .in("status", ["accepted", "completed"])
    .limit(50);

  if (!applications) return [];

  return applications
    .filter((app: any) => app.tasks) // Filter out any without task data
    .map((app: any) => {
      const businessName = app.tasks.businesses?.name || "Unknown Business";
      const businessLogoUrl = app.tasks.businesses?.logo_url || null;
      return {
        id: app.tasks.id,
        title: app.tasks.title,
        slug: app.tasks.slug,
        type: "task" as const,
        business_name: businessName,
        business_logo_url: businessLogoUrl,
        // Legacy aliases for sidebar compatibility
        brand_name: businessName,
        brand_logo_url: businessLogoUrl,
        description: app.tasks.description,
        status: app.tasks.status,
        reward_amount: app.tasks.reward_amount,
        created_at: app.tasks.created_at,
        deadline: app.tasks.deadline,
        application_status: app.status,
      };
    })
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

// Fetch business memberships for a user
async function fetchBusinessMemberships(userId: string): Promise<BusinessMembership[]> {
  const { data } = await supabase
    .from("business_members")
    .select("business_id, role, businesses(name, slug, logo_url, brand_color)")
    .eq("user_id", userId);

  if (!data) return [];

  // Transform to include legacy aliases for AppSidebar compatibility
  return data.map((item: any) => ({
    business_id: item.business_id,
    brand_id: item.business_id, // Legacy alias
    role: item.role,
    businesses: {
      name: item.businesses?.name || "",
      slug: item.businesses?.slug || "",
      logo_url: item.businesses?.logo_url || null,
      brand_color: item.businesses?.brand_color || null,
    },
    // Legacy alias for AppSidebar
    brands: {
      name: item.businesses?.name || "",
      slug: item.businesses?.slug || "",
      logo_url: item.businesses?.logo_url || null,
      brand_color: item.businesses?.brand_color || null,
    },
  }));
}

// Fetch all businesses (for admin)
async function fetchAllBusinesses(): Promise<Business[]> {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_url")
    .order("name");

  return data || [];
}

// Hook for joined tasks
export function useJoinedTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ["joinedTasks", userId],
    queryFn: () => fetchJoinedTasks(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Legacy alias for backwards compatibility
export function useJoinedCampaigns(userId: string | undefined) {
  return useJoinedTasks(userId);
}

// Hook for business memberships
export function useBusinessMemberships(userId: string | undefined) {
  return useQuery({
    queryKey: ["businessMemberships", userId],
    queryFn: () => fetchBusinessMemberships(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Legacy alias for backwards compatibility
export function useBrandMemberships(userId: string | undefined) {
  return useBusinessMemberships(userId);
}

// Hook for all businesses (admin only)
export function useAllBusinesses(enabled: boolean) {
  return useQuery({
    queryKey: ["allBusinesses"],
    queryFn: fetchAllBusinesses,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Legacy alias for backwards compatibility
export function useAllBrands(enabled: boolean) {
  return useAllBusinesses(enabled);
}

// Business task for sidebar
export interface BusinessTaskItem {
  id: string;
  title: string;
  banner_url: string | null;
  cover_url: string | null; // Legacy alias
  type: "task"; // For sidebar compatibility
}

// Fetch business tasks for sidebar
async function fetchBusinessTasksForSidebar(businessId: string): Promise<BusinessTaskItem[]> {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, banner_url")
    .eq("business_id", businessId)
    .in("status", ["active", "draft"])
    .order("created_at", { ascending: false });

  return tasks?.map(t => ({
    id: t.id,
    title: t.title,
    banner_url: t.banner_url,
    cover_url: t.banner_url, // Legacy alias
    type: "task" as const,
  })) || [];
}

// Hook for business tasks for sidebar
export function useBusinessTasksForSidebar(businessId: string | undefined | null) {
  return useQuery({
    queryKey: ["businessTasksForSidebar", businessId],
    queryFn: () => fetchBusinessTasksForSidebar(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Legacy alias
export function useBrandCampaignsForSidebar(brandId: string | undefined | null) {
  return useBusinessTasksForSidebar(brandId);
}

// Hook for current business info
export function useCurrentBusinessInfo(businessId: string | undefined | null) {
  return useQuery({
    queryKey: ["currentBusinessInfo", businessId],
    queryFn: async () => {
      if (!businessId) return null;

      const [businessResult, memberCountResult] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, logo_url, subscription_status, subscription_plan")
          .eq("id", businessId)
          .single(),
        supabase
          .from("business_members")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
      ]);

      if (!businessResult.data) return null;

      return {
        ...businessResult.data,
        memberCount: memberCountResult.count || 0,
      };
    },
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Legacy alias
export function useCurrentBrandInfo(brandId: string | undefined | null) {
  return useCurrentBusinessInfo(brandId);
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
        .select("avatar_url, full_name, username, account_type")
        .eq("id", userId)
        .single();
      return {
        ...data,
        banner_url: null, // Not in new simplified schema
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Export legacy types for backwards compatibility
export type JoinedCampaign = JoinedTask;
export type Brand = Business;
export type BrandMembership = BusinessMembership;
export type BrandCampaignItem = BusinessTaskItem;
