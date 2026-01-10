import { useState, lazy, Suspense } from "react";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { AdminTabs, AdminTabContent } from "@/components/admin/design-system/AdminTabs";
import { PageLoading } from "@/components/ui/loading-bar";
import { FraudDashboard } from "@/components/admin/security/FraudDashboard";
import { AuditLog } from "@/components/admin/security/AuditLog";
import { FraudReviewQueue } from "@/components/admin/FraudReviewQueue";
import {
  Security,
  FactCheck,
  History,
  Speed,
} from "@mui/icons-material";

// Lazy load System Health content
const SystemHealthContent = lazy(() => import("./SystemHealth"));

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: <Security sx={{ fontSize: 16 }} /> },
  { id: "review", label: "Fraud Review", icon: <FactCheck sx={{ fontSize: 16 }} /> },
  { id: "audit", label: "Audit Log", icon: <History sx={{ fontSize: 16 }} /> },
  { id: "health", label: "System Health", icon: <Speed sx={{ fontSize: 16 }} /> },
];

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <AdminPermissionGuard resource="security">
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
        <div className="flex-1 overflow-hidden">
          <AdminTabContent tabId="dashboard" activeTab={activeTab} keepMounted>
            <div className="h-full overflow-auto p-6">
              <FraudDashboard />
            </div>
          </AdminTabContent>

          <AdminTabContent tabId="review" activeTab={activeTab} keepMounted>
            <div className="h-full overflow-auto p-6">
              <FraudReviewQueue />
            </div>
          </AdminTabContent>

          <AdminTabContent tabId="audit" activeTab={activeTab} keepMounted>
            <div className="h-full overflow-auto p-6">
              <AuditLog />
            </div>
          </AdminTabContent>

          <AdminTabContent tabId="health" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading system health..." />}>
              <div className="h-full overflow-auto">
                <SystemHealthContent />
              </div>
            </Suspense>
          </AdminTabContent>
        </div>
      </div>
    </AdminPermissionGuard>
  );
}
