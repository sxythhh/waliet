"use client";

import { useSellers } from "@/hooks/queries/use-sellers";
import { useWalletBalances } from "@/hooks/queries/use-wallet";
import { useBuyerSessions } from "@/hooks/queries/use-sessions";
import { useProfile } from "@/hooks/queries/use-profile";
import { BrowseTab } from "@/components/dashboard/BrowseTab";
import { WalletTab } from "@/components/dashboard/WalletTab";
import { SessionsTab } from "@/components/dashboard/SessionsTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";

interface BuyerTabsProps {
  activeTab: string;
  userId: string;
}

export function BuyerTabs({ activeTab, userId }: BuyerTabsProps) {
  // Fetch data for all tabs upfront for instant switching
  const sellers = useSellers();
  const wallet = useWalletBalances();
  const sessions = useBuyerSessions();
  const profile = useProfile();

  // Create user object for ProfileTab
  const profileUser = profile.data
    ? {
        id: profile.data.id,
        name: profile.data.name,
        avatar: profile.data.avatar,
        email: profile.data.email,
        bio: profile.data.bio,
        createdAt: profile.data.createdAt,
        sellerProfile: profile.data.sellerProfile
          ? {
              id: profile.data.sellerProfile.id,
              hourlyRate: profile.data.sellerProfile.hourlyRate,
              tagline: profile.data.sellerProfile.tagline,
              averageRating: profile.data.sellerProfile.averageRating,
              totalSessionsCompleted: profile.data.sellerProfile.totalSessionsCompleted,
              totalEarnings: 0, // TODO: Add this to the API response
            }
          : null,
      }
    : null;

  switch (activeTab) {
    case "browse":
      return (
        <BrowseTab
          members={sellers.data ?? []}
          isLoading={sellers.isLoading}
          standalone
        />
      );

    case "wallet":
      return (
        <WalletTab
          balances={wallet.data ?? []}
          isLoading={wallet.isLoading}
          standalone
        />
      );

    case "offers":
      return (
        <SessionsTab
          sessions={sessions.data ?? []}
          userId={userId}
          isLoading={sessions.isLoading}
          standalone
        />
      );

    case "profile":
      return (
        <ProfileTab
          user={profileUser}
          isLoading={profile.isLoading}
          standalone
        />
      );

    case "settings":
      return (
        <SettingsTab
          user={profile.data ? {
            id: profile.data.id,
            name: profile.data.name,
            avatar: profile.data.avatar,
            bio: profile.data.bio,
            email: profile.data.email,
            createdAt: profile.data.createdAt,
          } : null}
          isLoading={profile.isLoading}
          standalone
        />
      );

    default:
      return (
        <BrowseTab
          members={sellers.data ?? []}
          isLoading={sellers.isLoading}
          standalone
        />
      );
  }
}
