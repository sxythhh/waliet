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
    try {
      // Fetch invitation
      const { data: inviteData, error: inviteError } = await supabase
        .from("brand_invitations")
        .select("*")
        .eq("id", invitationId)
        .single();

      if (inviteError) throw inviteError;
      if (!inviteData) {
        toast.error("Invitation not found");
        return;
      }

      if (inviteData.status !== "pending") {
        toast.error("This invitation has already been used or expired");
        return;
      }

      setInvitation(inviteData);
      setEmail(inviteData.email);

      // Fetch brand details
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", inviteData.brand_id)
        .single();

      if (brandError) throw brandError;
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/brand/${brandSlug}/invite/${invitationId}`,
          },
        });
        if (error) throw error;
        toast.success("Account created! Please check your email to verify.");
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

  const handleAcceptInvitation = async () => {
    if (!user || !invitation) return;

    setProcessing(true);
    try {
      // No longer require email match - allow anyone with the link to accept
      // Add user to brand members
      const { error: memberError } = await supabase
        .from("brand_members")
        .insert({
          brand_id: invitation.brand_id,
          user_id: user.id,
          role: invitation.role,
        });

      if (memberError) throw memberError;

      // Update invitation status
      const { error: updateError } = await supabase
        .from("brand_invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      toast.success(`Welcome to ${brand?.name}!`);
      navigate(`/brand/${brandSlug}/account`);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
    } finally {
      setProcessing(false);
    }
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
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
                />
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
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm">You're logged in and ready to join!</p>
              </div>
              <Button onClick={handleAcceptInvitation} className="w-full" disabled={processing}>
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Accept Invitation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
