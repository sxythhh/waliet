import { useState } from "react";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { AdminTabs, AdminTabContent } from "@/components/admin/design-system/AdminTabs";
import { CommandCenter } from "@/components/admin/overview/CommandCenter";
import { ScheduledFunctionsTab } from "@/components/admin/ScheduledFunctionsTab";
import { PlatformHealthCard } from "@/components/admin/overview/PlatformHealthCard";
import { OperationsContent } from "@/components/admin/dashboard/OperationsContent";
import { Dashboard as DashboardIcon, Speed } from "@mui/icons-material";

const tabs = [
  { id: "overview", label: "Overview", icon: <DashboardIcon sx={{ fontSize: 16 }} /> },
  { id: "operations", label: "Operations", icon: <Speed sx={{ fontSize: 16 }} /> },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <AdminPermissionGuard resource="dashboard">
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="border-b border-border/50 px-6 py-4">
          <AdminTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="pills"
            size="sm"
          />
        </div>

        {/* Tab Content */}
        <AdminTabContent tabId="overview" activeTab={activeTab}>
          <CommandCenter />

          <div className="w-full p-4 md:p-6 pt-0">
            <div className="max-w-7xl mx-auto space-y-6">
              <PlatformHealthCard />
              <ScheduledFunctionsTab />
            </div>
          </div>
        </AdminTabContent>

        <AdminTabContent tabId="operations" activeTab={activeTab}>
          <OperationsContent />
        </AdminTabContent>
      </div>
    </AdminPermissionGuard>
  );
}
