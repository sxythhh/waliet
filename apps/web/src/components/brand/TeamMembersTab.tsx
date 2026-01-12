import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2, Shield, Crown, Link2, Copy, Check, UserPlus, Mail, Users } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { formatDistanceToNow } from "date-fns";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { cn } from "@/lib/utils";

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
  const {
    isAdmin
  } = useAdminCheck();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [linkInvites, setLinkInvites] = useState<LinkInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const {
          data: memberData
        } = await supabase.from("brand_members").select("role").eq("brand_id", brandId).eq("user_id", user.id).maybeSingle();
        setCurrentUserRole(memberData?.role || null);
      }

      // Fetch brand members
      const {
        data: membersData,
        error: membersError
      } = await supabase.from("brand_members").select("id, user_id, role, created_at").eq("brand_id", brandId);
      if (membersError) throw membersError;

      // Fetch all profiles in one query
      const userIds = (membersData || []).map(m => m.user_id);
      const {
        data: profilesData
      } = await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds);

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

      // Fetch pending email invitations (non-link invites)
      const {
        data: invitationsData,
        error: invitationsError
      } = await supabase
        .from("brand_invitations")
        .select("*")
        .eq("brand_id", brandId)
        .eq("status", "pending")
        .or("is_link_invite.is.null,is_link_invite.eq.false");
      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);

      // Fetch active link invitations
      const {
        data: linkInvitesData,
        error: linkInvitesError
      } = await supabase
        .from("brand_invitations")
        .select("id, role, invite_token, created_at, expires_at")
        .eq("brand_id", brandId)
        .eq("is_link_invite", true)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (linkInvitesError) throw linkInvitesError;
      setLinkInvites((linkInvitesData || []) as LinkInvite[]);
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
        const { error } = await supabase.from("brand_members").delete().eq("id", id);
        if (error) throw error;
        toast.success("Member removed successfully");
      } else if (type === "link") {
        const { error } = await supabase.from("brand_invitations").update({ status: "cancelled" }).eq("id", id);
        if (error) throw error;
        toast.success("Link revoked");
      } else if (type === "invitation") {
        const { error } = await supabase.from("brand_invitations").update({ status: "cancelled" }).eq("id", id);
        if (error) throw error;
        toast.success("Invitation cancelled");
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

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="rounded-xl border border-border/50 bg-card dark:bg-[#0e0e0e] overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-muted/50 rounded animate-pulse" />
              <div className="h-8 w-20 bg-muted/50 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                <div className="h-10 w-10 rounded-full bg-muted/50 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-muted/30 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Members Card */}
      <div className="rounded-xl border border-border/50 bg-card dark:bg-[#0e0e0e] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-[-0.5px]">
                Team Members
              </h3>
              <p className="text-xs text-muted-foreground tracking-[-0.3px]">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
          {canManageTeam && (
            <Button
              onClick={() => setInviteDialogOpen(true)}
              size="sm"
              className="bg-primary border-t border-primary/70 text-[13px] font-medium tracking-[-0.5px] text-white hover:bg-primary/90 rounded-lg gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite
            </Button>
          )}
        </div>

        {/* Members List */}
        <div className="p-4">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <h4 className="font-inter tracking-[-0.5px] font-medium text-foreground">
                No team members yet
              </h4>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1 max-w-xs">
                Invite team members to collaborate on campaigns and manage your brand.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    {member.profiles.avatar_url ? (
                      <img
                        src={member.profiles.avatar_url}
                        alt={member.profiles.full_name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-border/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold ring-2 ring-border/50">
                        {member.profiles.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium tracking-[-0.5px]">
                          {member.profiles.full_name || "Unknown"}
                        </p>
                        {member.role === "owner" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                            <Crown className="h-2.5 w-2.5" />
                            Owner
                          </span>
                        )}
                        {member.role === "admin" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-medium">
                            <Shield className="h-2.5 w-2.5" />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground tracking-[-0.3px]">
                        {member.profiles.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canManageTeam && member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDialog({ type: "member", id: member.id, name: member.profiles.full_name })}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Links Card */}
      {canManageTeam && (
        <div className="rounded-xl border border-border/50 bg-card dark:bg-[#0e0e0e] overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Link2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-[-0.5px]">
                  Invite Links
                </h3>
                <p className="text-xs text-muted-foreground tracking-[-0.3px]">
                  Share links to invite team members
                </p>
              </div>
            </div>
            <Button
              onClick={generateNewLink}
              disabled={generatingLink}
              size="sm"
              variant="outline"
              className="text-[13px] font-medium tracking-[-0.5px] rounded-lg gap-1.5 border-border/50"
            >
              {generatingLink ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5" />
                  Generate Link
                </>
              )}
            </Button>
          </div>

          {/* Links List */}
          <div className="p-4">
            {linkInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                  No active invite links. Generate one to share.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkInvites.map(invite => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 dark:bg-muted/10 hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                          invite.role === "admin"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {invite.role}
                        </span>
                        <span className="text-xs text-muted-foreground tracking-[-0.3px]">
                          Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/80 font-mono truncate tracking-[-0.3px] mt-1">
                        {getInviteUrl(invite.invite_token)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyLink(invite)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
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
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Revoke link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Invitations Card */}
      <div className="rounded-xl border border-border/50 bg-card dark:bg-[#0e0e0e] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Mail className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-[-0.5px]">
                Pending Invitations
              </h3>
              <p className="text-xs text-muted-foreground tracking-[-0.3px]">
                {invitations.length} pending {invitations.length === 1 ? "invitation" : "invitations"}
              </p>
            </div>
          </div>
        </div>

        {/* Invitations List */}
        <div className="p-4">
          {invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                No pending invitations
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {invitations.map(invitation => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 dark:bg-muted/10 hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-sm font-semibold">
                      {invitation.email[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium tracking-[-0.5px]">
                        {invitation.email}
                      </p>
                      <p className="text-xs text-muted-foreground tracking-[-0.3px]">
                        Invited {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded text-[10px] font-medium capitalize",
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
                        className="h-8 text-xs font-inter tracking-[-0.5px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
      </div>

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