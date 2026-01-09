import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TreasuryBalance {
  usdcBalance: number | null;
  solBalance: number | null;
  treasuryAddress: string | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

/**
 * Hook to fetch treasury wallet balance from Solana
 * This calls a lightweight edge function that reads balance without sending transactions
 */
export function useTreasuryBalance(enabled = true) {
  const [state, setState] = useState<TreasuryBalance>({
    usdcBalance: null,
    solBalance: null,
    treasuryAddress: null,
    loading: false,
    error: null,
    lastFetched: null,
  });

  const fetchBalance = useCallback(async () => {
    if (!enabled) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await supabase.functions.invoke("get-treasury-balance");

      if (response.error) {
        throw new Error(response.error.message || "Failed to fetch treasury balance");
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch balance");
      }

      setState({
        usdcBalance: data.usdcBalance,
        solBalance: data.solBalance,
        treasuryAddress: data.treasuryAddress,
        loading: false,
        error: null,
        lastFetched: new Date(),
      });
    } catch (err) {
      console.error("Error fetching treasury balance:", err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [enabled]);

  // Fetch on mount and when enabled changes
  useEffect(() => {
    if (enabled) {
      fetchBalance();
    }
  }, [enabled, fetchBalance]);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [enabled, fetchBalance]);

  return {
    ...state,
    refetch: fetchBalance,
  };
}

/**
 * Format USDC balance for display
 */
export function formatUsdcBalance(balance: number | null): string {
  if (balance === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
}

/**
 * Format SOL balance for display
 */
export function formatSolBalance(balance: number | null): string {
  if (balance === null) return "—";
  return `${balance.toFixed(4)} SOL`;
}
