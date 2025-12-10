import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  
  const workspaceParam = searchParams.get("workspace") || "creator";
  const currentWorkspace = workspaceParam;
  const isCreatorMode = currentWorkspace === "creator";
  const isBrandMode = !isCreatorMode;

  useEffect(() => {
    if (isBrandMode && currentWorkspace) {
      fetchBrandBySlug(currentWorkspace);
    } else {
      setCurrentBrand(null);
    }
  }, [currentWorkspace, isBrandMode]);

  const fetchBrandBySlug = async (slug: string) => {
    const { data } = await supabase
      .from("brands")
      .select("id, name, slug, logo_url")
      .eq("slug", slug)
      .single();
    
    if (data) {
      setCurrentBrand(data);
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

  return (
    <WorkspaceContext.Provider value={{ 
      currentWorkspace, 
      currentBrand, 
      setWorkspace,
      isCreatorMode,
      isBrandMode
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
