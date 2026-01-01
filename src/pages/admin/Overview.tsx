import { CommandCenter } from "@/components/admin/overview/CommandCenter";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { ApiActivityTab } from "@/components/admin/ApiActivityTab";
import { ScheduledFunctionsTab } from "@/components/admin/ScheduledFunctionsTab";
import { PlatformIncomeChart } from "@/components/admin/PlatformIncomeChart";
import { FraudAnalyticsCard } from "@/components/admin/FraudAnalyticsCard";
import { AdminContentCalendar } from "@/components/admin/AdminContentCalendar";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";

export default function AdminOverview() {
  return (
    <AdminPermissionGuard resource="dashboard">
      {/* New Command Center */}
      <CommandCenter />

      {/* Additional Analytics Sections */}
      <div className="w-full p-4 md:p-6 pt-0">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Fraud Analytics Overview */}
          <FraudAnalyticsCard />

          {/* Content Calendar */}
          <AdminContentCalendar />

          {/* Platform Income Chart */}
          <PlatformIncomeChart />

          {/* Detailed Analytics */}
          <AnalyticsTab />

          {/* Scheduled Functions */}
          <ScheduledFunctionsTab />

          {/* API Activity */}
          <ApiActivityTab />
        </div>
      </div>
    </AdminPermissionGuard>
  );
}