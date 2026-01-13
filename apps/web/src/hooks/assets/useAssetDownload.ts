import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/posthog";
import { assetKeys } from "./useAssets";
import type { BrandAsset } from "@/types/assets";

/**
 * Track and initiate asset download
 */
export function useAssetDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: BrandAsset): Promise<void> => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Track the download
      await supabase.from("asset_downloads").insert({
        asset_id: asset.id,
        user_id: user?.id || null,
      });

      // Increment download counter (optimistic, actual count comes from downloads table)
      await supabase
        .from("brand_assets")
        .update({ download_count: (asset.download_count || 0) + 1 })
        .eq("id", asset.id);

      // Initiate the actual download
      if (asset.file_url) {
        // For file assets, fetch and trigger download via blob
        // This forces a download instead of opening in a new tab
        try {
          const response = await fetch(asset.file_url);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = asset.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } catch {
          // Fallback: open in new tab if fetch fails (e.g., CORS)
          window.open(asset.file_url, "_blank", "noopener,noreferrer");
        }
      } else if (asset.external_url) {
        // For link assets, open in new tab
        window.open(asset.external_url, "_blank", "noopener,noreferrer");
      }
    },
    onSuccess: (_, asset) => {
      // Track analytics
      trackEvent("asset_downloaded", {
        asset_id: asset.id,
        asset_type: asset.type,
        brand_id: asset.brand_id,
        asset_name: asset.name,
      });

      // Invalidate the specific asset to refresh download count
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(asset.id) });
      // Also invalidate the list to update counts there
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

/**
 * Track asset view (without download)
 */
export function useAssetView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string): Promise<void> => {
      // Increment view counter
      const { error } = await supabase.rpc("increment_asset_view_count", {
        asset_id: assetId,
      });

      // If RPC doesn't exist, fall back to direct update
      if (error && error.code === "42883") {
        // Function not found
        const { data: asset } = await supabase
          .from("brand_assets")
          .select("view_count")
          .eq("id", assetId)
          .single();

        if (asset) {
          await supabase
            .from("brand_assets")
            .update({ view_count: (asset.view_count || 0) + 1 })
            .eq("id", assetId);
        }
      }
    },
    onSuccess: (_, assetId) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(assetId) });
    },
  });
}

/**
 * Get download history for an asset (admin only)
 */
export function useAssetDownloadHistory(assetId: string | undefined, limit = 50) {
  return {
    queryKey: ["asset-downloads", assetId, limit],
    queryFn: async () => {
      if (!assetId) return [];

      const { data, error } = await supabase
        .from("asset_downloads")
        .select(
          `
          id,
          downloaded_at,
          user_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `
        )
        .eq("asset_id", assetId)
        .order("downloaded_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!assetId,
  };
}

/**
 * Get download statistics for an asset
 */
export function useAssetDownloadStats(assetId: string | undefined) {
  return {
    queryKey: ["asset-download-stats", assetId],
    queryFn: async () => {
      if (!assetId) return null;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all downloads for this asset
      const { data: downloads, error } = await supabase
        .from("asset_downloads")
        .select("downloaded_at, user_id")
        .eq("asset_id", assetId);

      if (error) throw error;

      const total = downloads?.length || 0;
      const last7Days =
        downloads?.filter(
          (d) => new Date(d.downloaded_at) >= sevenDaysAgo
        ).length || 0;
      const last30Days =
        downloads?.filter(
          (d) => new Date(d.downloaded_at) >= thirtyDaysAgo
        ).length || 0;

      // Count unique users
      const uniqueUsers = new Set(
        downloads?.map((d) => d.user_id).filter(Boolean)
      ).size;

      return {
        total,
        last7Days,
        last30Days,
        uniqueUsers,
      };
    },
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  };
}
