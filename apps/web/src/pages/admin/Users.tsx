import { useState, lazy, Suspense } from "react";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { AdminTabs, AdminTabContent } from "@/components/admin/design-system/AdminTabs";
import { PageLoading } from "@/components/ui/loading-bar";
import {
  People,
  AdminPanelSettings,
} from "@mui/icons-material";

// Lazy load the content components
const UsersContent = lazy(() => import("@/components/admin/users/UsersContent"));
const PermissionsContent = lazy(() => import("./Permissions"));

const tabs = [
  { id: "users", label: "Users", icon: <People sx={{ fontSize: 16 }} /> },
  { id: "permissions", label: "Permissions", icon: <AdminPanelSettings sx={{ fontSize: 16 }} /> },
];

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <AdminPermissionGuard resource="users">
      <div className="flex flex-col">
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
        <div className="flex-1">
          <AdminTabContent tabId="users" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading users..." />}>
              <UsersContent />
            </Suspense>
          </AdminTabContent>

          <AdminTabContent tabId="permissions" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading permissions..." />}>
              <PermissionsContent />
            </Suspense>
          </AdminTabContent>
        </div>
      </div>
    </AdminPermissionGuard>
  );
}
