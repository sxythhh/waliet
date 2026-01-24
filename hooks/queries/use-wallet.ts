"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import type { WalletBalanceData } from "@/components/marketplace";

interface WalletResponse {
  balances: Array<{
    id: string;
    balanceUnits: number;
    reservedUnits: number;
    avgPurchasePricePerUnit: number;
    totalPaid: number;
    seller: {
      id: string;
      name: string | null;
      avatar: string | null;
      sellerProfile: {
        hourlyRate: number;
        averageRating: number | null;
        totalSessionsCompleted: number;
      } | null;
    };
  }>;
  summary: {
    totalUnits: number;
    totalHours: number;
    totalValueCents: number;
    sellerCount: number;
  };
}

// Transform API response to WalletBalanceData format
function transformBalance(balance: WalletResponse["balances"][0]): WalletBalanceData {
  return {
    id: balance.id,
    balanceUnits: balance.balanceUnits,
    reservedUnits: balance.reservedUnits,
    avgPurchasePricePerUnit: balance.avgPurchasePricePerUnit,
    totalPaid: balance.totalPaid,
    seller: balance.seller,
  };
}

async function fetchWalletBalances(): Promise<WalletBalanceData[]> {
  const response = await fetch("/api/app/wallet", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch wallet balances");
  }

  const data: WalletResponse = await response.json();
  return data.balances.map(transformBalance);
}

export function useWalletBalances() {
  return useQuery({
    queryKey: queryKeys.wallet.balances(),
    queryFn: fetchWalletBalances,
    staleTime: 60 * 1000, // 1 minute
  });
}
