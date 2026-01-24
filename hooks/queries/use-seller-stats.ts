"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";

export interface SellerStats {
  totalEarnings: number;
  pendingEarnings: number;
  totalSessions: number;
  pendingRequests: number;
  averageRating: number | null;
  totalReviews: number;
  hourlyRate: number;
}

export interface RecentSession {
  id: string;
  topic: string;
  scheduledAt: string | null;
  status: string;
  buyer: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

interface SellerDashboardResponse {
  stats: SellerStats;
  recentSessions: RecentSession[];
}

async function fetchSellerDashboard(): Promise<SellerDashboardResponse> {
  const response = await fetch("/api/app/seller/dashboard", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch seller dashboard");
  }

  return response.json();
}

export function useSellerDashboard() {
  return useQuery({
    queryKey: queryKeys.sellerStats.dashboard(),
    queryFn: fetchSellerDashboard,
    staleTime: 60 * 1000, // 1 minute
  });
}
