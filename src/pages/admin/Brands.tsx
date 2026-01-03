import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
          <BrandPipelineView />
        </div>
      </div>
    </AdminPermissionGuard>
  );
}