import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import type { CreatorPortfolio } from "@/types/portfolio";

// Fetch current user's portfolio
export function useMyPortfolio() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["portfolio", "my", user?.id],
    queryFn: async (): Promise<CreatorPortfolio | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("creator_portfolios")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as CreatorPortfolio | null;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch portfolio by user ID (for public profile)
export function usePortfolio(userId: string | undefined) {
  return useQuery({
    queryKey: ["portfolio", userId],
    queryFn: async (): Promise<CreatorPortfolio | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("creator_portfolios")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as CreatorPortfolio | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// Create or update portfolio
export function useUpsertPortfolio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (portfolio: Partial<CreatorPortfolio>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("creator_portfolios")
        .upsert({
          ...portfolio as any,
          user_id: user.id,
        }, {
          onConflict: "user_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as CreatorPortfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast({
        title: "Portfolio saved",
        description: "Your portfolio has been updated.",
      });
    },
    onError: (error) => {
      console.error("Error saving portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to save portfolio. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Update specific field in portfolio
export function useUpdatePortfolioField() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ field, value }: { field: keyof CreatorPortfolio; value: unknown }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // First check if portfolio exists
      const { data: existing } = await supabase
        .from("creator_portfolios")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("creator_portfolios")
          .update({ [field]: value })
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        return data as unknown as CreatorPortfolio;
      } else {
        // Create new with field
        const { data, error } = await supabase
          .from("creator_portfolios")
          .insert({
            user_id: user.id,
            [field]: value,
          })
          .select()
          .single();

        if (error) throw error;
        return data as unknown as CreatorPortfolio;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

// Delete portfolio
export function useDeletePortfolio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("creator_portfolios")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast({
        title: "Portfolio deleted",
        description: "Your portfolio has been removed.",
      });
    },
    onError: (error) => {
      console.error("Error deleting portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to delete portfolio. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Fetch user's approved videos for featuring in portfolio
export function useApprovedVideos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["approved-videos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("video_submissions")
        .select(`
          id,
          video_url,
          thumbnail_url,
          title,
          views,
          platform,
          created_at,
          campaigns (
            title,
            brand_name
          )
        `)
        .eq("creator_id", user.id)
        .eq("status", "approved")
        .order("views", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
