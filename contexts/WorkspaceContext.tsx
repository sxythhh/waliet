import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface WorkspaceContextType {
  currentWorkspace: "creator" | string; // "creator" or brand slug
  currentBrand: Brand | null;
  setWorkspace: (workspace: "creator" | string) => void;
  isCreatorMode: boolean;
  isBrandMode: boolean;
  refreshBrands: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const workspaceParam = searchParams.get("workspace") || "creator";
  const currentWorkspace = workspaceParam;
  const isCreatorMode = currentWorkspace === "creator";
  const isBrandMode = !isCreatorMode;
  const isDemoMode = searchParams.get("demo") === "active";

  useEffect(() => {
    // In demo mode, use mock brand data
    if (isDemoMode && isBrandMode) {
      setCurrentBrand({
        id: "demo-brand-id",
        name: "Acme Corp",
        slug: "demo-brand",
        logo_url: null,
      });
      return;
    }

    if (isBrandMode && currentWorkspace) {
      fetchBrandBySlug(currentWorkspace);
    } else {
      setCurrentBrand(null);
    }
  }, [currentWorkspace, isBrandMode, refreshTrigger, isDemoMode]);

  const fetchBrandBySlug = async (slug: string) => {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, slug, logo_url")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) {
      setCurrentBrand(data);
    } else if (!data && slug !== "creator") {
      // Brand slug not found - show toast and reset to creator mode
      toast.error("Brand not found", {
        description: `The workspace "${slug}" doesn't exist or you don't have access.`
      });
      setCurrentBrand(null);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("workspace");
      newParams.set("tab", "campaigns");
      setSearchParams(newParams);
    }
  };

  const setWorkspace = (workspace: "creator" | string) => {
    const newParams = new URLSearchParams(searchParams);
    if (workspace === "creator") {
      newParams.delete("workspace");
      newParams.set("tab", "campaigns");
    } else {
      newParams.set("workspace", workspace);
      newParams.set("tab", "campaigns");
    }
    setSearchParams(newParams);
  };

  const refreshBrands = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <WorkspaceContext.Provider value={{ 
      currentWorkspace, 
      currentBrand, 
      setWorkspace,
      isCreatorMode,
      isBrandMode,
      refreshBrands
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
