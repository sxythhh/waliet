import { CommandCenter } from "@/components/admin/overview/CommandCenter";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { ScheduledFunctionsTab } from "@/components/admin/ScheduledFunctionsTab";
import { PlatformHealthCard } from "@/components/admin/overview/PlatformHealthCard";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";

export default function AdminOverview() {
  return (
    <AdminPermissionGuard resource="dashboard">
      {/* Command Center with Live Activity + Quick Actions + Fraud Analytics */}
      <CommandCenter />

      {/* Additional Analytics Sections */}
      <div className="w-full p-4 md:p-6 pt-0">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Platform Health & Database Metrics */}
          <PlatformHealthCard />

          {/* Detailed Analytics */}
          <AnalyticsTab />

          {/* Scheduled Functions */}
          <ScheduledFunctionsTab />
        </div>
      </div>
    </AdminPermissionGuard>
  );
}