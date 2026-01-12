import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CloseBrandData {
  id: string;
  name: string;
  close_lead_id: string | null;
  close_status_id: string | null;
  close_status_label: string | null;
  close_synced_at: string | null;
  close_sync_enabled: boolean;
  close_custom_fields: Record<string, unknown>;
  close_contacts: Array<{
    id: string;
    name: string;
    title?: string;
    emails?: Array<{ email: string; type?: string }>;
    phones?: Array<{ phone: string; type?: string }>;
  }>;
}

export interface CloseLeadStatus {
  id: string;
  label: string;
}

// Fetch brand with Close CRM data
export function useCloseBrand(brandId: string | undefined) {
  return useQuery({
    queryKey: ["close-brand", brandId],
    queryFn: async (): Promise<CloseBrandData | null> => {
      if (!brandId) return null;

      const { data, error } = await supabase
        .from("brands")
        .select(`
          id,
          name,
          close_lead_id,
          close_status_id,
          close_status_label,
          close_synced_at,
          close_sync_enabled,
          close_custom_fields,
          close_contacts
        `)
        .eq("id", brandId)
        .single();

      if (error) throw error;
      return data as CloseBrandData;
    },
    enabled: !!brandId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Fetch available Close lead statuses
export function useCloseLeadStatuses() {
  return useQuery({
    queryKey: ["close-lead-statuses"],
    queryFn: async (): Promise<CloseLeadStatus[]> => {
      const { data, error } = await supabase.functions.invoke("close-sync", {
        body: { action: "get_lead_statuses" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.statuses || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Cached version for Pipeline/Table views (longer stale time)
export function useCloseLeadStatusesCached() {
  return useQuery({
    queryKey: ["close-lead-statuses-cached"],
    queryFn: async (): Promise<CloseLeadStatus[]> => {
      const { data, error } = await supabase.functions.invoke("close-sync", {
        body: { action: "get_lead_statuses" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.statuses || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

// Sync brand to Close CRM
export function useSyncBrandToClose() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ brandId, action }: { brandId: string; action: "create" | "update" }) => {
      const endpoint = action === "create" ? "create_close_lead" : "update_close_lead";
      const { data, error } = await supabase.functions.invoke("close-sync", {
        body: { action: endpoint, brand_id: brandId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["close-brand", variables.brandId] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast({
        title: variables.action === "create" ? "Lead created in Close" : "Close lead updated",
        description: `Successfully synced brand to Close CRM.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: error.message,
      });
    },
  });
}

// Fetch latest data from Close
export function useFetchFromClose() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (brandId: string) => {
      const { data, error } = await supabase.functions.invoke("close-sync", {
        body: { action: "fetch_close_lead", brand_id: brandId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, brandId) => {
      queryClient.invalidateQueries({ queryKey: ["close-brand", brandId] });
      queryClient.invalidateQueries({ queryKey: ["close-opportunities", brandId] });
      queryClient.invalidateQueries({ queryKey: ["close-activities", brandId] });
      toast({
        title: "Synced from Close",
        description: "Latest data fetched from Close CRM.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fetch failed",
        description: error.message,
      });
    },
  });
}

// Update lead status in Close
export function useUpdateCloseStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ brandId, statusId }: { brandId: string; statusId: string }) => {
      const { data, error } = await supabase.functions.invoke("close-crud", {
        body: { action: "update_lead_status", brand_id: brandId, status_id: statusId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["close-brand", variables.brandId] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast({
        title: "Status updated",
        description: `Lead status changed to "${data.lead?.status_label || 'new status'}".`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: error.message,
      });
    },
  });
}

// Link existing brand to a Close lead
export function useLinkToCloseLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ brandId, closeLeadId }: { brandId: string; closeLeadId: string }) => {
      // First fetch the lead data from Close
      const { data: fetchData, error: fetchError } = await supabase.functions.invoke("close-sync", {
        body: { action: "fetch_close_lead", brand_id: brandId, close_lead_id: closeLeadId },
      });

      if (fetchError) throw fetchError;
      if (!fetchData.success) throw new Error(fetchData.error);

      // Update the brand with the Close lead ID
      const { error: updateError } = await supabase
        .from("brands")
        .update({ close_lead_id: closeLeadId })
        .eq("id", brandId);

      if (updateError) throw updateError;
      return fetchData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["close-brand", variables.brandId] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast({
        title: "Brand linked",
        description: "Brand has been linked to Close CRM lead.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to link brand",
        description: error.message,
      });
    },
  });
}

// Unlink brand from Close
export function useUnlinkFromClose() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (brandId: string) => {
      const { error } = await supabase
        .from("brands")
        .update({
          close_lead_id: null,
          close_status_id: null,
          close_status_label: null,
          close_sync_enabled: false,
        })
        .eq("id", brandId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, brandId) => {
      queryClient.invalidateQueries({ queryKey: ["close-brand", brandId] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast({
        title: "Brand unlinked",
        description: "Brand has been unlinked from Close CRM.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to unlink brand",
        description: error.message,
      });
    },
  });
}
