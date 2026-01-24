"use client";

import { useTabStore } from "@/hooks/use-tab-store";
import { useProfile } from "@/hooks/queries/use-profile";
import { AppTopBar } from "./AppTopBar";
import { AppMobileNav } from "./AppMobileNav";
import { BuyerTabs } from "./BuyerTabs";
import { SellerTabs } from "./SellerTabs";

export function AppDashboard() {
  const { activeTab, mode } = useTabStore();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const user = profile
    ? {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        sellerProfile: profile.sellerProfile
          ? { id: profile.sellerProfile.id }
          : null,
      }
    : null;

  const isSeller = mode === "seller" && profile?.sellerProfile;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppTopBar user={user} isLoading={profileLoading} />

      <main className="pt-4">
        {isSeller ? (
          <SellerTabs activeTab={activeTab} userId={profile?.id || ""} />
        ) : (
          <BuyerTabs activeTab={activeTab} userId={profile?.id || ""} />
        )}
      </main>

      <AppMobileNav currentTab={activeTab} />
    </div>
  );
}
