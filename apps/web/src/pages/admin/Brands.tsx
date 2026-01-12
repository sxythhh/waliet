import { useState, lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { AdminTabs, AdminTabContent } from "@/components/admin/design-system/AdminTabs";
import { PageLoading } from "@/components/ui/loading-bar";
import { BrandPipelineView } from "@/components/admin/BrandPipelineView";
import { BrandTableView } from "@/components/admin/BrandTableView";
import { BrandFilters } from "@/components/admin/brands/BrandFilters";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBrandsWithCRM } from "@/hooks/useBrandsWithCRM";
import { useCloseLeadStatusesCached } from "@/hooks/useCloseBrand";
import { useBrandFiltersURL } from "@/hooks/useBrandFiltersURL";
import { useFilteredBrands } from "@/hooks/useFilteredBrands";
import {
  Storefront,
  Campaign,
  ViewKanban,
  TableRows,
  Sync,
} from "@mui/icons-material";

// Lazy load Campaigns content
const CampaignsContent = lazy(() => import("./Campaigns"));

const tabs = [
  { id: "brands", label: "Brands", icon: <Storefront sx={{ fontSize: 16 }} /> },
  { id: "campaigns", label: "Campaigns", icon: <Campaign sx={{ fontSize: 16 }} /> },
];

export default function AdminBrands() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("brands");
  const [brandsView, setBrandsView] = useState<"pipeline" | "table">("pipeline");
  const [isSyncing, setIsSyncing] = useState(false);

  // Data fetching
  const { data: brands = [], isLoading: brandsLoading } = useBrandsWithCRM();
  const { data: closeStatuses = [] } = useCloseLeadStatusesCached();

  // Filter state from URL
  const { filters, setFilters, clearFilters, activeFilterCount } = useBrandFiltersURL();

  // Apply filters to brands
  const filteredBrands = useFilteredBrands(brands, filters);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("close-scheduled-sync", {
        body: { action: "full_sync" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Sync failed");

      const { created, updated, failed } = data;
      toast.success("Close sync complete", {
        description: `${created} created, ${updated} updated${failed > 0 ? `, ${failed} failed` : ""}`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["brands-with-crm"] });
      queryClient.invalidateQueries({ queryKey: ["close-lead-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["close-lead-statuses-cached"] });
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "Failed to sync with Close",
      });
    } finally {
      setIsSyncing(false);
    }
  };

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
            {/* View Toggle & Actions - only show on brands tab */}
            {activeTab === "brands" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="h-7 px-2.5 gap-1.5 font-inter tracking-[-0.5px] text-xs"
                >
                  <Sync
                    sx={{ fontSize: 14 }}
                    className={isSyncing ? "animate-spin" : ""}
                  />
                  {isSyncing ? "Syncing..." : "Sync All"}
                </Button>
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
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar - only show on brands tab */}
        {activeTab === "brands" && (
          <BrandFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClear={clearFilters}
            closeStatuses={closeStatuses}
            activeFilterCount={activeFilterCount}
          />
        )}

        {/* Tab Content */}
        <div className="flex-1">
          <AdminTabContent tabId="brands" activeTab={activeTab} keepMounted>
            <div className="p-6">
              {brandsView === "pipeline" ? (
                <BrandPipelineView brands={filteredBrands} isLoading={brandsLoading} />
              ) : (
                <BrandTableView brands={filteredBrands} isLoading={brandsLoading} />
              )}
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
