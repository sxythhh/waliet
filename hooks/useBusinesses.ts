import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type BusinessInsert = Database["public"]["Tables"]["businesses"]["Insert"];
export type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];
export type BusinessMember = Database["public"]["Tables"]["business_members"]["Row"];

export type BusinessWithStats = Business & {
  task_count?: number;
  active_task_count?: number;
};

/**
 * Fetch all active businesses
 */
export function useBusinesses() {
  return useQuery({
    queryKey: ["businesses"],
    queryFn: async (): Promise<Business[]> => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single business by ID
 */
export function useBusiness(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business", businessId],
    queryFn: async (): Promise<Business | null> => {
      if (!businessId) return null;

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

/**
 * Fetch a business by slug
 */
export function useBusinessBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["business-slug", slug],
    queryFn: async (): Promise<Business | null> => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

/**
 * Fetch businesses the current user is a member of
 */
export function useMyBusinesses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-businesses", user?.id],
    queryFn: async (): Promise<(BusinessMember & { businesses: Business })[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("business_members")
        .select(`
          *,
          businesses (*)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return (data as (BusinessMember & { businesses: Business })[]) || [];
    },
    enabled: !!user?.id,
  });
}

/**
 * Check if user is a member of a business
 */
export function useIsBusinessMember(businessId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business-membership", businessId, user?.id],
    queryFn: async (): Promise<BusinessMember | null> => {
      if (!user?.id || !businessId) return null;

      const { data, error } = await supabase
        .from("business_members")
        .select("*")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!businessId,
  });
}

/**
 * Create a new business
 */
export function useCreateBusiness() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (business: BusinessInsert) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Create business
      const { data: newBusiness, error: businessError } = await supabase
        .from("businesses")
        .insert(business)
        .select()
        .single();

      if (businessError) throw businessError;

      // Add current user as owner
      const { error: memberError } = await supabase
        .from("business_members")
        .insert({
          business_id: newBusiness.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      // Create business wallet
      const { error: walletError } = await supabase
        .from("business_wallets")
        .insert({
          business_id: newBusiness.id,
        });

      if (walletError) throw walletError;

      return newBusiness;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      queryClient.invalidateQueries({ queryKey: ["my-businesses", user?.id] });
    },
  });
}

/**
 * Update a business
 */
export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: BusinessUpdate }) => {
      const { data, error } = await supabase
        .from("businesses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      queryClient.invalidateQueries({ queryKey: ["business", data.id] });
      queryClient.invalidateQueries({ queryKey: ["business-slug", data.slug] });
    },
  });
}

/**
 * Fetch business members
 */
export function useBusinessMembers(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-members", businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from("business_members")
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq("business_id", businessId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}

/**
 * Invite a member to a business
 */
export function useInviteBusinessMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ businessId, userId, role = "member" }: { businessId: string; userId: string; role?: string }) => {
      const { data, error } = await supabase
        .from("business_members")
        .insert({
          business_id: businessId,
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["business-members", data.business_id] });
    },
  });
}

/**
 * Remove a member from a business
 */
export function useRemoveBusinessMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ businessId, userId }: { businessId: string; userId: string }) => {
      const { error } = await supabase
        .from("business_members")
        .delete()
        .eq("business_id", businessId)
        .eq("user_id", userId);

      if (error) throw error;
      return { businessId, userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["business-members", data.businessId] });
    },
  });
}
