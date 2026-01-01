import { useState } from "react";
import { Shield, Check, X, Loader2, UserCog, Crown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useManageAdminPermissions,
  ADMIN_RESOURCES,
  type AdminResource,
  type AdminAction,
  type AdminUser,
} from "@/hooks/useAdminPermissions";

// Permission cell component
function PermissionCell({
  userId,
  resource,
  action,
  enabled,
  onToggle,
  saving,
}: {
  userId: string;
  resource: AdminResource;
  action: AdminAction;
  enabled: boolean;
  onToggle: (userId: string, resource: AdminResource, action: AdminAction, value: boolean) => void;
  saving: boolean;
}) {
  const handleClick = () => {
    if (!saving) {
      onToggle(userId, resource, action, !enabled);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
        enabled
          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
          : "bg-white/[0.03] text-white/20 hover:bg-white/[0.06] hover:text-white/40",
        saving && "opacity-50 cursor-not-allowed"
      )}
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : enabled ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// User row component
function UserRow({
  user,
  onPermissionToggle,
  onGrantFullAccess,
  onSetRestricted,
  saving,
}: {
  user: AdminUser;
  onPermissionToggle: (userId: string, resource: AdminResource, action: AdminAction, value: boolean) => void;
  onGrantFullAccess: (userId: string) => void;
  onSetRestricted: (userId: string) => void;
  saving: boolean;
}) {
  const hasFullAccess = user.permissions.length === 0;

  const getPermissionValue = (resource: AdminResource, action: AdminAction): boolean => {
    if (hasFullAccess) return true;
    const perm = user.permissions.find((p) => p.resource === resource);
    if (!perm) return false;
    switch (action) {
      case "view":
        return perm.can_view;
      case "edit":
        return perm.can_edit;
      case "delete":
        return perm.can_delete;
      default:
        return false;
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* User Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-white/[0.06] text-white/60 text-sm">
              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {user.full_name || "Unnamed Admin"}
              </span>
              {hasFullAccess && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1">
                  <Crown className="h-2.5 w-2.5" />
                  Full Access
                </span>
              )}
            </div>
            <span className="text-xs text-white/40">{user.email}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onGrantFullAccess(user.id)}
                  disabled={saving || hasFullAccess}
                  className={cn(
                    "h-8 px-3 text-xs gap-1.5",
                    hasFullAccess
                      ? "text-white/20 cursor-not-allowed"
                      : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  )}
                >
                  <Crown className="h-3.5 w-3.5" />
                  Full Access
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove all restrictions (full admin access)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetRestricted(user.id)}
                  disabled={saving}
                  className="h-8 px-3 text-xs gap-1.5 text-white/60 hover:text-white hover:bg-white/[0.06]"
                >
                  <Lock className="h-3.5 w-3.5" />
                  View Only
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Set to view-only access for all resources</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-xs font-medium text-white/40 px-4 py-3 w-48">
                Resource
              </th>
              <th className="text-center text-xs font-medium text-white/40 px-2 py-3 w-20">
                View
              </th>
              <th className="text-center text-xs font-medium text-white/40 px-2 py-3 w-20">
                Edit
              </th>
              <th className="text-center text-xs font-medium text-white/40 px-2 py-3 w-20">
                Delete
              </th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_RESOURCES.map((resource) => (
              <tr
                key={resource.id}
                className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <div>
                    <span className="text-sm text-white">{resource.name}</span>
                    <p className="text-xs text-white/30">{resource.description}</p>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex justify-center">
                    <PermissionCell
                      userId={user.id}
                      resource={resource.id}
                      action="view"
                      enabled={getPermissionValue(resource.id, "view")}
                      onToggle={onPermissionToggle}
                      saving={saving}
                    />
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex justify-center">
                    <PermissionCell
                      userId={user.id}
                      resource={resource.id}
                      action="edit"
                      enabled={getPermissionValue(resource.id, "edit")}
                      onToggle={onPermissionToggle}
                      saving={saving}
                    />
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex justify-center">
                    <PermissionCell
                      userId={user.id}
                      resource={resource.id}
                      action="delete"
                      enabled={getPermissionValue(resource.id, "delete")}
                      onToggle={onPermissionToggle}
                      saving={saving}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Loading spinner
function PermissionsLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-white/40" />
    </div>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-4">
        <UserCog className="h-8 w-8 text-violet-400" />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">No Admin Users</h3>
      <p className="text-sm text-white/40 max-w-sm">
        There are no admin users to manage permissions for. Add users to the admin
        role first.
      </p>
    </div>
  );
}

export default function PermissionsPage() {
  const { toast } = useToast();
  const {
    adminUsers,
    loading,
    saving,
    updatePermission,
    grantFullAccess,
    setRestrictedAccess,
  } = useManageAdminPermissions();

  const handlePermissionToggle = async (
    userId: string,
    resource: AdminResource,
    action: AdminAction,
    value: boolean
  ) => {
    const success = await updatePermission(userId, resource, action, value);
    if (success) {
      toast({
        title: "Permission updated",
        description: `${action} permission for ${resource} has been ${value ? "granted" : "revoked"}.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update permission. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGrantFullAccess = async (userId: string) => {
    const user = adminUsers.find((u) => u.id === userId);
    const success = await grantFullAccess(userId);
    if (success) {
      toast({
        title: "Full access granted",
        description: `${user?.full_name || user?.email || "User"} now has unrestricted admin access.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to grant full access. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetRestricted = async (userId: string) => {
    const user = adminUsers.find((u) => u.id === userId);
    const success = await setRestrictedAccess(userId);
    if (success) {
      toast({
        title: "Access restricted",
        description: `${user?.full_name || user?.email || "User"} now has view-only access to all resources.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to set restricted access. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full h-full p-4 md:p-6 pt-16 md:pt-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold font-inter tracking-[-0.5px] text-white">
                Permissions
              </h1>
            </div>
            <p className="text-sm text-white/40 font-inter tracking-[-0.5px] mt-2 ml-[52px]">
              Manage granular access controls for admin users
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
              <Check className="h-3 w-3 text-emerald-400" />
            </div>
            <span className="text-xs text-white/60">Allowed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/[0.03] flex items-center justify-center">
              <X className="h-3 w-3 text-white/20" />
            </div>
            <span className="text-xs text-white/60">Denied</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1">
              <Crown className="h-2.5 w-2.5" />
              Full Access
            </span>
            <span className="text-xs text-white/60">No restrictions</span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <PermissionsLoader />
        ) : adminUsers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {adminUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onPermissionToggle={handlePermissionToggle}
                onGrantFullAccess={handleGrantFullAccess}
                onSetRestricted={handleSetRestricted}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
