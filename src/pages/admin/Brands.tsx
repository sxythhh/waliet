import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { SalesTab } from "@/components/admin/SalesTab";

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
    <div className="w-full h-full p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Brands & Sales Pipeline</h1>
          <CreateBrandDialog />
        </div>
        <SalesTab />
      </div>
    </div>
  );
}