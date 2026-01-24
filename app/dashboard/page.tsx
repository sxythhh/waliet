"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
// Creator tabs
import { HomeTab } from "@/components/dashboard-new/HomeTab";
import { DiscoverTab } from "@/components/dashboard-new/DiscoverTab";
import { ProfileTab } from "@/components/dashboard-new/ProfileTab";
import { WalletTab } from "@/components/dashboard-new/WalletTab";
import { SettingsTab } from "@/components/dashboard-new/SettingsTab";
import { AdminTab } from "@/components/dashboard-new/AdminTab";
// Brand/Workspace tabs
import { BrandHomeTab } from "@/components/workspace/BrandHomeTab";
import { BrandCampaignsTab } from "@/components/workspace/BrandCampaignsTab";
import { BlueprintsTab } from "@/components/workspace/BlueprintsTab";
import { CreatorsTab } from "@/components/workspace/CreatorsTab";
import { BrandSettingsTab } from "@/components/workspace/BrandSettingsTab";

// Tab configurations
const CREATOR_TABS = ["home", "discover", "profile", "wallet", "settings", "admin"];
const BRAND_TABS = ["home", "campaigns", "blueprints", "creators", "settings"];

function DashboardContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") || "home";
  const workspace = searchParams.get("workspace") || "personal";

  // Determine mode
  const isPersonalMode = workspace === "personal";
  const isBrandMode = !isPersonalMode;

  // Validate tab based on mode
  const validTabs = isPersonalMode ? CREATOR_TABS : BRAND_TABS;
  const currentTab = validTabs.includes(rawTab) ? rawTab : "home";

  const renderContent = () => {
    // Brand/Workspace mode
    if (isBrandMode) {
      switch (currentTab) {
        case "home":
          return <BrandHomeTab workspaceSlug={workspace} />;
        case "campaigns":
          return <BrandCampaignsTab workspaceSlug={workspace} />;
        case "blueprints":
          return <BlueprintsTab workspaceSlug={workspace} />;
        case "creators":
          return <CreatorsTab workspaceSlug={workspace} />;
        case "settings":
          return <BrandSettingsTab workspaceSlug={workspace} />;
        default:
          return <BrandHomeTab workspaceSlug={workspace} />;
      }
    }

    // Personal/Creator mode
    switch (currentTab) {
      case "home":
        return <HomeTab />;
      case "discover":
        return <DiscoverTab />;
      case "profile":
        return <ProfileTab />;
      case "wallet":
        return <WalletTab />;
      case "settings":
        return <SettingsTab />;
      case "admin":
        return <AdminTab />;
      default:
        return <HomeTab />;
    }
  };

  return <>{renderContent()}</>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-48 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
