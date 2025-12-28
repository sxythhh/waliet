import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Copy, Check, Users, Crown, UserPlus, Settings, Trash2, Upload, Loader2, DollarSign, Percent, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

interface Team {
  id: string;
  owner_id: string;
  name: string;
  image_url: string | null;
  invite_code: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  commission_rate: number;
  status: string;
  joined_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  total_contribution?: number;
}

interface MembershipInfo {
  team: Team;
  membership: TeamMember;
  owner_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export function TeamsSection(): JSX.Element {
  const [userId, setUserId] = useState<string | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [membershipInfo, setMembershipInfo] = useState<MembershipInfo | null>(null);
  const [totalTeamEarnings, setTotalTeamEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  // Form states
  const [teamName, setTeamName] = useState("");
  const [teamImage, setTeamImage] = useState<File | null>(null);
  const [teamImagePreview, setTeamImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commissionRate, setCommissionRate] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setUserId(user.id);

    // Check if user owns a team
    const { data: ownedTeam } = await supabase
      .from("teams")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedTeam) {
      setMyTeam(ownedTeam);
      await fetchTeamMembers(ownedTeam.id);
      await fetchTotalTeamEarnings(ownedTeam.id);
    } else {
      // Check if user is a member of a team
      const { data: membership } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership) {
        // Fetch team and owner details
        const { data: team } = await supabase
          .from("teams")
          .select("*")
          .eq("id", membership.team_id)
          .single();

        if (team) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", team.owner_id)
            .single();

          setMembershipInfo({
            team,
            membership,
            owner_profile: ownerProfile || undefined
          });
        }
      }
    }

    setLoading(false);
  };

  const fetchTeamMembers = async (teamId: string) => {
    const { data: members } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", teamId)
      .order("joined_at", { ascending: false });

    if (members && members.length > 0) {
      // Fetch profiles for members
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .in("id", userIds);

      // Fetch earnings per member
      const { data: earnings } = await supabase
        .from("team_earnings")
        .select("member_id, commission_amount")
        .eq("team_id", teamId);

      const earningsMap = new Map<string, number>();
      earnings?.forEach(e => {
        earningsMap.set(e.member_id, (earningsMap.get(e.member_id) || 0) + Number(e.commission_amount));
      });

      const enrichedMembers = members.map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id),
        total_contribution: earningsMap.get(member.id) || 0
      }));

      setTeamMembers(enrichedMembers);
    } else {
      setTeamMembers([]);
    }
  };

  const fetchTotalTeamEarnings = async (teamId: string) => {
    const { data } = await supabase
      .from("team_earnings")
      .select("commission_amount")
      .eq("team_id", teamId);

    const total = data?.reduce((sum, e) => sum + Number(e.commission_amount), 0) || 0;
    setTotalTeamEarnings(total);
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = null;

      // Upload image if provided
      if (teamImage) {
        const fileExt = teamImage.name.split('.').pop();
        const fileName = `team-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, teamImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: newTeam, error } = await supabase
        .from("teams")
        .insert({
          owner_id: user.id,
          name: teamName.trim(),
          image_url: imageUrl
        })
        .select()
        .single();

      if (error) throw error;

      setMyTeam(newTeam);
      setCreateDialogOpen(false);
      setTeamName("");
      setTeamImage(null);
      setTeamImagePreview(null);
      toast.success("Team created successfully!");
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error(error.message || "Failed to create team");
    }
    setSaving(false);
  };

  const handleEditTeam = async () => {
    if (!myTeam || !teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = myTeam.image_url;

      // Upload new image if provided
      if (teamImage) {
        const fileExt = teamImage.name.split('.').pop();
        const fileName = `team-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, teamImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from("teams")
        .update({
          name: teamName.trim(),
          image_url: imageUrl
        })
        .eq("id", myTeam.id);

      if (error) throw error;

      setMyTeam({ ...myTeam, name: teamName.trim(), image_url: imageUrl });
      setEditTeamOpen(false);
      setTeamName("");
      setTeamImage(null);
      setTeamImagePreview(null);
      toast.success("Team updated successfully!");
    } catch (error: any) {
      console.error("Error updating team:", error);
      toast.error(error.message || "Failed to update team");
    }
    setSaving(false);
  };

  const openEditTeamDialog = () => {
    if (myTeam) {
      setTeamName(myTeam.name);
      setTeamImagePreview(myTeam.image_url);
      setEditTeamOpen(true);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTeamImage(file);
      setTeamImagePreview(URL.createObjectURL(file));
    }
  };

  const copyInviteLink = async () => {
    if (!myTeam) return;
    const link = `${window.location.origin}/join-team/${myTeam.invite_code}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateCommission = async () => {
    if (!selectedMember) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ commission_rate: commissionRate / 100 })
        .eq("id", selectedMember.id);

      if (error) throw error;

      // Update local state
      setTeamMembers(prev => prev.map(m => 
        m.id === selectedMember.id 
          ? { ...m, commission_rate: commissionRate / 100 }
          : m
      ));

      setEditMemberOpen(false);
      setSelectedMember(null);
      toast.success("Commission rate updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update commission");
    }
    setSaving(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success("Member removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    }
  };

  const handleLeaveTeam = async () => {
    if (!membershipInfo) return;
    if (!confirm("Are you sure you want to leave this team?")) return;

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", membershipInfo.membership.id);

      if (error) throw error;

      setMembershipInfo(null);
      toast.success("You have left the team");
    } catch (error: any) {
      toast.error(error.message || "Failed to leave team");
    }
  };

  if (loading) {
    return (
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // User is a member of a team (not owner)
  if (membershipInfo) {
    return (
      <Card className="bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={membershipInfo.team.image_url || undefined} />
                <AvatarFallback className="bg-muted text-lg">
                  {membershipInfo.team.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{membershipInfo.team.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  @{membershipInfo.owner_profile?.username || "Owner"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLeaveTeam} className="text-muted-foreground hover:text-destructive">
              Leave Team
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Commission Rate</p>
                <p className="text-2xl font-bold">{(membershipInfo.membership.commission_rate * 100).toFixed(0)}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">of your earnings goes to team</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // User owns a team
  if (myTeam) {
    return (
      <div className="space-y-6">
        {/* Team Header */}
        <Card className="bg-card">
          <CardContent className="p-0">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={myTeam.image_url || undefined} />
                    <AvatarFallback className="bg-muted text-2xl">
                      {myTeam.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={openEditTeamDialog}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-4 w-4 text-white" />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-xl">{myTeam.name}</h3>
                    <button
                      onClick={openEditTeamDialog}
                      className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-green-500">${totalTeamEarnings.toFixed(2)}</p>
              </div>
            </div>

            {/* Invite Link */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Team Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/join-team/${myTeam.invite_code}`}
                  className="bg-muted/50 font-mono text-sm"
                />
                <Button 
                  onClick={copyInviteLink}
                  variant="outline"
                  className="shrink-0 px-3"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="bg-card">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </h4>

            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No members yet</p>
                <p className="text-sm text-muted-foreground/70">Share your invite link to grow your team</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map(member => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-sm">
                          {member.profile?.username?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">@{member.profile?.username || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-500">
                          ${member.total_contribution?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(member.commission_rate * 100).toFixed(0)}% rate
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedMember(member);
                            setCommissionRate(member.commission_rate * 100);
                            setEditMemberOpen(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Member Commission Dialog */}
        <Dialog open={editMemberOpen} onOpenChange={setEditMemberOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Commission Rate</DialogTitle>
              <DialogDescription>
                Set the percentage of earnings you receive from this member.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedMember?.profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedMember?.profile?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">@{selectedMember?.profile?.username}</p>
                  <p className="text-sm text-muted-foreground">
                    Current rate: {((selectedMember?.commission_rate || 0) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Commission Rate</Label>
                  <span className="text-2xl font-bold">{commissionRate}%</span>
                </div>
                <Slider
                  value={[commissionRate]}
                  onValueChange={(value) => setCommissionRate(value[0])}
                  min={1}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground text-center">
                  You'll receive {commissionRate}% of this member's campaign earnings
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMemberOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCommission} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Team Dialog */}
        <Dialog open={editTeamOpen} onOpenChange={(open) => {
          setEditTeamOpen(open);
          if (!open) {
            setTeamName("");
            setTeamImage(null);
            setTeamImagePreview(null);
          }
        }}>
          <DialogContent className="sm:max-w-[420px] bg-card border-0 p-0 overflow-hidden rounded-2xl">
            {/* Header */}
            <div className="px-6 pt-6">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg font-semibold tracking-tight font-inter">
                  Edit Team
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground font-inter tracking-[-0.3px] text-left">
                  Update your team's name and logo.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-5">
              {/* Team Image */}
              <div className="space-y-2">
                <label className="text-sm text-foreground font-inter tracking-[-0.5px]">
                  Team Logo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  
                  <div 
                    className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity bg-[#8B5CF6]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {teamImagePreview ? (
                      <img src={teamImagePreview} alt="Team logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-semibold font-inter">
                        {teamName ? teamName.charAt(0).toUpperCase() : "T"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="h-7 text-xs font-inter tracking-[-0.3px] gap-1.5 px-2.5 bg-black/5 dark:bg-white/5 border-0 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground"
                    >
                      <Upload className="h-3 w-3" />
                      {teamImagePreview ? 'Change' : 'Upload'}
                    </Button>
                    {teamImagePreview && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setTeamImage(null);
                          setTeamImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }} 
                        className="h-7 text-xs font-inter tracking-[-0.3px] px-2.5 bg-black/5 dark:bg-white/5 border-0 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Name */}
              <div className="space-y-2">
                <Label className="text-sm text-foreground font-inter tracking-[-0.5px]">
                  Team Name
                </Label>
                <Input
                  id="editTeamName"
                  placeholder="Enter team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="h-10 bg-transparent border-border text-sm font-inter tracking-[-0.3px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#3672ea] rounded-lg transition-colors"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setEditTeamOpen(false)} 
                className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.3px] hover:bg-transparent"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditTeam} 
                disabled={saving || !teamName.trim()}
                className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.5px] bg-[#1f60dd] text-white hover:bg-[#1a52c2] border-t border-[#3672ea] rounded-lg"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // User has no team and is not a member - show create team option
  return (
    <Card className="bg-card">
      <CardContent className="p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Create Your Team</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Build a team of creators and earn a commission from their campaign earnings.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button 
              variant="ghost"
              className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.3px] bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground rounded-lg"
            >
              How it Works
            </Button>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.5px] bg-[#1f60dd] text-white hover:bg-[#1a52c2] border-t border-[#3672ea] rounded-lg"
            >
              Create Team
            </Button>
          </div>
        </div>

        {/* Create Team Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[420px] bg-card border-0 p-0 overflow-hidden rounded-2xl">
            {/* Header */}
            <div className="px-6 pt-6">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg font-semibold tracking-tight font-inter">
                  Create Your Team
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground font-inter tracking-[-0.3px] text-left">
                  Build a team of creators and earn commissions from their campaign earnings.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-5">
              {/* Team Image */}
              <div className="space-y-2">
                <label className="text-sm text-foreground font-inter tracking-[-0.5px]">
                  Team Logo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  
                  <div 
                    className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity bg-[#8B5CF6]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {teamImagePreview ? (
                      <img src={teamImagePreview} alt="Team logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-semibold font-inter">
                        {teamName ? teamName.charAt(0).toUpperCase() : "T"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="h-7 text-xs font-inter tracking-[-0.3px] gap-1.5 px-2.5 bg-black/5 dark:bg-white/5 border-0 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground"
                    >
                      <Upload className="h-3 w-3" />
                      {teamImagePreview ? 'Change' : 'Upload'}
                    </Button>
                    {teamImagePreview && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setTeamImage(null);
                          setTeamImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }} 
                        className="h-7 text-xs font-inter tracking-[-0.3px] px-2.5 bg-black/5 dark:bg-white/5 border-0 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Name */}
              <div className="space-y-2">
                <Label className="text-sm text-foreground font-inter tracking-[-0.5px]">
                  Team Name
                </Label>
                <Input
                  id="teamName"
                  placeholder="Enter team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="h-10 bg-transparent border-border text-sm font-inter tracking-[-0.3px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#3672ea] rounded-lg transition-colors"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setCreateDialogOpen(false)} 
                className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.3px] hover:bg-transparent"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTeam} 
                disabled={saving || !teamName.trim()}
                className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.5px] bg-[#1f60dd] text-white hover:bg-[#1a52c2] border-t border-[#3672ea] rounded-lg"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : "Create Team"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
