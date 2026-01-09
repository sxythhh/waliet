import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type SocialAccount = Database["public"]["Tables"]["social_accounts"]["Row"];

export function useSocialAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["socialAccounts", user?.id],
    queryFn: async (): Promise<SocialAccount[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("connected_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // Social accounts rarely change
  });
}

export function useDeleteSocialAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("social_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["socialAccounts", user?.id] });
    },
  });
}

export type { SocialAccount };
