import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  BrandAsset,
  AssetFilters,
  AssetSortOptions,
  AssetType,
} from "@/types/assets";

/**
 * Query key factory for asset queries
 */
export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: (brandId: string, filters?: AssetFilters, sort?: AssetSortOptions) =>
    [...assetKeys.lists(), brandId, filters, sort] as const,
  details: () => [...assetKeys.all, "detail"] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  stats: (brandId: string) => [...assetKeys.all, "stats", brandId] as const,
};

interface UseAssetsOptions {
  brandId: string;
  filters?: AssetFilters;
  sort?: AssetSortOptions;
  enabled?: boolean;
}

/**
 * Fetch assets for a brand with optional filters and sorting
 */
export function useAssets({
  brandId,
  filters,
  sort,
  enabled = true,
}: UseAssetsOptions) {
  return useQuery({
    queryKey: assetKeys.list(brandId, filters, sort),
    queryFn: async (): Promise<BrandAsset[]> => {
      let query = supabase
        .from("brand_assets")
        .select("*")
        .eq("brand_id", brandId);

      // Apply type filter
      if (filters?.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }

      // Apply search filter
      if (filters?.search && filters.search.trim()) {
        query = query.ilike("name", `%${filters.search.trim()}%`);
      }

      // Apply tag filter
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags);
      }

      // Apply sorting
      const sortBy = sort?.sortBy || "created_at";
      const sortOrder = sort?.sortOrder || "desc";
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      const { data, error } = await query;

      if (error) throw error;
      return (data as BrandAsset[]) || [];
    },
    enabled: enabled && !!brandId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a single asset by ID
 */
export function useAsset(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(assetId || ""),
    queryFn: async (): Promise<BrandAsset | null> => {
      if (!assetId) return null;

      const { data, error } = await supabase
        .from("brand_assets")
        .select("*")
        .eq("id", assetId)
        .maybeSingle();

      if (error) throw error;
      return data as BrandAsset | null;
    },
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get asset counts by type for a brand
 */
export function useAssetCounts(brandId: string) {
  return useQuery({
    queryKey: [...assetKeys.stats(brandId), "counts"],
    queryFn: async (): Promise<Record<AssetType | "all", number>> => {
      const { data, error } = await supabase
        .from("brand_assets")
        .select("type")
        .eq("brand_id", brandId);

      if (error) throw error;

      const counts: Record<AssetType | "all", number> = {
        all: data?.length || 0,
        image: 0,
        video: 0,
        document: 0,
        link: 0,
      };

      for (const asset of data || []) {
        const type = asset.type as AssetType;
        if (type in counts) {
          counts[type]++;
        }
      }

      return counts;
    },
    enabled: !!brandId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to invalidate asset queries
 */
export function useInvalidateAssets() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: assetKeys.all }),
    invalidateList: (brandId: string) =>
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() }),
    invalidateAsset: (assetId: string) =>
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(assetId) }),
    invalidateStats: (brandId: string) =>
      queryClient.invalidateQueries({ queryKey: assetKeys.stats(brandId) }),
  };
}
