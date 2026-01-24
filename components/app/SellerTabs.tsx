"use client";

import { useSellerDashboard } from "@/hooks/queries/use-seller-stats";
import { useSellerSessions } from "@/hooks/queries/use-sessions";
import { useProfile } from "@/hooks/queries/use-profile";
import { SellerDashboardTab } from "@/components/dashboard/SellerDashboardTab";
import { SessionsTab } from "@/components/dashboard/SessionsTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";

// Note: SellerEarningsTab and SellerAnalyticsTab would need similar treatment
// For now, we'll use placeholder components for the missing tabs

interface SellerTabsProps {
  activeTab: string;
  userId: string;
}

export function SellerTabs({ activeTab, userId }: SellerTabsProps) {
  // Fetch seller dashboard data
  const dashboard = useSellerDashboard();
  const sessions = useSellerSessions();
  const profile = useProfile();

  // Default stats for when data is loading
  const defaultStats = {
    totalEarnings: 0,
    pendingEarnings: 0,
    totalSessions: 0,
    pendingRequests: 0,
    averageRating: null,
    totalReviews: 0,
    hourlyRate: 0,
  };

  switch (activeTab) {
    case "dashboard":
      return (
        <SellerDashboardTab
          stats={dashboard.data?.stats ?? defaultStats}
          recentSessions={dashboard.data?.recentSessions ?? []}
          isLoading={dashboard.isLoading}
          standalone
        />
      );

    case "requests":
      return (
        <SessionsTab
          sessions={
            (sessions.data ?? []).filter((s) => s.status === "REQUESTED")
          }
          userId={userId}
          isLoading={sessions.isLoading}
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

    case "earnings":
      // Placeholder - would need SellerEarningsTab component
      return (
        <div className="p-4 sm:p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Earnings</h1>
            <p className="text-muted-foreground mt-1">
              Track your earnings and payouts
            </p>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            Earnings tracking coming soon
          </div>
        </div>
      );

    case "analytics":
      // Placeholder - would need SellerAnalyticsTab component
      return (
        <div className="p-4 sm:p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              View your performance metrics
            </p>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            Analytics coming soon
          </div>
        </div>
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
        <SellerDashboardTab
          stats={dashboard.data?.stats ?? defaultStats}
          recentSessions={dashboard.data?.recentSessions ?? []}
          isLoading={dashboard.isLoading}
          standalone
        />
      );
  }
}
