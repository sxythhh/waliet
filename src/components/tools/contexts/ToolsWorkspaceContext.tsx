import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// Single workspace ID - we use a fixed UUID for the shared workspace
const TOOLS_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const TOOLS_WORKSPACE_NAME = 'Virality Tools';

interface Workspace {
  id: string;
  name: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ToolsWorkspaceContextType {
  workspace: Workspace | null;
  isLoading: boolean;
  isReady: boolean;
}

const ToolsWorkspaceContext = createContext<ToolsWorkspaceContextType | undefined>(undefined);

export function ToolsWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const initializeWorkspace = useCallback(async () => {
    if (adminLoading) return;
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      // Try to fetch the single workspace
      const { data: existingWorkspace, error: fetchError } = await supabase
        .from('tools_workspaces')
        .select('*')
        .eq('id', TOOLS_WORKSPACE_ID)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingWorkspace) {
        setWorkspace(existingWorkspace);
      } else {
        // Create the single shared workspace
        const { data: newWorkspace, error: createError } = await supabase
          .from('tools_workspaces')
          .insert({
            id: TOOLS_WORKSPACE_ID,
            name: TOOLS_WORKSPACE_NAME,
          })
          .select()
          .single();

        if (createError) {
          // If insert fails due to conflict, fetch the existing one
          if (createError.code === '23505') {
            const { data: refetch } = await supabase
              .from('tools_workspaces')
              .select('*')
              .eq('id', TOOLS_WORKSPACE_ID)
              .single();
            setWorkspace(refetch);
          } else {
            throw createError;
          }
        } else {
          setWorkspace(newWorkspace);
        }
      }
    } catch (error) {
      console.error('Error initializing tools workspace:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, adminLoading]);

  useEffect(() => {
    initializeWorkspace();
  }, [initializeWorkspace]);

  return (
    <ToolsWorkspaceContext.Provider
      value={{
        workspace,
        isLoading,
        isReady: !isLoading && !!workspace,
      }}
    >
      {children}
    </ToolsWorkspaceContext.Provider>
  );
}

export function useToolsWorkspace() {
  const context = useContext(ToolsWorkspaceContext);
  if (context === undefined) {
    throw new Error('useToolsWorkspace must be used within a ToolsWorkspaceProvider');
  }
  // Return workspace as currentWorkspace for backwards compatibility
  return {
    currentWorkspace: context.workspace,
    isLoading: context.isLoading,
    isReady: context.isReady,
  };
}
