import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Trash2, Shield, User, Crown } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { InviteMemberDialog } from "./InviteMemberDialog";

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

      // Fetch members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from("brand_members")
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq("brand_id", brandId);

      if (membersError) throw membersError;

      // Fetch user profiles and emails separately
      const membersWithDetails = await Promise.all(
        (membersData || []).map(async (member: any) => {
          // Get profile data
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", member.user_id)
            .maybeSingle();

          // Get user email from auth
          const { data: { user } } = await supabase.auth.admin.getUserById(member.user_id);
          
          return {
            ...member,
            profiles: {
              full_name: profile?.full_name || "Unknown",
              email: user?.email || "Unknown"
            }
          };
        })
      );

      setMembers(membersWithDetails as Member[]);

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
    return <div className="text-white">Loading team...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Team Members</h2>
        {canManageTeam && (
          <Button
            onClick={() => setInviteDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Active Members */}
      <Card className="bg-[#202020] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Active Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-[#191919] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getRoleIcon(member.role)}
                  <div>
                    <p className="text-white font-medium">
                      {member.profiles.full_name || "Unknown"}
                    </p>
                    <p className="text-sm text-white/60">{member.profiles.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/60 capitalize px-2 py-1 bg-white/5 rounded">
                    {member.role}
                  </span>
                  {canManageTeam && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="bg-[#202020] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Pending Invitations ({invitations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 bg-[#191919] rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">{invitation.email}</p>
                    <p className="text-sm text-white/60">
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/60 capitalize px-2 py-1 bg-white/5 rounded">
                      {invitation.role}
                    </span>
                    {canManageTeam && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="text-white/60 hover:text-white"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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