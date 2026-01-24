import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/posthog";
import { useAuth } from "@/contexts/AuthContext";
import type {
  AssetRequest,
  AssetRequestWithRequester,
  CreateAssetRequestInput,
  UpdateAssetRequestInput,
  AssetRequestStatus,
} from "@/types/assets";

/**
 * Query key factory for asset request queries
 */
export const assetRequestKeys = {
  all: ["asset-requests"] as const,
  lists: () => [...assetRequestKeys.all, "list"] as const,
  listByBrand: (brandId: string) => [...assetRequestKeys.lists(), "brand", brandId] as const,
  listByUser: (userId: string) => [...assetRequestKeys.lists(), "user", userId] as const,
  detail: (id: string) => [...assetRequestKeys.all, "detail", id] as const,
  counts: (brandId: string) => [...assetRequestKeys.all, "counts", brandId] as const,
};

/**
 * Fetch asset requests for a brand (admin view)
 */
export function useAssetRequestsByBrand(brandId: string, status?: AssetRequestStatus) {
  return useQuery({
    queryKey: [...assetRequestKeys.listByBrand(brandId), status],
    queryFn: async (): Promise<AssetRequestWithRequester[]> => {
      let query = supabase
        .from("asset_requests")
        .select(
          `
          *,
          requester:requested_by (
            id,
            username,
            avatar_url,
            full_name
          )
        `
        )
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as AssetRequestWithRequester[]) || [];
    },
    enabled: !!brandId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch asset requests created by current user
 */
export function useMyAssetRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: assetRequestKeys.listByUser(user?.id || ""),
    queryFn: async (): Promise<AssetRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("asset_requests")
        .select("*")
        .eq("requested_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as AssetRequest[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get pending request count for a brand
 */
export function usePendingRequestCount(brandId: string) {
  return useQuery({
    queryKey: assetRequestKeys.counts(brandId),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("asset_requests")
        .select("*", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!brandId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Create a new asset request
 */
export function useCreateAssetRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateAssetRequestInput): Promise<AssetRequest> => {
      if (!user?.id) {
        throw new Error("You must be logged in to request assets");
      }

      const { data, error } = await supabase
        .from("asset_requests")
        .insert({
          brand_id: input.brand_id,
          requested_by: user.id,
          title: input.title,
          description: input.description,
          asset_type: input.asset_type || null,
          priority: input.priority || "normal",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create request: ${error.message}`);
      }

      return data as AssetRequest;
    },
    onSuccess: (data) => {
      // Track analytics
      trackEvent("asset_request_submitted", {
        request_id: data.id,
        asset_type: data.asset_type,
        priority: data.priority,
        brand_id: data.brand_id,
      });

      queryClient.invalidateQueries({
        queryKey: assetRequestKeys.listByBrand(data.brand_id),
      });
      queryClient.invalidateQueries({
        queryKey: assetRequestKeys.listByUser(data.requested_by),
      });
      queryClient.invalidateQueries({
        queryKey: assetRequestKeys.counts(data.brand_id),
      });
    },
  });
}

/**
 * Update an asset request (admin)
 */
export function useUpdateAssetRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      brandId,
      input,
    }: {
      requestId: string;
      brandId: string;
      input: UpdateAssetRequestInput;
    }): Promise<AssetRequest> => {
      const updateData: Record<string, unknown> = {};

      if (input.status !== undefined) {
        updateData.status = input.status;

        // Set resolved_at and resolved_by for terminal states
        if (input.status === "completed" || input.status === "declined") {
          updateData.resolved_at = new Date().toISOString();
          updateData.resolved_by = user?.id;
        }
      }

      if (input.response_note !== undefined) {
        updateData.response_note = input.response_note;
      }

      if (input.fulfilled_asset_id !== undefined) {
        updateData.fulfilled_asset_id = input.fulfilled_asset_id;
      }

      const { data, error } = await supabase
        .from("asset_requests")
        .update(updateData)
        .eq("id", requestId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update request: ${error.message}`);
      }

      return data as AssetRequest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: assetRequestKeys.listByBrand(data.brand_id),
      });
      queryClient.invalidateQueries({
        queryKey: assetRequestKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: assetRequestKeys.counts(data.brand_id),
      });
    },
  });
}

/**
 * Delete an asset request
 */
export function useDeleteAssetRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      brandId,
    }: {
      requestId: string;
      brandId: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from("asset_requests")
        .delete()
        .eq("id", requestId);

      if (error) {
        throw new Error(`Failed to delete request: ${error.message}`);
      }
    },
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({
        queryKey: assetRequestKeys.listByBrand(brandId),
      });
      queryClient.invalidateQueries({
        queryKey: assetRequestKeys.counts(brandId),
      });
    },
  });
}
