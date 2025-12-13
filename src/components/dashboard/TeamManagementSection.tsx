import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, Check, Plus, UserPlus, Trash2, Camera, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreateTeamDialog } from "./CreateTeamDialog";
import { InviteTeammatesDialog } from "./InviteTeammatesDialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface Team {
  id: string;
  name: string;
  commission_rate: number;
  referral_code: string;
  total_earnings: number;
  created_at: string;
  logo_url: string | null;
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

export function TeamManagementSection({ profileName }: TeamManagementSectionProps) {
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: teamData } = await supabase
      .from("referral_teams")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (teamData) {
      setTeam(teamData);
      setNewCommissionRate(teamData.commission_rate);

      const { data: membersData } = await supabase
        .from("referral_team_members")
        .select("*")
        .eq("team_id", teamData.id);

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, total_earnings")
          .in("id", userIds);

        const membersWithProfiles = membersData.map(member => ({
          ...member,
          profiles: profilesData?.find(p => p.id === member.user_id)
        }));
        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }

      const { data: invitationsData } = await supabase
        .from("referral_team_invitations")
        .select("*")
        .eq("team_id", teamData.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

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
    const { error } = await supabase
      .from("referral_team_members")
      .delete()
      .eq("id", memberId);

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
    const { error } = await supabase
      .from("referral_team_invitations")
      .delete()
      .eq("id", invitationId);

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

    const { error } = await supabase
      .from("referral_teams")
      .update({ commission_rate: newCommissionRate })
      .eq("id", team.id);

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
      setTeam({ ...team, commission_rate: newCommissionRate });
      setEditingRate(false);
    }
    setSavingRate(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!team || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `team-logos/${team.id}.${fileExt}`;

    setUploadingLogo(true);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: uploadError.message
      });
      setUploadingLogo(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("referral_teams")
      .update({ logo_url: publicUrl })
      .eq("id", team.id);

    if (updateError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update team logo."
      });
    } else {
      toast({
        title: "Logo updated!",
        description: "Your team logo has been updated."
      });
      setTeam({ ...team, logo_url: publicUrl });
    }
    setUploadingLogo(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-2xl animate-pulse bg-muted/30" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-4">
        <div className="p-8 rounded-2xl bg-muted/30 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#2060df]/10 flex items-center justify-center mx-auto mb-5">
            <Users className="w-8 h-8 text-[#2060df]" />
          </div>
          <h3 className="font-semibold text-xl mb-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            Create a Partner Team
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Build a team to earn commissions from referrals. Share your unique link and earn a percentage of your team's payouts.
          </p>
          <Button 
            onClick={() => setShowCreateDialog(true)} 
            className="bg-[#2060df] hover:bg-[#2060df]/90 border-t border-[#4b85f7]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>

        <CreateTeamDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onTeamCreated={fetchTeamData}
          profileName={profileName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Header Card */}
      <div className="rounded-2xl bg-muted/30 overflow-hidden">
        {/* Team Info Section */}
        <div className="p-6 flex items-start gap-5">
          {/* Team Logo */}
          <div className="relative group">
            <Avatar className="w-20 h-20 rounded-xl border-2 border-border">
              <AvatarImage src={team.logo_url || undefined} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-[#2060df]/10 text-[#2060df] text-2xl font-semibold">
                {team.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
              <Camera className="w-5 h-5 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploadingLogo}
              />
            </label>
            {uploadingLogo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Team Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
              {team.name}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="secondary" className="bg-[#2060df]/10 text-[#2060df] border-0">
                {team.commission_rate}% commission
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingRate(!editingRate)}
                className="text-xs text-muted-foreground hover:text-foreground h-auto p-1"
              >
                Edit
              </Button>
            </div>
          </div>

          {/* Invite Button */}
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="shrink-0 bg-[#2060df] hover:bg-[#2060df]/90 border-t border-[#4b85f7]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        </div>

        {/* Commission Rate Editor */}
        {editingRate && (
          <div className="px-6 pb-6">
            <div className="p-4 rounded-xl bg-background/50 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Commission Rate</Label>
                <span className="text-sm font-semibold text-[#2060df]">{newCommissionRate}%</span>
              </div>
              <Slider
                value={[newCommissionRate]}
                onValueChange={(value) => setNewCommissionRate(value[0])}
                min={1}
                max={50}
                step={1}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveCommissionRate} disabled={savingRate}>
                  {savingRate ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingRate(false);
                    setNewCommissionRate(team.commission_rate);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Referral Link */}
        <div className="px-6 pb-6">
          <div className="flex gap-2 items-stretch">
            <Input
              value={teamReferralLink}
              readOnly
              className="font-mono text-sm bg-background/50 border-0 h-10 flex-1"
            />
            <Button
              onClick={copyTeamLink}
              variant="ghost"
              className="gap-2 shrink-0 h-10 bg-muted hover:bg-muted/80"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 border-t border-border">
          <div className="p-4 text-center border-r border-border">
            <p className="text-2xl font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
              {members.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Members</p>
          </div>
          <div className="p-4 text-center border-r border-border">
            <p className="text-2xl font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
              {invitations.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-semibold text-[#2060df]" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
              ${(team.total_earnings || 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Earned</p>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground px-1">Pending Invitations</h4>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="text-xs bg-amber-500/10 text-amber-500">
                      {invitation.email[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCancelInvitation(invitation.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      {members.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground px-1">Team Members</h4>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={member.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.profiles?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {member.profiles?.full_name || member.profiles?.username}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>${(member.total_contributed || 0).toFixed(2)} contributed</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMember(member.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && invitations.length === 0 && (
        <div className="text-center py-8 rounded-xl bg-muted/20">
          <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No team members yet. Invite teammates to start earning!
          </p>
        </div>
      )}

      <InviteTeammatesDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        teamId={team.id}
        teamName={team.name}
        onInvitesSent={fetchTeamData}
      />
    </div>
  );
}
