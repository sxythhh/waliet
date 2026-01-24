import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2, Link2, Copy, Check, Plus, MoreHorizontal } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { formatDistanceToNow } from "date-fns";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
}
interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  is_link_invite?: boolean;
}

interface LinkInvite {
  id: string;
  role: string;
  invite_token: string;
  created_at: string;
  expires_at: string;
}

interface TeamMembersTabProps {
  brandId: string;
  brandSlug: string;
}

export function TeamMembersTab({
  brandId,
  brandSlug
}: TeamMembersTabProps) {
  const { isAdmin } = useAdminCheck();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [linkInvites, setLinkInvites] = useState<LinkInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "invites">("members");
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "member" | "link" | "invitation" | null;
    id: string;
    name?: string;
  }>({ type: null, id: "" });

  useEffect(() => {
    if (brandId) {
      fetchTeamData();
    }
  }, [brandId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);

      // Get current user's role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: memberData } = await supabase
          .from("business_members")
          .select("role")
          .eq("business_id", brandId)
          .eq("user_id", user.id)
          .maybeSingle();
        setCurrentUserRole(memberData?.role || null);
      }

      // Fetch brand members
      const { data: membersData, error: membersError } = await supabase
        .from("business_members")
        .select("id, user_id, role, created_at")
        .eq("business_id", brandId);
      if (membersError) throw membersError;

      // Fetch all profiles in one query
      const userIds = (membersData || []).map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      // Map profiles to members
      const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
      const membersWithProfiles = (membersData || []).map(member => ({
        ...member,
        profiles: {
          full_name: profileMap.get(member.user_id)?.full_name || "Unknown",
          email: profileMap.get(member.user_id)?.email || "Unknown",
          avatar_url: profileMap.get(member.user_id)?.avatar_url || null
        }
      }));
      setMembers(membersWithProfiles);

      // Note: brand_invitations table not yet implemented in new schema
      // Set empty arrays for now - invitation feature to be added later
      setInvitations([]);
      setLinkInvites([]);
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    const { type, id } = confirmDialog;
    if (!type || !id) return;

    try {
      if (type === "member") {
        const { error } = await supabase.from("business_members").delete().eq("id", id);
        if (error) throw error;
        toast.success("Member removed successfully");
      } else if (type === "link" || type === "invitation") {
        // Invitations not yet implemented in new schema
        toast.info("Invitation management coming soon");
        return;
      }
      fetchTeamData();
    } catch (error) {
      console.error(`Error handling ${type}:`, error);
      toast.error(`Failed to ${type === "member" ? "remove member" : type === "link" ? "revoke link" : "cancel invitation"}`);
    } finally {
      setConfirmDialog({ type: null, id: "" });
    }
  };

  const generateNewLink = async () => {
    if (!currentUserId) return;

    try {
      setGeneratingLink(true);
      const token = crypto.randomUUID();

      const { error } = await supabase.from("brand_invitations").insert({
        brand_id: brandId,
        role: "member",
        invited_by: currentUserId,
        invite_token: token,
        is_link_invite: true,
        email: `invite-${token}@placeholder.local`,
      } as any);

      if (error) throw error;

      fetchTeamData();
      toast.success("Invite link generated!");
    } catch (error) {
      console.error("Error generating invite link:", error);
      toast.error("Failed to generate invite link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = async (invite: LinkInvite) => {
    const url = `${window.location.origin}/brand/${brandSlug}/join/${invite.invite_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(invite.id);
      toast.success("Link copied!");
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const getInviteUrl = (token: string) => {
    return `${window.location.origin}/brand/${brandSlug}/join/${token}`;
  };

  const canManageTeam = isAdmin || currentUserRole === "owner" || currentUserRole === "admin";

  // Calculate stats
  const ownersAndAdmins = members.filter(m => m.role === "owner" || m.role === "admin").length;
  const supportMembers = members.filter(m => m.role === "support").length;
  const viewerMembers = members.filter(m => m.role === "member" || m.role === "viewer").length;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner": return "Owner";
      case "admin": return "Admin";
      case "support": return "Support";
      default: return "Member";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 bg-muted/50 rounded animate-pulse" />
            <div className="h-4 w-56 bg-muted/30 rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-24 bg-muted/50 rounded-lg animate-pulse" />
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-center">
          <div className="h-10 w-64 bg-muted/30 rounded-full animate-pulse" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center py-4">
                <div className="h-8 w-8 bg-muted/50 rounded mx-auto animate-pulse" />
                <div className="h-4 w-24 bg-muted/30 rounded mx-auto mt-2 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Members</h2>
          <p className="text-muted-foreground mt-1">
            Manage your team and their roles.
          </p>
        </div>
        {canManageTeam && (
          <Button
            onClick={() => setInviteDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2"
          >
            <Plus className="h-4 w-4" />
            Invite
          </Button>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-border" />

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full border border-border bg-muted/30 p-1">
          <button
            onClick={() => setActiveTab("members")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-colors tracking-[-0.5px]",
              activeTab === "members"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Active members
          </button>
          <button
            onClick={() => setActiveTab("invites")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-colors tracking-[-0.5px]",
              activeTab === "invites"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Pending invites
          </button>
        </div>
      </div>

      {activeTab === "members" ? (
        <>
          {/* Stats Card */}
          <div className="rounded-xl border border-border bg-card">
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="text-center py-6">
                <p className="text-2xl font-semibold">{ownersAndAdmins}</p>
                <p className="text-sm text-muted-foreground mt-1">Owners & Admins</p>
              </div>
              <div className="text-center py-6">
                <p className="text-2xl font-semibold">{supportMembers}</p>
                <p className="text-sm text-muted-foreground mt-1">Support members</p>
              </div>
              <div className="text-center py-6">
                <p className="text-2xl font-semibold">{viewerMembers}</p>
                <p className="text-sm text-muted-foreground mt-1">Viewer members</p>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <h4 className="font-medium text-foreground">No team members yet</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Invite team members to collaborate on campaigns and manage your brand.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {member.profiles.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt={member.profiles.full_name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-200 dark:ring-purple-900/50"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-base font-semibold ring-2 ring-purple-200 dark:ring-purple-900/50">
                          {member.profiles.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          {member.profiles.full_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profiles.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {getRoleLabel(member.role)}
                      </span>
                      {canManageTeam && member.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setConfirmDialog({ type: "member", id: member.id, name: member.profiles.full_name })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Pending Invites Tab */}
          {canManageTeam && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Invite Links</h3>
                  <p className="text-sm text-muted-foreground">Share links to invite team members</p>
                </div>
                <Button
                  onClick={generateNewLink}
                  disabled={generatingLink}
                  size="sm"
                  className="gap-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-foreground border-0"
                >
                  {generatingLink ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Generate Link
                    </>
                  )}
                </Button>
              </div>

              {linkInvites.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No active invite links. Generate one to share.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {linkInvites.map(invite => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
                            invite.role === "admin"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {invite.role}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                          {getInviteUrl(invite.invite_token)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyLink(invite)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          {copiedLinkId === invite.id ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDialog({ type: "link", id: invite.id })}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email Invitations */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-medium">Email Invitations</h3>
              <p className="text-sm text-muted-foreground">
                {invitations.length} pending {invitations.length === 1 ? "invitation" : "invitations"}
              </p>
            </div>

            {invitations.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No pending invitations
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {invitations.map(invitation => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-base font-semibold">
                        {invitation.email[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {invitation.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Invited {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize",
                        invitation.role === "admin"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {invitation.role}
                      </span>
                      {canManageTeam && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDialog({ type: "invitation", id: invitation.id, name: invitation.email })}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        brandId={brandId}
        brandSlug={brandSlug}
        onInviteSent={fetchTeamData}
      />

      <ConfirmDeleteDialog
        open={confirmDialog.type !== null}
        onOpenChange={(open) => !open && setConfirmDialog({ type: null, id: "" })}
        title={
          confirmDialog.type === "member"
            ? "Remove Team Member"
            : confirmDialog.type === "link"
            ? "Revoke Invite Link"
            : "Cancel Invitation"
        }
        description={
          confirmDialog.type === "member"
            ? `Are you sure you want to remove ${confirmDialog.name || "this member"} from the team? They will lose access to this workspace.`
            : confirmDialog.type === "link"
            ? "Are you sure you want to revoke this invite link? Anyone with this link will no longer be able to join."
            : `Are you sure you want to cancel the invitation to ${confirmDialog.name || "this email"}?`
        }
        onConfirm={handleConfirmAction}
        confirmText={
          confirmDialog.type === "member"
            ? "Remove"
            : confirmDialog.type === "link"
            ? "Revoke"
            : "Cancel Invitation"
        }
      />
    </div>
  );
}
