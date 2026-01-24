"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import type { SellerData } from "@/components/marketplace";

interface SellersResponse {
  sellers: Array<{
    id: string;
    userId: string;
    hourlyRate: number | null;
    bio: string | null;
    tagline: string | null;
    averageRating: number | null;
    totalSessionsCompleted: number;
    isVerified: boolean;
    isActive: boolean;
    user: {
      id: string;
      name: string | null;
      avatar: string | null;
    };
  }>;
  nextCursor: string | null;
}

// Transform API response to SellerData format
function transformSeller(seller: SellersResponse["sellers"][0]): SellerData {
  return {
    id: seller.id,
    userId: seller.userId,
    hourlyRate: seller.hourlyRate,
    bio: seller.bio,
    tagline: seller.tagline,
    averageRating: seller.averageRating,
    totalSessionsCompleted: seller.totalSessionsCompleted,
    isVerified: seller.isVerified,
    hasSellerProfile: true,
    user: seller.user,
  };
}

async function fetchSellers(): Promise<SellerData[]> {
  const response = await fetch("/api/app/sellers", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch sellers");
  }

  const data: SellersResponse = await response.json();
  return data.sellers.map(transformSeller);
}

export function useSellers() {
  return useQuery({
    queryKey: queryKeys.sellers.list(),
    queryFn: fetchSellers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
