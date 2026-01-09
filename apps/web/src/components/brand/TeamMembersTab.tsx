import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2, Shield, User, Crown, Users, Clock, Link2, Copy, Check } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { formatDistanceToNow } from "date-fns";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";

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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };
  const canManageTeam = isAdmin || currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Active Members */}
      <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-muted/20 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium tracking-[-0.5px]">
            Team Members ({members.length})
          </h3>
          {canManageTeam && (
            <button
              onClick={() => setInviteDialogOpen(true)}
              className="bg-primary border-t border-primary/70 font-inter text-[13px] font-medium tracking-[-0.5px] text-white hover:bg-primary/90 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-md"
            >
              Invite
            </button>
          )}
        </div>

        <div className="space-y-1">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground tracking-[-0.5px] py-4 text-center">
              No team members yet
            </p>
          ) : (
            members.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {member.profiles.avatar_url ? (
                    <img
                      src={member.profiles.avatar_url}
                      alt={member.profiles.full_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                      {member.profiles.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium tracking-[-0.5px]">
                        {member.profiles.full_name || "Unknown"}
                      </p>
                      {member.role === "owner" && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                      {member.role === "admin" && (
                        <Shield className="h-3 w-3 text-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                      {member.profiles.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageTeam && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDialog({ type: "member", id: member.id, name: member.profiles.full_name })}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label="Remove member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column - Invite Links & Pending Invitations */}
      <div className="space-y-6">
        {/* Invite Links Card */}
        {canManageTeam && (
          <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium tracking-[-0.5px]">
                Invite Links
              </h3>
              <button
                onClick={generateNewLink}
                disabled={generatingLink}
                className="bg-primary border-t border-primary/70 font-inter text-[13px] font-medium tracking-[-0.5px] text-white hover:bg-primary/90 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                {generatingLink ? "Generating..." : "Generate"}
              </button>
            </div>

            <div className="space-y-2">
              {linkInvites.length === 0 ? (
                <p className="text-sm text-muted-foreground tracking-[-0.5px] py-4 text-center">
                  No active invite links
                </p>
              ) : (
                linkInvites.map(invite => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize tracking-[-0.5px]">
                          {invite.role}
                        </span>
                        <span className="text-xs text-muted-foreground tracking-[-0.5px]">
                          Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate tracking-[-0.3px]">
                        {getInviteUrl(invite.invite_token)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyLink(invite)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        {copiedLinkId === invite.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDialog({ type: "link", id: invite.id })}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label="Revoke link"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pending Invitations Card */}
        <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-muted/20 space-y-4">
          <h3 className="text-sm font-medium tracking-[-0.5px]">
            Pending Invitations ({invitations.length})
          </h3>

          <div className="space-y-1">
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground tracking-[-0.5px] py-4 text-center">
                No pending invitations
              </p>
            ) : (
              invitations.map(invitation => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium tracking-[-0.5px]">
                      {invitation.email}
                    </p>
                    <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize px-2 py-1 bg-muted/50 rounded">
                      {invitation.role}
                    </span>
                    {canManageTeam && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDialog({ type: "invitation", id: invitation.id, name: invitation.email })}
                        className="h-7 text-xs font-inter tracking-[-0.5px] text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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