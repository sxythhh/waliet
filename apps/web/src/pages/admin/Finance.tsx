import { lazy, Suspense } from "react";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { PageLoading } from "@/components/ui/loading-bar";

// Lazy load the content component
const FinanceOverviewContent = lazy(() => import("@/components/admin/finance/FinanceOverviewContent"));

export default function AdminFinance() {
  return (
    <AdminPermissionGuard resource="finance">
      <div className="flex flex-col">
        {/* Content */}
        <div className="flex-1">
          <Suspense fallback={<PageLoading text="Loading finance..." />}>
            <FinanceOverviewContent />
          </Suspense>
        </div>
      </div>
    </AdminPermissionGuard>
  );
}
