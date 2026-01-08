import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Database row types
type AdminPermissionRow = Database["public"]["Tables"]["admin_permissions"]["Row"];
type AdminPermissionInsert = Database["public"]["Tables"]["admin_permissions"]["Insert"];

// Available admin resources
export const ADMIN_RESOURCES = [
  { id: "dashboard", name: "Dashboard", description: "Admin overview and analytics" },
  { id: "users", name: "Users", description: "Manage user accounts" },
  { id: "brands", name: "Brands", description: "Manage brand accounts" },
  { id: "creators", name: "Creators", description: "Manage creator accounts" },
  { id: "payouts", name: "Payouts", description: "Process and manage payouts" },
  { id: "security", name: "Security", description: "Security logs and IP bans" },
  { id: "resources", name: "Resources", description: "Templates, blog posts, courses" },
  { id: "permissions", name: "Permissions", description: "Manage admin permissions" },
  { id: "reports", name: "Reports", description: "View reports and disputes" },
  { id: "finance", name: "Finance", description: "Financial overview and transactions" },
  { id: "emails", name: "Emails", description: "Email broadcasts and templates" },
  { id: "tools", name: "Tools", description: "Internal productivity and team tools" },
] as const;

export type AdminResource = typeof ADMIN_RESOURCES[number]["id"];
export type AdminAction = "view" | "edit" | "delete";

export interface AdminPermission {
  id: string;
  user_id: string;
  resource: AdminResource;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  permissions: AdminPermission[];
}

