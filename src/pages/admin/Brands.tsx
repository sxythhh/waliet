import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { BrandPipelineView } from "@/components/admin/BrandPipelineView";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";

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
      <div className="w-full h-full p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Brand Pipeline</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage and track all brands across their lifecycle
              </p>
            </div>
            <CreateBrandDialog />
          </div>
          <BrandPipelineView />
        </div>
      </div>
    </AdminPermissionGuard>
  );
}