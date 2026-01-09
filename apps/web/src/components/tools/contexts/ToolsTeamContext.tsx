import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_full_access: boolean; // No permission records = full access
  permissions: {
    resource: string;
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }[];
}

interface ToolsTeamContextType {
  members: TeamMember[];
  isLoading: boolean;
  refreshMembers: () => Promise<void>;
  getMemberById: (id: string) => TeamMember | undefined;
}

const ToolsTeamContext = createContext<ToolsTeamContextType | undefined>(undefined);

export function ToolsTeamProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      // Get all admin users from user_roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setMembers([]);
        setIsLoading(false);
        return;
      }

      const adminUserIds = rolesData.map(r => r.user_id);

      // Get profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, username')
        .in('id', adminUserIds);

      if (profilesError) throw profilesError;

      // Get permissions for these users
      const { data: permissionsData, error: permError } = await (supabase
        .from('admin_permissions' as any)
        .select('*')
        .in('user_id', adminUserIds) as any);

      if (permError) throw permError;

      // Combine data
      const teamMembers: TeamMember[] = (profilesData || []).map(profile => {
        const userPermissions = (permissionsData || []).filter(
          (p: any) => p.user_id === profile.id
        );

        return {
          id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          username: profile.username,
          is_full_access: userPermissions.length === 0, // No restrictions = full access
          permissions: userPermissions.map((p: any) => ({
            resource: p.resource,
            can_view: p.can_view,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
          })),
        };
      });

      setMembers(teamMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const refreshMembers = async () => {
    await fetchMembers();
  };

  const getMemberById = (id: string) => {
    return members.find(m => m.id === id);
  };

  return (
    <ToolsTeamContext.Provider
      value={{
        members,
        isLoading,
        refreshMembers,
        getMemberById,
      }}
    >
      {children}
    </ToolsTeamContext.Provider>
  );
}

export function useToolsTeam() {
  const context = useContext(ToolsTeamContext);
  if (context === undefined) {
    throw new Error('useToolsTeam must be used within a ToolsTeamProvider');
  }
  return context;
}
