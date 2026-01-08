import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CloseOpportunity {
  id: string;
  brand_id: string;
  close_opportunity_id: string;
  close_lead_id: string;
  status_id: string | null;
  status_type: "active" | "won" | "lost" | null;
  status_label: string | null;
  value: number | null;
  value_period: "one_time" | "monthly" | "annual" | null;
  confidence: number | null;
  date_won: string | null;
  note: string | null;
  custom_fields: Record<string, unknown>;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloseOpportunityStatus {
  id: string;
  label: string;
  type: "active" | "won" | "lost";
}

export interface CreateOpportunityInput {
  brand_id: string;
  status_id: string;
  value?: number;
  value_period?: "one_time" | "monthly" | "annual";
  confidence?: number;
  note?: string;
}

export interface UpdateOpportunityInput {
  opportunity_id?: string;
  close_opportunity_id?: string;
  status_id?: string;
  value?: number;
  value_period?: "one_time" | "monthly" | "annual";
  confidence?: number;
  note?: string;
}

// Fetch opportunities for a brand
export function useCloseOpportunities(brandId: string | undefined) {
  return useQuery({
    queryKey: ["close-opportunities", brandId],
    queryFn: async (): Promise<CloseOpportunity[]> => {
      if (!brandId) return [];

      const { data, error } = await supabase
        .from("close_opportunities")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CloseOpportunity[];
    },
    enabled: !!brandId,
    staleTime: 30 * 1000,
  });
}

// Fetch opportunity statuses from Close
export function useCloseOpportunityStatuses() {
  return useQuery({
    queryKey: ["close-opportunity-statuses"],
    queryFn: async (): Promise<CloseOpportunityStatus[]> => {
      const { data, error } = await supabase.functions.invoke("close-sync", {
        body: { action: "get_opportunity_statuses" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.statuses || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Create opportunity
export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateOpportunityInput) => {
      const { data, error } = await supabase.functions.invoke("close-crud", {
        body: {
          action: "create_opportunity",
          ...input,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["close-opportunities", variables.brand_id] });
      toast({
        title: "Opportunity created",
        description: `New opportunity worth $${data.opportunity?.value?.toLocaleString() || 0} created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create opportunity",
        description: error.message,
      });
    },
  });
}

// Update opportunity
export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ brandId, ...input }: UpdateOpportunityInput & { brandId: string }) => {
      const { data, error } = await supabase.functions.invoke("close-crud", {
        body: {
          action: "update_opportunity",
          ...input,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return { ...data, brandId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["close-opportunities", data.brandId] });
      toast({
        title: "Opportunity updated",
        description: "Opportunity has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update opportunity",
        description: error.message,
      });
    },
  });
}

// Delete opportunity
export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ brandId, opportunityId, closeOpportunityId }: {
      brandId: string;
      opportunityId?: string;
      closeOpportunityId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("close-crud", {
        body: {
          action: "delete_opportunity",
          opportunity_id: opportunityId,
          close_opportunity_id: closeOpportunityId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return { ...data, brandId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["close-opportunities", data.brandId] });
      toast({
        title: "Opportunity deleted",
        description: "Opportunity has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete opportunity",
        description: error.message,
      });
    },
  });
}

// Calculate opportunity pipeline metrics
export function useOpportunityMetrics(opportunities: CloseOpportunity[] | undefined) {
  if (!opportunities) {
    return {
      totalValue: 0,
      activeValue: 0,
      wonValue: 0,
      lostValue: 0,
      activeCount: 0,
      wonCount: 0,
      lostCount: 0,
      weightedValue: 0,
    };
  }

  const metrics = opportunities.reduce(
    (acc, opp) => {
      const value = opp.value || 0;
      const confidence = opp.confidence || 50;

      acc.totalValue += value;

      if (opp.status_type === "active") {
        acc.activeValue += value;
        acc.activeCount += 1;
        acc.weightedValue += value * (confidence / 100);
      } else if (opp.status_type === "won") {
        acc.wonValue += value;
        acc.wonCount += 1;
      } else if (opp.status_type === "lost") {
        acc.lostValue += value;
        acc.lostCount += 1;
      }

      return acc;
    },
    {
      totalValue: 0,
      activeValue: 0,
      wonValue: 0,
      lostValue: 0,
      activeCount: 0,
      wonCount: 0,
      lostCount: 0,
      weightedValue: 0,
    }
  );

  return metrics;
}
