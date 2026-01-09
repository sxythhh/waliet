import { useState, useEffect, useCallback } from "react";
import { Shield, Check, X, Loader2, UserCog, Crown, Lock, UserPlus, Search, Trash2 } from "lucide-react";
import { PageLoading, LoadingState } from "@/components/ui/loading-bar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  onRemove,
  saving,
}: {
  user: AdminUser;
  onPermissionToggle: (userId: string, resource: AdminResource, action: AdminAction, value: boolean) => void;
  onGrantFullAccess: (userId: string) => void;
  onSetRestricted: (userId: string) => void;
  onRemove: (userId: string) => void;
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

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(user.id)}
                  disabled={saving}
                  className="h-8 px-3 text-xs gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove admin access</p>
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
  return <PageLoading text="Loading permissions..." />;
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

// Search result type
interface SearchResult {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
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
    addAdmin,
    removeAdmin,
    searchUsers,
  } = useManageAdminPermissions();

  // Add admin dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [accessLevel, setAccessLevel] = useState<"full" | "restricted">("restricted");

  // Remove confirmation dialog state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<AdminUser | null>(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

  const handleAddAdmin = async () => {
    if (!selectedUser) return;

    const success = await addAdmin(selectedUser.id, accessLevel);
    if (success) {
      toast({
        title: "Admin added",
        description: `${selectedUser.full_name || selectedUser.email} has been added as an admin with ${accessLevel === "full" ? "full" : "restricted"} access.`,
      });
      setAddDialogOpen(false);
      setSelectedUser(null);
      setSearchQuery("");
      setAccessLevel("restricted");
    } else {
      toast({
        title: "Error",
        description: "Failed to add admin. User may already be an admin.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdmin = async () => {
    if (!userToRemove) return;

    const success = await removeAdmin(userToRemove.id);
    if (success) {
      toast({
        title: "Admin removed",
        description: `${userToRemove.full_name || userToRemove.email} is no longer an admin.`,
      });
      setRemoveDialogOpen(false);
      setUserToRemove(null);
    } else {
      toast({
        title: "Error",
        description: "Failed to remove admin. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  const handleRemoveClick = (user: AdminUser) => {
    setUserToRemove(user);
    setRemoveDialogOpen(true);
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
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            <UserPlus className="h-4 w-4" />
            Add Admin
          </Button>
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
                onRemove={handleRemoveClick}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Admin Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>
              Search for a user by email or username to grant admin access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label>Search User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter email or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Search Results */}
            {searching ? (
              <div className="py-4">
                <LoadingState size="sm" text="Searching..." />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                      selectedUser?.id === user.id
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || user.username || "Unnamed"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    {selectedUser?.id === user.id && (
                      <Check className="h-4 w-4 text-violet-500" />
                    )}
                  </button>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found
              </p>
            ) : null}

            {/* Access Level Selection */}
            {selectedUser && (
              <div className="space-y-3 pt-2 border-t">
                <Label>Initial Access Level</Label>
                <RadioGroup
                  value={accessLevel}
                  onValueChange={(v) => setAccessLevel(v as "full" | "restricted")}
                  className="space-y-2"
                >
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-border/80">
                    <RadioGroupItem value="restricted" id="restricted" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="restricted" className="text-sm font-medium cursor-pointer">
                        View Only (Recommended)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Can view all admin sections but cannot make changes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-border/80">
                    <RadioGroupItem value="full" id="full" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="full" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                        Full Access
                        <Crown className="h-3 w-3 text-amber-500" />
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Unrestricted access to all admin functions
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAddDialogOpen(false);
                  setSelectedUser(null);
                  setSearchQuery("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddAdmin}
                disabled={!selectedUser || saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Add Admin
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove admin access for{" "}
              <span className="font-medium text-foreground">
                {userToRemove?.full_name || userToRemove?.email}
              </span>
              ? They will no longer be able to access the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAdmin}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
