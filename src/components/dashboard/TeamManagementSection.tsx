import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, Check, Plus, UserPlus, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreateTeamDialog } from "./CreateTeamDialog";
import { InviteTeammatesDialog } from "./InviteTeammatesDialog";
import { Slider } from "@/components/ui/slider";
interface Team {
  id: string;
  name: string;
  commission_rate: number;
  referral_code: string;
  total_earnings: number;
  created_at: string;
}
interface TeamMember {
  id: string;
  user_id: string;
  joined_at: string;
  total_contributed: number;
  profiles?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    total_earnings: number | null;
  };
}
interface TeamInvitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}
interface TeamManagementSectionProps {
  profileName: string;
}
export function TeamManagementSection({
  profileName
}: TeamManagementSectionProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState(10);
  const [savingRate, setSavingRate] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchTeamData();
  }, []);
  const fetchTeamData = async () => {
    setLoading(true);
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch team
    const {
      data: teamData
    } = await supabase.from("referral_teams").select("*").eq("owner_id", user.id).maybeSingle();
    if (teamData) {
      setTeam(teamData);
      setNewCommissionRate(teamData.commission_rate);

      // Fetch members
      const {
        data: membersData
      } = await supabase.from("referral_team_members").select("*").eq("team_id", teamData.id);
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const {
          data: profilesData
        } = await supabase.from("profiles").select("id, username, full_name, avatar_url, total_earnings").in("id", userIds);
        const membersWithProfiles = membersData.map(member => ({
          ...member,
          profiles: profilesData?.find(p => p.id === member.user_id)
        }));
        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }

      // Fetch invitations
      const {
        data: invitationsData
      } = await supabase.from("referral_team_invitations").select("*").eq("team_id", teamData.id).eq("status", "pending").order("created_at", {
        ascending: false
      });
      setInvitations(invitationsData || []);
    }
    setLoading(false);
  };
  const teamReferralLink = team ? `${window.location.origin}/?team=${team.referral_code}` : "";
  const copyTeamLink = () => {
    navigator.clipboard.writeText(teamReferralLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Your team referral link has been copied."
    });
    setTimeout(() => setCopied(false), 2000);
  };
  const handleRemoveMember = async (memberId: string) => {
    const {
      error
    } = await supabase.from("referral_team_members").delete().eq("id", memberId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove member."
      });
    } else {
      toast({
        title: "Member removed",
        description: "Team member has been removed."
      });
      fetchTeamData();
    }
  };
  const handleCancelInvitation = async (invitationId: string) => {
    const {
      error
    } = await supabase.from("referral_team_invitations").delete().eq("id", invitationId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel invitation."
      });
    } else {
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled."
      });
      fetchTeamData();
    }
  };
  const handleSaveCommissionRate = async () => {
    if (!team) return;
    setSavingRate(true);
    const {
      error
    } = await supabase.from("referral_teams").update({
      commission_rate: newCommissionRate
    }).eq("id", team.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update commission rate."
      });
    } else {
      toast({
        title: "Updated!",
        description: "Commission rate has been updated."
      });
      setTeam({
        ...team,
        commission_rate: newCommissionRate
      });
      setEditingRate(false);
    }
    setSavingRate(false);
  };
  if (loading) {
    return <div className="space-y-4">
        <div className="h-40 rounded-xl animate-pulse bg-[#1f1f1f]/0" />
      </div>;
  }

  // No team yet - show create team prompt
  if (!team) {
    return <div className="space-y-4">
        <div className="p-6 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] text-center">
          <div className="w-12 h-12 rounded-full bg-[#2060df]/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-[#2060df]" />
          </div>
          <h3 className="font-semibold text-lg mb-2" style={{
          fontFamily: 'Inter',
          letterSpacing: '-0.5px'
        }}>
            Create a Team
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            Create a team to start earning commissions from referrals. Share your referral link with new users and earn a percentage of their payouts.
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-[#2060df] hover:bg-[#2060df]/90 border-t border-[#4b85f7]">
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>

        <CreateTeamDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onTeamCreated={fetchTeamData} profileName={profileName} />
      </div>;
  }

  // Has team - show management UI
  return <div className="space-y-6">
      {/* Team Header */}
      <div className="p-5 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2060df]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#2060df]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{team.name}</h3>
              <p className="text-xs text-muted-foreground">
                {team.commission_rate}% commission rate
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditingRate(!editingRate)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {editingRate && <div className="p-4 rounded-lg bg-background/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Commission Rate</span>
              <span className="text-sm font-semibold text-[#2060df]">{newCommissionRate}%</span>
            </div>
            <Slider value={[newCommissionRate]} onValueChange={value => setNewCommissionRate(value[0])} min={1} max={50} step={1} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveCommissionRate} disabled={savingRate}>
                {savingRate ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
            setEditingRate(false);
            setNewCommissionRate(team.commission_rate);
          }}>
                Cancel
              </Button>
            </div>
          </div>}

        {/* Team referral link */}
        <div className="flex gap-2 items-stretch">
          <Input value={teamReferralLink} readOnly className="font-['Geist'] text-sm bg-background/50 border-0 h-10 flex-1" style={{
          letterSpacing: '-0.5px'
        }} />
          <Button onClick={copyTeamLink} variant="ghost" className="gap-2 shrink-0 h-10 bg-muted hover:bg-muted/80 text-muted-foreground">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={() => setShowInviteDialog(true)} className="shrink-0 h-10 bg-[#2060df] hover:bg-[#2060df]/90 border-t border-[#4b85f7]">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center">
            <p className="text-lg font-semibold">{members.length}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{invitations.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[#2060df]">${(team.total_earnings || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Earned</p>
          </div>
        </div>
      </div>


      {/* Pending Invitations */}
      {invitations.length > 0 && <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Pending Invitations</h4>
          {invitations.map(invitation => <div key={invitation.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">{invitation.email}</p>
                <p className="text-xs text-muted-foreground">
                  Expires {new Date(invitation.expires_at).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleCancelInvitation(invitation.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>)}
        </div>}

      {/* Team Members */}
      {members.length > 0 && <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Team Members</h4>
          {members.map(member => <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-[#f4f4f4] dark:bg-[#0f0f0f]">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.profiles?.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {member.profiles?.full_name || member.profiles?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Contributed: ${(member.total_contributed || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>)}
        </div>}

      {members.length === 0 && invitations.length === 0 && <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No team members yet. Invite teammates to start earning!
          </p>
        </div>}

      <InviteTeammatesDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} teamId={team.id} teamName={team.name} onInvitesSent={fetchTeamData} />
    </div>;
}