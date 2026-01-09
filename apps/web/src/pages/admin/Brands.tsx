import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BrandPipelineView } from "@/components/admin/BrandPipelineView";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPOGRAPHY, PADDING, BORDERS } from "@/components/admin/design-system";

export default function AdminBrands() {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  return (
    <AdminPermissionGuard resource="brands">
      <div className="h-full flex flex-col">
        {/* Page Header */}
        <div className={cn("border-b flex-shrink-0", BORDERS.default, PADDING.page)}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/40">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className={TYPOGRAPHY.pageTitle}>Brands</h1>
              <p className={cn(TYPOGRAPHY.caption, "mt-0.5")}>
                Pipeline view of all registered brands
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <BrandPipelineView />
        </div>
      </div>
    </AdminPermissionGuard>
  );
}