import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandWithCRM {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  brand_type: string;
  subscription_status: string;
  subscription_plan: string | null;
  is_verified: boolean;
  is_active: boolean;
  source: string;
  // Close CRM fields
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
  // CRM aggregated fields from view
  opportunity_count: number;
  active_opportunity_count: number;
  won_opportunity_count: number;
  total_pipeline_value: number;
  weighted_pipeline_value: number;
  won_value: number;
  last_activity_at: string | null;
  last_activity_type: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Fetch all brands with CRM data (from view, with fallback to brands table)
export function useBrandsWithCRM() {
  return useQuery({
    queryKey: ["brands-with-crm"],
    queryFn: async (): Promise<BrandWithCRM[]> => {
      // Try the view first
      const { data, error } = await supabase
        .from("brands_with_crm")
        .select("*")
        .order("created_at", { ascending: false });

      // If view doesn't exist, fall back to brands table
      if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
        console.warn("brands_with_crm view not found, falling back to brands table");
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("brands")
          .select("*")
          .order("created_at", { ascending: false });

        if (fallbackError) throw fallbackError;

        // Add default CRM fields
        return (fallbackData || []).map((brand) => ({
          ...brand,
          source: brand.source || "manual",
          opportunity_count: 0,
          active_opportunity_count: 0,
          won_opportunity_count: 0,
          total_pipeline_value: 0,
          weighted_pipeline_value: 0,
          won_value: 0,
          last_activity_at: null,
          last_activity_type: null,
        })) as BrandWithCRM[];
      }

      if (error) throw error;
      return (data || []) as BrandWithCRM[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Fetch brands by Close status ID (for Kanban columns)
export function useBrandsByCloseStatus(statusId: string | null) {
  return useQuery({
    queryKey: ["brands-by-close-status", statusId],
    queryFn: async (): Promise<BrandWithCRM[]> => {
      let query = supabase.from("brands_with_crm").select("*");

      if (statusId === null) {
        query = query.is("close_lead_id", null);
      } else {
        query = query.eq("close_status_id", statusId);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      // Fallback to brands table if view doesn't exist
      if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
        let fallbackQuery = supabase.from("brands").select("*");

        if (statusId === null) {
          fallbackQuery = fallbackQuery.is("close_lead_id", null);
        } else {
          fallbackQuery = fallbackQuery.eq("close_status_id", statusId);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery.order("updated_at", { ascending: false });

        if (fallbackError) throw fallbackError;

        return (fallbackData || []).map((brand) => ({
          ...brand,
          source: brand.source || "manual",
          opportunity_count: 0,
          active_opportunity_count: 0,
          won_opportunity_count: 0,
          total_pipeline_value: 0,
          weighted_pipeline_value: 0,
          won_value: 0,
          last_activity_at: null,
          last_activity_type: null,
        })) as BrandWithCRM[];
      }

      if (error) throw error;
      return (data || []) as BrandWithCRM[];
    },
    staleTime: 30 * 1000,
  });
}

// Fetch single brand with CRM data
export function useBrandWithCRM(brandId: string | undefined) {
  return useQuery({
    queryKey: ["brand-with-crm", brandId],
    queryFn: async (): Promise<BrandWithCRM | null> => {
      if (!brandId) return null;

      const { data, error } = await supabase
        .from("brands_with_crm")
        .select("*")
        .eq("id", brandId)
        .single();

      if (error) throw error;
      return data as BrandWithCRM;
    },
    enabled: !!brandId,
    staleTime: 30 * 1000,
  });
}

// Get pipeline totals grouped by Close status
export function usePipelineByStatus() {
  return useQuery({
    queryKey: ["pipeline-by-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands_with_crm")
        .select("close_status_id, close_status_label, weighted_pipeline_value");

      if (error) throw error;

      // Group by status
      const statusMap = new Map<string | null, { label: string; total: number; count: number }>();

      for (const brand of data || []) {
        const key = brand.close_status_id;
        const existing = statusMap.get(key);
        if (existing) {
          existing.total += Number(brand.weighted_pipeline_value) || 0;
          existing.count += 1;
        } else {
          statusMap.set(key, {
            label: brand.close_status_label || "Unlinked",
            total: Number(brand.weighted_pipeline_value) || 0,
            count: 1,
          });
        }
      }

      return Array.from(statusMap.entries()).map(([statusId, data]) => ({
        statusId,
        label: data.label,
        totalPipelineValue: data.total,
        brandCount: data.count,
      }));
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