export const useAdminPermissions = () => {
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Check if user is admin
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (roleError) throw roleError;

        const isUserAdmin = !!roleData;
        setIsAdmin(isUserAdmin);

        if (isUserAdmin) {
          // Fetch permissions
          const { data: permData, error: permError } = await supabase
            .from("admin_permissions")
            .select("*")
            .eq("user_id", user.id);

          if (!permError && permData) {
            // Map database rows to AdminPermission interface
            const mappedPermissions: AdminPermission[] = permData.map((row: AdminPermissionRow) => ({
              id: row.id,
              user_id: row.user_id,
              resource: row.resource as AdminResource,
              can_view: row.can_view ?? false,
              can_edit: row.can_edit ?? false,
              can_delete: row.can_delete ?? false,
            }));
            setPermissions(mappedPermissions);
          }
        }
      } catch (error: unknown) {
        console.error("Error fetching admin permissions:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  // Check if user has permission for a specific resource and action
  const hasPermission = useCallback((resource: AdminResource, action: AdminAction = "view"): boolean => {
    // Not an admin = no permission
    if (!isAdmin) return false;

    // Default-deny: If no specific permissions are set, deny access
    // All admins should have explicit permission records (created via migration)
    if (permissions.length === 0) return false;

    // Find the permission for this resource
    const permission = permissions.find(p => p.resource === resource);

    // If no permission record exists for this resource, deny access (restricted admin without this resource)
    if (!permission) return false;

    // Check the specific action
    switch (action) {
      case "view":
        return permission.can_view;
      case "edit":
        return permission.can_edit;
      case "delete":
        return permission.can_delete;
      default:
        return false;
    }
  }, [isAdmin, permissions]);

  // Check if user can access any admin resource (for sidebar visibility)
  const canAccessAdmin = useCallback((): boolean => {
    if (!isAdmin) return false;
    // Default-deny: No explicit permissions means no access
    // All admins should have explicit permission records (created via migration)
    if (permissions.length === 0) return false;
    // Has permissions = check if any resource has view access
    return permissions.some(p => p.can_view);
  }, [isAdmin, permissions]);

  return {
    permissions,
    isAdmin,
    loading,
    userId,
    hasPermission,
    canAccessAdmin,
  };
};

// Hook to manage permissions for all admin users (for the permissions page)
export const useManageAdminPermissions = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Use a ref to store adminUsers for stable searchUsers function
  const adminUsersRef = useRef<AdminUser[]>([]);

  const fetchAdminUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Get all admin users
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setAdminUsers([]);
        return;
      }

      const adminUserIds = rolesData.map(r => r.user_id);

      // Get user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .in("id", adminUserIds);

      if (profilesError) throw profilesError;

      // Get all permissions
      const { data: permissionsData, error: permError } = await supabase
        .from("admin_permissions")
        .select("*")
        .in("user_id", adminUserIds);

      if (permError) throw permError;

      // Map database rows to AdminPermission interface
      const mapRowToPermission = (row: AdminPermissionRow): AdminPermission => ({
        id: row.id,
        user_id: row.user_id,
        resource: row.resource as AdminResource,
        can_view: row.can_view ?? false,
        can_edit: row.can_edit ?? false,
        can_delete: row.can_delete ?? false,
      });

      // Combine data
      const users: AdminUser[] = (profilesData || []).map(profile => ({
        id: profile.id,
        email: profile.email || "",
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        permissions: (permissionsData || [])
          .filter((p: AdminPermissionRow) => p.user_id === profile.id)
          .map(mapRowToPermission),
      }));

      setAdminUsers(users);
      adminUsersRef.current = users;
    } catch (error: unknown) {
      console.error("Error fetching admin users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  const updatePermission = async (
    userId: string,
    resource: AdminResource,
    action: AdminAction,
    value: boolean
  ): Promise<boolean> => {
    setSaving(true);
    try {
      // Check if permission exists
      const { data: existing } = await supabase
        .from("admin_permissions")
        .select("id")
        .eq("user_id", userId)
        .eq("resource", resource)
        .maybeSingle();

      if (existing) {
        // Update existing
        const updateData: { can_view?: boolean; can_edit?: boolean; can_delete?: boolean } = {};
        if (action === "view") updateData.can_view = value;
        if (action === "edit") updateData.can_edit = value;
        if (action === "delete") updateData.can_delete = value;

        const { error } = await supabase
          .from("admin_permissions")
          .update(updateData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const insertData: AdminPermissionInsert = {
          user_id: userId,
          resource,
          can_view: action === "view" ? value : true,
          can_edit: action === "edit" ? value : false,
          can_delete: action === "delete" ? value : false,
        };

        const { error } = await supabase
          .from("admin_permissions")
          .insert(insertData);

        if (error) throw error;
      }

      // Refresh data
      await fetchAdminUsers();
      return true;
    } catch (error: unknown) {
      console.error("Error updating permission:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const grantFullAccess = async (userId: string): Promise<boolean> => {
    setSaving(true);
    try {
      // Create full-access permissions for all resources
      const permissions: AdminPermissionInsert[] = ADMIN_RESOURCES.map(resource => ({
        user_id: userId,
        resource: resource.id,
        can_view: true,
        can_edit: true,
        can_delete: true,
      }));

      // Delete existing permissions first
      await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", userId);

      // Insert full-access permissions
      const { error } = await supabase
        .from("admin_permissions")
        .insert(permissions);

      if (error) throw error;

      await fetchAdminUsers();
      return true;
    } catch (error: unknown) {
      console.error("Error granting full access:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setRestrictedAccess = async (userId: string): Promise<boolean> => {
    setSaving(true);
    try {
      // Create view-only permissions for all resources
      const permissions: AdminPermissionInsert[] = ADMIN_RESOURCES.map(resource => ({
        user_id: userId,
        resource: resource.id,
        can_view: true,
        can_edit: false,
        can_delete: false,
      }));

      // Delete existing permissions first
      await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", userId);

      // Insert new permissions
      const { error } = await supabase
        .from("admin_permissions")
        .insert(permissions);

      if (error) throw error;

      await fetchAdminUsers();
      return true;
    } catch (error: unknown) {
      console.error("Error setting restricted access:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Add a new admin user
  const addAdmin = async (userId: string, accessLevel: 'full' | 'restricted' = 'restricted'): Promise<boolean> => {
    setSaving(true);
    try {
      // Check if already an admin
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (existing) {
        // Already an admin
        return false;
      }

      // Add admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (roleError) throw roleError;

      // If restricted access, set view-only permissions for all resources
      if (accessLevel === 'restricted') {
        const permissions: AdminPermissionInsert[] = ADMIN_RESOURCES.map(resource => ({
          user_id: userId,
          resource: resource.id,
          can_view: true,
          can_edit: false,
          can_delete: false,
        }));

        await supabase
          .from("admin_permissions")
          .insert(permissions);
      }
      // For 'full' access, we don't add any permissions (no restrictions)

      await fetchAdminUsers();
      return true;
    } catch (error: unknown) {
      console.error("Error adding admin:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Remove admin user
  const removeAdmin = async (userId: string): Promise<boolean> => {
    setSaving(true);
    try {
      // Delete admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (roleError) throw roleError;

      // Delete all permissions for this user
      await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", userId);

      await fetchAdminUsers();
      return true;
    } catch (error: unknown) {
      console.error("Error removing admin:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Search users by email or username (wrapped in useCallback for stable reference)
  const searchUsers = useCallback(async (query: string): Promise<Array<{ id: string; email: string; full_name: string | null; avatar_url: string | null; username: string | null }>> => {
    if (!query || query.length < 2) return [];

    try {
      // Sanitize query to prevent SQL injection via special LIKE characters
      const sanitizedQuery = query.replace(/[%_\\]/g, '\\$&');

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, username")
        .or(`email.ilike.%${sanitizedQuery}%,username.ilike.%${sanitizedQuery}%,full_name.ilike.%${sanitizedQuery}%`)
        .limit(10);

      if (error) throw error;

      // Filter out existing admins using ref (to avoid re-creating this function when adminUsers changes)
      const adminIds = adminUsersRef.current.map(u => u.id);
      return (data || []).filter(u => !adminIds.includes(u.id));
    } catch (error: unknown) {
      console.error("Error searching users:", error);
      return [];
    }
  }, []);

  return {
    adminUsers,
    loading,
    saving,
    updatePermission,
    grantFullAccess,
    setRestrictedAccess,
    addAdmin,
    removeAdmin,
    searchUsers,
    refreshUsers: fetchAdminUsers,
  };
};
