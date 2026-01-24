"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import type { SessionData } from "@/components/marketplace";

interface SessionsResponse {
  sessions: Array<{
    id: string;
    units: number;
    topic: string;
    scheduledAt: string | null;
    status: SessionData["status"];
    meetingUrl: string | null;
    buyer: {
      id: string;
      name: string | null;
      avatar: string | null;
    };
    seller: {
      id: string;
      name: string | null;
      avatar: string | null;
    };
  }>;
}

// Transform API response to SessionData format
function transformSession(session: SessionsResponse["sessions"][0]): SessionData {
  return {
    id: session.id,
    units: session.units,
    topic: session.topic,
    scheduledAt: session.scheduledAt,
    status: session.status,
    meetingUrl: session.meetingUrl,
    buyer: session.buyer,
    seller: session.seller,
  };
}

async function fetchSessions(role?: "buyer" | "seller"): Promise<SessionData[]> {
  const params = new URLSearchParams();
  if (role) {
    params.set("role", role);
  }

  const url = `/api/app/sessions${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch sessions");
  }

  const data: SessionsResponse = await response.json();
  return data.sessions.map(transformSession);
}

export function useSessions(role?: "buyer" | "seller") {
  return useQuery({
    queryKey: queryKeys.sessions.list(role),
    queryFn: () => fetchSessions(role),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useBuyerSessions() {
  return useSessions("buyer");
}

export function useSellerSessions() {
  return useSessions("seller");
}
