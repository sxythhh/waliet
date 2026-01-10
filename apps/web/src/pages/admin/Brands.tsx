import { useState, lazy, Suspense } from "react";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { AdminTabs, AdminTabContent } from "@/components/admin/design-system/AdminTabs";
import { PageLoading } from "@/components/ui/loading-bar";
import { BrandPipelineView } from "@/components/admin/BrandPipelineView";
import { BrandTableView } from "@/components/admin/BrandTableView";
import { Button } from "@/components/ui/button";
import {
  Storefront,
  Campaign,
  ViewKanban,
  TableRows,
} from "@mui/icons-material";

// Lazy load Campaigns content
const CampaignsContent = lazy(() => import("./Campaigns"));

const tabs = [
  { id: "brands", label: "Brands", icon: <Storefront sx={{ fontSize: 16 }} /> },
  { id: "campaigns", label: "Campaigns", icon: <Campaign sx={{ fontSize: 16 }} /> },
];

export default function AdminBrands() {
  const [activeTab, setActiveTab] = useState("brands");
  const [brandsView, setBrandsView] = useState<"pipeline" | "table">("pipeline");

  return (
    <AdminPermissionGuard resource="brands">
      <div className="flex flex-col">
        {/* Tabs & Controls */}
        <div className="border-b border-border/50 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <AdminTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="pills"
              size="sm"
            />
            {/* View Toggle - only show on brands tab */}
            {activeTab === "brands" && (
              <div className="flex items-center bg-muted/30 rounded-lg p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBrandsView("pipeline")}
                  className={`h-7 px-2.5 gap-1.5 font-inter tracking-[-0.5px] text-xs rounded-md ${
                    brandsView === "pipeline"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ViewKanban sx={{ fontSize: 14 }} />
                  Pipeline
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBrandsView("table")}
                  className={`h-7 px-2.5 gap-1.5 font-inter tracking-[-0.5px] text-xs rounded-md ${
                    brandsView === "table"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TableRows sx={{ fontSize: 14 }} />
                  Table
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          <AdminTabContent tabId="brands" activeTab={activeTab} keepMounted>
            <div className="p-6">
              {brandsView === "pipeline" ? <BrandPipelineView /> : <BrandTableView />}
            </div>
          </AdminTabContent>

          <AdminTabContent tabId="campaigns" activeTab={activeTab} keepMounted>
            <Suspense fallback={<PageLoading text="Loading campaigns..." />}>
              <CampaignsContent />
            </Suspense>
          </AdminTabContent>
        </div>
      </div>
    </AdminPermissionGuard>
  );
}
