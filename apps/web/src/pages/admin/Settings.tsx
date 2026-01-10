import { useState, lazy, Suspense } from "react";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { AdminTabs, AdminTabContent } from "@/components/admin/design-system/AdminTabs";
import { PageLoading } from "@/components/ui/loading-bar";
import {
  CalendarMonth,
  Article,
  Email,
  Assessment,
  Receipt,
  School,
  Share,
} from "@mui/icons-material";

// Lazy load each settings sub-section
const CalendarContent = lazy(() => import("./Calendar"));
const ResourcesContent = lazy(() => import("./Resources"));
const EmailsContent = lazy(() => import("./Emails"));
const ReportsContent = lazy(() => import("./Reports"));
const TaxFormsContent = lazy(() => import("./TaxForms"));
const TrainingDataContent = lazy(() => import("./TrainingData"));
const ReferralsContent = lazy(() => import("./Referrals"));

const tabs = [
  { id: "calendar", label: "Calendar", icon: <CalendarMonth sx={{ fontSize: 16 }} /> },
  { id: "resources", label: "Resources", icon: <Article sx={{ fontSize: 16 }} /> },
  { id: "emails", label: "Emails", icon: <Email sx={{ fontSize: 16 }} /> },
  { id: "reports", label: "Reports", icon: <Assessment sx={{ fontSize: 16 }} /> },
  { id: "tax", label: "Tax", icon: <Receipt sx={{ fontSize: 16 }} /> },
  { id: "training", label: "Training", icon: <School sx={{ fontSize: 16 }} /> },
  { id: "referrals", label: "Referrals", icon: <Share sx={{ fontSize: 16 }} /> },
];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("calendar");

  return (
    <AdminPermissionGuard resource="resources">
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
          <AdminTabContent tabId="calendar" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading calendar..." />}>
              <div className="h-full overflow-auto">
                <CalendarContent />
              </div>
            </Suspense>
          </AdminTabContent>

          <AdminTabContent tabId="resources" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading resources..." />}>
              <div className="h-full overflow-auto">
                <ResourcesContent />
              </div>
            </Suspense>
          </AdminTabContent>

          <AdminTabContent tabId="emails" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading emails..." />}>
              <div className="h-full overflow-auto">
                <EmailsContent />
              </div>
            </Suspense>
          </AdminTabContent>

          <AdminTabContent tabId="reports" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading reports..." />}>
              <div className="h-full overflow-auto">
                <ReportsContent />
              </div>
            </Suspense>
          </AdminTabContent>

          <AdminTabContent tabId="tax" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading tax forms..." />}>
              <div className="h-full overflow-auto">
                <TaxFormsContent />
              </div>
            </Suspense>
          </AdminTabContent>

          <AdminTabContent tabId="training" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading training data..." />}>
              <div className="h-full overflow-auto">
                <TrainingDataContent />
              </div>
            </Suspense>
          </AdminTabContent>

          <AdminTabContent tabId="referrals" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading referrals..." />}>
              <div className="h-full overflow-auto">
                <ReferralsContent />
              </div>
            </Suspense>
          </AdminTabContent>
        </div>
      </div>
    </AdminPermissionGuard>
  );
}
