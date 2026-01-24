"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";

export interface UserProfile {
  id: string;
  name: string | null;
  avatar: string | null;
  email: string | null;
  bio: string | null;
  createdAt: string;
  sellerProfile: {
    id: string;
    hourlyRate: number;
    bio: string | null;
    tagline: string | null;
    averageRating: number | null;
    totalSessionsCompleted: number;
    totalReviews: number;
    isVerified: boolean;
    isActive: boolean;
  } | null;
}

interface ProfileResponse {
  user: UserProfile;
}

async function fetchProfile(): Promise<UserProfile> {
  const response = await fetch("/api/app/profile", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }

  const data: ProfileResponse = await response.json();
  return data.user;
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
