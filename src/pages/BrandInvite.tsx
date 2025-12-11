import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Shield, CheckCircle2, XCircle, Building2, Users } from "lucide-react";
import viralityLogo from "@/assets/virality-logo-new.png";

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
        
        if (data.user) {
          setUser(data.user);
          toast.success("Account created successfully!");
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
      if (currentUser.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        toast.error("This invitation was sent to a different email address");
        return;
      }

      const { data: existingMember } = await supabase
        .from("brand_members")
        .select("id")
        .eq("brand_id", invitation.brand_id)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (existingMember) {
        await supabase
          .from("brand_invitations")
          .update({ status: "accepted" })
          .eq("id", invitation.id);
        
        toast.success("You are already a member of this brand!");
        navigate(`/dashboard?workspace=${brandSlug}`);
        return;
      }

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
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (!invitation || !brand) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#080808]">
        <div className="max-w-md w-full border border-[#141414] rounded-xl p-8 bg-[#0a0a0a]">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="font-inter tracking-[-0.5px] text-xl font-semibold text-white">
              Invalid Invitation
            </h1>
            <p className="font-inter tracking-[-0.5px] text-sm text-white/60">
              This invitation link is invalid, has expired, or has already been used. Please contact the brand administrator for a new invitation.
            </p>
            <Button 
              variant="outline" 
              className="mt-4 font-inter tracking-[-0.5px] border-[#141414]"
              onClick={() => navigate("/")}
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const emailMatches = user?.email?.toLowerCase() === invitation.email.toLowerCase();
  const statusLabel = invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1);
  const roleLabel = invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1);

  return (
    <div className="min-h-screen flex bg-[#080808]">
      {/* Left Panel - Brand Info */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2060de]/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <img src={viralityLogo} alt="Virality" className="h-8 w-auto" />
          </div>
          
          {/* Brand Card */}
          <div className="space-y-8">
            <div className="flex items-center gap-5">
              {brand.logo_url ? (
                <img 
                  src={brand.logo_url} 
                  alt={brand.name} 
                  className="h-20 w-20 rounded-2xl object-cover border border-[#141414]" 
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-[#141414] flex items-center justify-center border border-[#1a1a1a]">
                  <Building2 className="h-10 w-10 text-white/30" />
                </div>
              )}
              <div>
                <h2 className="font-inter tracking-[-0.5px] text-3xl font-bold text-white">
                  {brand.name}
                </h2>
                <p className="font-inter tracking-[-0.5px] text-white/60 mt-1">
                  You've been invited to join this workspace
                </p>
              </div>
            </div>
            
            {brand.description && (
              <p className="font-inter tracking-[-0.5px] text-white/50 text-sm leading-relaxed max-w-md">
                {brand.description}
              </p>
            )}
            
            {/* Stats */}
            <div className="flex gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#2060de]" />
                </div>
                <div>
                  <p className="font-inter tracking-[-0.5px] text-xs text-white/40 uppercase">Your Role</p>
                  <p className="font-inter tracking-[-0.5px] text-white font-medium">{roleLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                  <Shield className="h-5 w-5 text-[#2060de]" />
                </div>
                <div>
                  <p className="font-inter tracking-[-0.5px] text-xs text-white/40 uppercase">Status</p>
                  <p className="font-inter tracking-[-0.5px] text-white font-medium">{statusLabel}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <p className="font-inter tracking-[-0.5px] text-xs text-white/30">
            Powered by Virality — Creator collaboration platform
          </p>
        </div>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Brand Header */}
          <div className="lg:hidden space-y-6">
            <img src={viralityLogo} alt="Virality" className="h-7 w-auto" />
            <div className="flex items-center gap-4">
              {brand.logo_url ? (
                <img 
                  src={brand.logo_url} 
                  alt={brand.name} 
                  className="h-14 w-14 rounded-xl object-cover border border-[#141414]" 
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-[#141414] flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-white/30" />
                </div>
              )}
              <div>
                <h2 className="font-inter tracking-[-0.5px] text-xl font-bold text-white">{brand.name}</h2>
                <p className="font-inter tracking-[-0.5px] text-sm text-white/50">Workspace Invitation</p>
              </div>
            </div>
          </div>
          
          {/* Form Card */}
          <div className="border border-[#141414] rounded-xl p-6 lg:p-8 bg-[#0a0a0a] space-y-6">
            <div>
              <h1 className="font-inter tracking-[-0.5px] text-xl font-semibold text-white">
                {user ? "Accept Invitation" : "Join Workspace"}
              </h1>
              <p className="font-inter tracking-[-0.5px] text-sm text-white/50 mt-1">
                {user 
                  ? "Complete your invitation to start collaborating with the team."
                  : "Sign in or create an account to accept your invitation and join the workspace."}
              </p>
            </div>
            
            {/* Invitation Details */}
            <div className="space-y-3 p-4 border border-[#141414] rounded-lg bg-[#0c0c0c]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#141414] flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-white/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-inter tracking-[-0.5px] text-xs text-white/40 uppercase">Invited Email</p>
                  <p className="font-inter tracking-[-0.5px] text-sm text-white truncate">{invitation.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#141414] flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-white/50" />
                </div>
                <div className="flex-1">
                  <p className="font-inter tracking-[-0.5px] text-xs text-white/40 uppercase">Assigned Role</p>
                  <p className="font-inter tracking-[-0.5px] text-sm text-white">{roleLabel}</p>
                </div>
              </div>
            </div>

            {/* Auth Form / Action */}
            {!user ? (
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-inter tracking-[-0.5px] text-white/70">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly
                    className="font-inter tracking-[-0.5px] bg-[#0c0c0c] border-[#141414] text-white"
                  />
                  <p className="font-inter tracking-[-0.5px] text-xs text-white/40">
                    This invitation is exclusively for {email}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-inter tracking-[-0.5px] text-white/70">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Enter your password"
                    className="font-inter tracking-[-0.5px] bg-[#0c0c0c] border-[#141414] text-white placeholder:text-white/30"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full font-inter tracking-[-0.5px] bg-[#2060de] hover:bg-[#2060de]/90 border-t border-[#4b85f7]" 
                  disabled={processing}
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isSignUp ? "Create Account & Accept" : "Sign In & Accept"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full font-inter tracking-[-0.5px] text-white/50 hover:text-white hover:bg-white/5"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
                </Button>
              </form>
            ) : emailMatches ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-inter tracking-[-0.5px] text-sm text-white font-medium">Ready to Join</p>
                    <p className="font-inter tracking-[-0.5px] text-xs text-white/50">You're signed in with the correct email address.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleAcceptInvitation} 
                  className="w-full font-inter tracking-[-0.5px] bg-[#2060de] hover:bg-[#2060de]/90 border-t border-[#4b85f7]" 
                  disabled={processing}
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Accept Invitation & Join {brand.name}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-inter tracking-[-0.5px] text-sm font-medium text-white">Email Mismatch</p>
                    <p className="font-inter tracking-[-0.5px] text-xs text-white/50">
                      You're currently signed in as <span className="text-white/70">{user.email}</span>, but this invitation was sent to <span className="text-white/70">{invitation.email}</span>. Please sign out and try again with the correct account.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full font-inter tracking-[-0.5px] border-[#141414] text-white hover:bg-white/5"
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
          </div>
          
          {/* Footer */}
          <p className="font-inter tracking-[-0.5px] text-center text-xs text-white/30 lg:hidden">
            Powered by Virality
          </p>
        </div>
      </div>
    </div>
  );
}