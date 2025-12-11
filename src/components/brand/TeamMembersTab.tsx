import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Trash2, Shield, User, Crown } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { Skeleton } from "@/components/ui/skeleton";

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
}

interface TeamMembersTabProps {
  brandId: string;
}

export function TeamMembersTab({ brandId }: TeamMembersTabProps) {
  const { isAdmin } = useAdminCheck();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

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
        const { data: memberData } = await supabase
          .from("brand_members")
          .select("role")
          .eq("brand_id", brandId)
          .eq("user_id", user.id)
          .maybeSingle();
        
        setCurrentUserRole(memberData?.role || null);
      }

      // Fetch brand members
      const { data: membersData, error: membersError } = await supabase
        .from("brand_members")
        .select("id, user_id, role, created_at")
        .eq("brand_id", brandId);

      if (membersError) throw membersError;

      // Fetch all profiles in one query
      const userIds = (membersData || []).map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      // Map profiles to members
      const profileMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );

      const membersWithProfiles = (membersData || []).map(member => ({
        ...member,
        profiles: {
          full_name: profileMap.get(member.user_id)?.full_name || "Unknown",
          email: profileMap.get(member.user_id)?.email || "Unknown",
          avatar_url: profileMap.get(member.user_id)?.avatar_url || null,
        },
      }));

      setMembers(membersWithProfiles);

      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("brand_invitations")
        .select("*")
        .eq("brand_id", brandId)
        .eq("status", "pending");

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);

    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("brand_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member removed successfully");
      fetchTeamData();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("brand_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation cancelled");
      fetchTeamData();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-medium tracking-[-0.5px]">Team</h2>
          <p className="text-xs text-muted-foreground tracking-[-0.5px]">
            Invite and manage team members
          </p>
        </div>
        {canManageTeam && (
          <Button
            onClick={() => setInviteDialogOpen(true)}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        )}
      </div>

      {/* Active Members */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground tracking-[-0.5px]">
          Members ({members.length})
        </p>
        <div className="space-y-1">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
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
                  <p className="text-sm font-medium tracking-[-0.5px]">
                    {member.profiles.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground tracking-[-0.5px]">{member.profiles.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">
                  {getRoleIcon(member.role)}
                  <span className="capitalize">{member.role}</span>
                </div>
                {canManageTeam && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground tracking-[-0.5px]">
            Pending ({invitations.length})
          </p>
          <div className="space-y-1">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium tracking-[-0.5px]">{invitation.email}</p>
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
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        brandId={brandId}
        onInviteSent={fetchTeamData}
      />
    </div>
  );
}