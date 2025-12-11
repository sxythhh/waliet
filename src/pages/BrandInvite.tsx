import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Shield, CheckCircle2, XCircle } from "lucide-react";

export default function BrandInvite() {
  const { brandSlug, invitationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadInvitation();
    checkUser();
  }, [invitationId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadInvitation = async () => {
    if (!invitationId) {
      console.error("No invitation ID provided");
      setLoading(false);
      return;
    }
    
    try {
      console.log("Loading invitation:", invitationId);
      
      // Fetch invitation
      const { data: inviteData, error: inviteError } = await supabase
        .from("brand_invitations")
        .select("*")
        .eq("id", invitationId)
        .maybeSingle();

      console.log("Invitation response:", { inviteData, inviteError });

      if (inviteError) {
        console.error("Invitation fetch error:", inviteError);
        toast.error("Failed to load invitation");
        setLoading(false);
        return;
      }
      
      if (!inviteData) {
        console.log("Invitation not found");
        toast.error("Invitation not found");
        setLoading(false);
        return;
      }

      // Check if invitation has expired
      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        console.log("Invitation expired");
        toast.error("This invitation has expired");
        setLoading(false);
        return;
      }

      if (inviteData.status !== "pending") {
        console.log("Invitation already used:", inviteData.status);
        toast.error("This invitation has already been used");
        setLoading(false);
        return;
      }

      setInvitation(inviteData);
      setEmail(inviteData.email);

      // Fetch brand details
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", inviteData.brand_id)
        .maybeSingle();

      console.log("Brand response:", { brandData, brandError });

      if (brandError) {
        console.error("Brand fetch error:", brandError);
        toast.error("Failed to load brand details");
      }
      
      setBrand(brandData);
    } catch (error: any) {
      console.error("Error loading invitation:", error);
      toast.error(error.message || "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/brand/${brandSlug}/invite/${invitationId}`,
          },
        });
        if (error) throw error;
        
        // If signup is successful and user is created, accept invitation automatically
        if (data.user) {
          setUser(data.user);
          toast.success("Account created successfully!");
          // Accept invitation automatically after account creation
          await acceptInvitation(data.user);
        } else {
          toast.success("Account created! Please check your email to verify.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Logged in successfully!");
        await checkUser();
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setProcessing(false);
    }
  };

  const acceptInvitation = async (currentUser: any) => {
    if (!currentUser || !invitation) return;

    try {
      // Check if user email matches invitation
      if (currentUser.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        toast.error("This invitation was sent to a different email address");
        return;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from("brand_members")
        .select("id")
        .eq("brand_id", invitation.brand_id)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (existingMember) {
        // Update invitation status to accepted
        await supabase
          .from("brand_invitations")
          .update({ status: "accepted" })
          .eq("id", invitation.id);
        
        toast.success("You are already a member of this brand!");
        navigate(`/dashboard?workspace=${brandSlug}`);
        return;
      }

      // Add user to brand members
      const { error: memberError } = await supabase
        .from("brand_members")
        .insert({
          brand_id: invitation.brand_id,
          user_id: currentUser.id,
          role: invitation.role,
        });

      if (memberError) {
        console.error("Member insert error:", memberError);
        throw memberError;
      }

      // Update invitation status to accepted
      const { error: updateError } = await supabase
        .from("brand_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      if (updateError) {
        console.error("Error updating invitation status:", updateError);
      }

      toast.success(`Welcome to ${brand?.name}!`);
      navigate(`/dashboard?workspace=${brandSlug}`);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user || !invitation) return;
    setProcessing(true);
    await acceptInvitation(user);
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!invitation || !brand) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const emailMatches = user?.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(0,0%,3.1%)]">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            {brand.logo_url && (
              <img src={brand.logo_url} alt={brand.name} className="h-12 w-12 rounded-lg object-cover" />
            )}
            <div>
              <CardTitle>Brand Invitation</CardTitle>
              <CardDescription>Join {brand.name}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Invited Email</p>
                <p className="text-sm text-muted-foreground">{invitation.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Role</p>
                <p className="text-sm text-muted-foreground capitalize">{invitation.role}</p>
              </div>
            </div>
          </div>

          {/* User Status */}
          {!user ? (
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  This invitation is for {email}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={processing}>
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isSignUp ? "Create Account & Accept" : "Sign In & Accept"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </Button>
            </form>
          ) : emailMatches ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm">You're logged in with the invited email!</p>
              </div>
              <Button onClick={handleAcceptInvitation} className="w-full" disabled={processing}>
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Accept Invitation
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <XCircle className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Email Mismatch</p>
                  <p className="text-xs text-muted-foreground">
                    You're logged in as {user.email}, but this invitation is for {invitation.email}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                  toast.info("Signed out. Please sign in with the invited email.");
                }}
              >
                Sign Out & Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
