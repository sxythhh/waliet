import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Team {
  id: string;
  owner_id: string;
  name: string;
  image_url: string | null;
  invite_code: string;
}

interface OwnerProfile {
  username: string;
  avatar_url: string | null;
}

export default function JoinTeam() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [canJoin, setCanJoin] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [ownsTeam, setOwnsTeam] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    checkTeamAndEligibility();
  }, [inviteCode]);

  const checkTeamAndEligibility = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch team by invite code
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (teamError) throw teamError;

      if (!teamData) {
        setError("This invite link is invalid or has expired.");
        setLoading(false);
        return;
      }

      setTeam(teamData);

      // Fetch owner profile
      const { data: owner } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", teamData.owner_id)
        .single();

      setOwnerProfile(owner);

      // Fetch member count
      const { count } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamData.id);

      setMemberCount(count || 0);

      // Check user eligibility
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setCanJoin(false);
        setLoading(false);
        return;
      }

      // Check if user is the owner
      if (user.id === teamData.owner_id) {
        setIsOwner(true);
        setCanJoin(false);
        setLoading(false);
        return;
      }

      // Check if user already in a team
      const { data: existingMembership } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMembership) {
        setAlreadyMember(true);
        setCanJoin(false);
        setLoading(false);
        return;
      }

      // Check if user owns a team
      const { data: ownedTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (ownedTeam) {
        setOwnsTeam(true);
        setCanJoin(false);
        setLoading(false);
        return;
      }

      setCanJoin(true);
    } catch (err: any) {
      console.error("Error checking team:", err);
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  const handleJoinTeam = async () => {
    if (!team) return;

    setJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(`/auth?redirect=/join-team/${inviteCode}`);
        return;
      }

      const { error } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: user.id,
          commission_rate: 0.05 // 5% default
        });

      if (error) throw error;

      toast.success(`You've joined ${team.name}!`);
      navigate("/dashboard?tab=referrals");
    } catch (err: any) {
      console.error("Error joining team:", err);
      toast.error(err.message || "Failed to join team");
    }
    setJoining(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-semibold mb-2">Invalid Invite Link</h1>
            <p className="text-muted-foreground mb-6">
              {error || "This team invite link is not valid."}
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center">
            {/* Team Avatar */}
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={team.image_url || undefined} />
              <AvatarFallback className="bg-muted text-3xl">
                {team.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Team Info */}
            <h1 className="text-2xl font-bold mb-1">{team.name}</h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={ownerProfile?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {ownerProfile?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">@{ownerProfile?.username || "Owner"}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6 flex items-center justify-center gap-1">
              <Users className="h-4 w-4" />
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </p>

            {/* Status Messages */}
            {isOwner && (
              <div className="mb-6 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  This is your own team. You can't join it as a member.
                </p>
              </div>
            )}

            {alreadyMember && (
              <div className="mb-6 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  You're already a member of another team. Leave your current team first to join this one.
                </p>
              </div>
            )}

            {ownsTeam && (
              <div className="mb-6 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  You own a team. Team owners cannot join other teams. Delete your team first if you want to join this one.
                </p>
              </div>
            )}

            {canJoin && (
              <div className="mb-6 p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  By joining this team, a percentage of your campaign earnings will be shared with the team owner.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {canJoin ? (
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleJoinTeam}
                  disabled={joining}
                >
                  {joining ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Join Team
                </Button>
              ) : null}

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
