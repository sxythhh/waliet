import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/posthog";
import { assetKeys } from "./useAssets";
import type { CreateAssetInput, UpdateAssetInput, BrandAsset } from "@/types/assets";

/**
 * Upload a new asset to a brand
 */
export function useAssetUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssetInput): Promise<BrandAsset> => {
      const { brand_id, name, description, type, file, external_url, tags } = input;

      let fileUrl: string | null = null;
      let filePath: string | null = null;
      let fileSize: number | null = null;
      let mimeType: string | null = null;
      let thumbnailUrl: string | null = null;

      // Upload file if provided
      if (file && type !== "link") {
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const fileName = `${brand_id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("brand-assets")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("brand-assets").getPublicUrl(fileName);

        fileUrl = publicUrl;
        filePath = fileName;
        fileSize = file.size;
        mimeType = file.type;

        // For images, use the file URL as thumbnail
        if (type === "image") {
          thumbnailUrl = publicUrl;
        }
      }

      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Insert asset record
      const { data, error } = await supabase
        .from("brand_assets")
        .insert({
          brand_id,
          name,
          description: description || null,
          type,
          file_path: filePath,
          file_url: fileUrl,
          file_size: fileSize,
          mime_type: mimeType,
          external_url: type === "link" ? external_url : null,
          thumbnail_url: thumbnailUrl,
          tags: tags || [],
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) {
        // If insert fails and we uploaded a file, try to clean up
        if (filePath) {
          await supabase.storage.from("brand-assets").remove([filePath]);
        }
        throw new Error(`Failed to create asset: ${error.message}`);
      }

      return data as BrandAsset;
    },
    onSuccess: (data) => {
      // Track analytics
      trackEvent("asset_uploaded", {
        asset_id: data.id,
        asset_type: data.type,
        brand_id: data.brand_id,
        file_size: data.file_size,
      });

      // Invalidate asset list and counts for the brand
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.stats(data.brand_id) });
    },
  });
}

/**
 * Update an existing asset's metadata
 */
export function useAssetUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      brandId,
      input,
    }: {
      assetId: string;
      brandId: string;
      input: UpdateAssetInput;
    }): Promise<BrandAsset> => {
      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.tags !== undefined) updateData.tags = input.tags;
      if (input.external_url !== undefined) updateData.external_url = input.external_url;

      const { data, error } = await supabase
        .from("brand_assets")
        .update(updateData)
        .eq("id", assetId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update asset: ${error.message}`);
      }

      return data as BrandAsset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.id) });
    },
  });
}

/**
 * Delete an asset (and its storage file)
 */
export function useAssetDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      brandId,
    }: {
      assetId: string;
      brandId: string;
    }): Promise<void> => {
      // First, get the asset to check for file path
      const { data: asset, error: fetchError } = await supabase
        .from("brand_assets")
        .select("file_path")
        .eq("id", assetId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch asset: ${fetchError.message}`);
      }

      // Delete from storage if file exists
      if (asset?.file_path) {
        const { error: storageError } = await supabase.storage
          .from("brand-assets")
          .remove([asset.file_path]);

        if (storageError) {
          console.error("Failed to delete file from storage:", storageError);
          // Continue with database deletion even if storage fails
        }
      }

      // Delete the asset record
      const { error: deleteError } = await supabase
        .from("brand_assets")
        .delete()
        .eq("id", assetId);

      if (deleteError) {
        throw new Error(`Failed to delete asset: ${deleteError.message}`);
      }
    },
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.stats(brandId) });
    },
  });
}

/**
 * Bulk delete multiple assets
 */
export function useAssetBulkDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetIds,
      brandId,
    }: {
      assetIds: string[];
      brandId: string;
    }): Promise<{ deleted: number; errors: string[] }> => {
      const errors: string[] = [];
      let deleted = 0;

      // Get all assets to find their file paths
      const { data: assets, error: fetchError } = await supabase
        .from("brand_assets")
        .select("id, file_path")
        .in("id", assetIds);

      if (fetchError) {
        throw new Error(`Failed to fetch assets: ${fetchError.message}`);
      }

      // Delete files from storage
      const filePaths = (assets || [])
        .map((a) => a.file_path)
        .filter((p): p is string => !!p);

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("brand-assets")
          .remove(filePaths);

        if (storageError) {
          errors.push(`Storage deletion warning: ${storageError.message}`);
        }
      }

      // Delete asset records
      const { error: deleteError, count } = await supabase
        .from("brand_assets")
        .delete()
        .in("id", assetIds);

      if (deleteError) {
        throw new Error(`Failed to delete assets: ${deleteError.message}`);
      }

      deleted = count || assetIds.length;

      return { deleted, errors };
    },
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.stats(brandId) });
    },
  });
}
