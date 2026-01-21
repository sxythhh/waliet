import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
export type WalletUpdate = Database["public"]["Tables"]["wallets"]["Update"];
export type WalletTransaction = Database["public"]["Tables"]["wallet_transactions"]["Row"];
export type PayoutRequest = Database["public"]["Tables"]["payout_requests"]["Row"];
export type PayoutRequestInsert = Database["public"]["Tables"]["payout_requests"]["Insert"];

/**
 * Fetch current user's wallet
 */
export function useWallet() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async (): Promise<Wallet | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

/**
 * Fetch wallet transactions
 */
export function useWalletTransactions(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet-transactions", user?.id, limit],
    queryFn: async (): Promise<WalletTransaction[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

/**
 * Update payout settings
 */
export function useUpdatePayoutSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Pick<WalletUpdate, "payout_method" | "payout_details">) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("wallets")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
    },
  });
}

/**
 * Fetch payout requests
 */
export function usePayoutRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payout-requests", user?.id],
    queryFn: async (): Promise<PayoutRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

/**
 * Create a payout request (withdrawal)
 */
export function useRequestPayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: Omit<PayoutRequestInsert, "user_id">) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (walletError) throw walletError;
      if (!wallet || (wallet.balance || 0) < request.amount) {
        throw new Error("Insufficient balance");
      }

      // Check for pending requests
      const { data: pendingRequests } = await supabase
        .from("payout_requests")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["pending", "in_transit"]);

      if (pendingRequests && pendingRequests.length > 0) {
        throw new Error("You already have a pending withdrawal request");
      }

      // Create payout request
      const { data, error } = await supabase
        .from("payout_requests")
        .insert({
          ...request,
          user_id: user.id,
          net_amount: request.amount, // Can adjust for fees later
        })
        .select()
        .single();

      if (error) throw error;

      // Deduct from wallet balance
      const { error: updateError } = await supabase
        .from("wallets")
        .update({
          balance: (wallet.balance || 0) - request.amount,
          total_withdrawn: supabase.rpc("increment_withdrawn", { amount: request.amount }),
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Create transaction record
      await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        amount: -request.amount,
        type: "withdrawal",
        status: "pending",
        description: `Withdrawal to ${request.payout_method}`,
        metadata: { payout_request_id: data.id },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["payout-requests", user?.id] });
    },
  });
}

// ============= Business Wallet Hooks =============

export type BusinessWallet = Database["public"]["Tables"]["business_wallets"]["Row"];
export type BusinessWalletTransaction = Database["public"]["Tables"]["business_wallet_transactions"]["Row"];

/**
 * Fetch business wallet
 */
export function useBusinessWallet(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-wallet", businessId],
    queryFn: async (): Promise<BusinessWallet | null> => {
      if (!businessId) return null;

      const { data, error } = await supabase
        .from("business_wallets")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

/**
 * Fetch business wallet transactions
 */
export function useBusinessWalletTransactions(businessId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["business-wallet-transactions", businessId, limit],
    queryFn: async (): Promise<BusinessWalletTransaction[]> => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from("business_wallet_transactions")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}
