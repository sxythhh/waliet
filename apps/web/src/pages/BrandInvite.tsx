import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Building2, ArrowRight } from "lucide-react";
import AuthDialog from "@/components/AuthDialog";

type BrandInvitation = Database["public"]["Tables"]["brand_invitations"]["Row"];
type Brand = Database["public"]["Tables"]["brands"]["Row"];

export default function BrandInvite() {
  const { brandSlug, invitationId, token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingAutoAccept, setPendingAutoAccept] = useState(false);

  // Store invite URL for OAuth redirect (use both localStorage and sessionStorage for reliability)
  useEffect(() => {
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('auth_redirect_url', currentPath);
    localStorage.setItem('auth_redirect_url', currentPath);
  }, []);

  // Check if we're returning from OAuth (flag set in AuthCallback)
  useEffect(() => {
    const shouldAutoAccept = sessionStorage.getItem('brand_invite_auto_accept') || localStorage.getItem('brand_invite_auto_accept');
    if (shouldAutoAccept) {
      sessionStorage.removeItem('brand_invite_auto_accept');
      localStorage.removeItem('brand_invite_auto_accept');
      setPendingAutoAccept(true);
    }
  }, []);

  // Determine if this is a link-based (token) or email-based (invitationId) invite
  const isLinkInvite = !!token;

  useEffect(() => {
    loadInvitation();
    checkUser();
  }, [invitationId, token]);

  // Listen for auth state changes and auto-accept invitation
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setAuthDialogOpen(false);
        // Flag for auto-accept when invitation loads
        setPendingAutoAccept(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-accept invitation when both user, invitation, and brand are ready
  useEffect(() => {
    if (pendingAutoAccept && user && invitation && brand && !processing) {
      setPendingAutoAccept(false);
      acceptInvitation(user);
    }
  }, [pendingAutoAccept, user, invitation, brand, processing]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadInvitation = async () => {
    const lookupId = token || invitationId;
    if (!lookupId) {
      setLoading(false);
      return;
    }

    try {

      // Fetch invitation by token or ID
      let query = supabase
        .from("brand_invitations")
        .select("*") as any;

      if (isLinkInvite) {
        query = query.eq("invite_token", lookupId);
      } else {
        query = query.eq("id", lookupId);
      }

      const { data: inviteData, error: inviteError } = await query.maybeSingle();

      if (inviteError) {
        toast.error("Failed to load invitation");
        setLoading(false);
        return;
      }

      if (!inviteData) {
        toast.error("Invitation not found");
        setLoading(false);
        return;
      }

      // Check if invitation has expired
      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        toast.error("This invitation has expired");
        setLoading(false);
        return;
      }

      if (inviteData.status !== "pending") {
        toast.error("This invitation has already been used");
        setLoading(false);
        return;
      }

      setInvitation(inviteData);

      // Fetch brand details
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", inviteData.brand_id)
        .maybeSingle();

      if (brandError) {
        toast.error("Failed to load brand details");
      }

      setBrand(brandData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async (currentUser: any) => {
    if (!currentUser || !invitation) {
      return;
    }

    try {
      // For email-based invites, check if user email matches invitation
      if (!invitation.is_link_invite && invitation.email) {
        if (currentUser.email?.toLowerCase() !== invitation.email.toLowerCase()) {
          toast.error("This invitation was sent to a different email address");
          return;
        }
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
        throw memberError;
      }

      // Update invitation status to accepted
      await supabase
        .from("brand_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      toast.success(`Welcome to ${brand?.name}!`);
      navigate(`/dashboard?workspace=${brandSlug}&onboarding=active`);
    } catch (error: any) {
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">Loading invitation...</p>
      </div>
    );
  }

  if (!invitation || !brand) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full">
          <div className="bg-card dark:bg-[#0e0e0e] border border-border/50 rounded-xl p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-7 w-7 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold font-inter tracking-[-0.5px] text-foreground">
                  Invalid Invitation
                </h2>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                  This invitation link is invalid or has expired. Please ask for a new invite.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="mt-2"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For email invites, check if logged-in user's email matches
  const emailMatches = invitation.is_link_invite
    ? true // Link invites don't require email matching
    : user?.email?.toLowerCase() === invitation.email?.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full space-y-4">
        {/* Waliet Logo + Wordmark */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <img
            alt="Waliet Logo"
            className="h-6 w-6"
            src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png"
            width="24"
            height="24"
          />
          <span className="text-[17px] font-clash font-semibold text-foreground tracking-[-0.4px] -ml-0.5">
            WALIET
          </span>
        </div>

        {/* Brand Card */}
        <div className="bg-card dark:bg-[#0e0e0e] border border-border/50 rounded-xl overflow-hidden">
          {/* Header with brand info */}
          <div className="p-6 pb-4">
            <div className="flex items-center gap-4">
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="h-14 w-14 rounded-xl object-cover border border-border/50"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-xl font-semibold font-inter tracking-[-0.5px] text-foreground">
                  {brand.name}
                </h1>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                  You've been invited to join this brand
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* Invitation Details */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-3">
                <span className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px]">
                  {invitation.is_link_invite ? "Invite Type" : "Invited Email"}
                </span>
                <p className="text-sm font-medium font-inter tracking-[-0.5px] text-foreground truncate mt-1">
                  {invitation.is_link_invite ? "Open Link" : invitation.email}
                </p>
              </div>
              <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-3">
                <span className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px]">
                  Your Role
                </span>
                <p className="text-sm font-medium font-inter tracking-[-0.5px] text-foreground capitalize mt-1">
                  {invitation.role}
                </p>
              </div>
            </div>

            {/* Auth Button / Accept Button */}
            {!user ? (
              <div className="space-y-4 pt-2">
                <Button
                  onClick={() => setAuthDialogOpen(true)}
                  className="w-full h-11 rounded-lg font-inter text-sm font-medium tracking-[-0.5px] bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                >
                  Sign In to Join
                </Button>
                {!invitation.is_link_invite && invitation.email && (
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] text-center">
                    This invitation is for {invitation.email}
                  </p>
                )}
              </div>
            ) : emailMatches ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-inter tracking-[-0.5px] text-foreground">
                      Ready to join
                    </p>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] truncate">
                      Signed in as {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleAcceptInvitation}
                  className="w-full h-11 rounded-lg font-inter text-sm font-medium tracking-[-0.5px]"
                  disabled={processing}
                >
                  {processing ? "Joining..." : `Join ${brand.name}`}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-inter tracking-[-0.5px] text-foreground">
                      Email doesn't match
                    </p>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      You're signed in as {user.email}, but this invitation is for {invitation.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-lg font-inter text-sm font-medium tracking-[-0.5px]"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setUser(null);
                    toast.info("Signed out. Please sign in with the correct email.");
                  }}
                >
                  Sign Out & Try Again
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground font-inter tracking-[-0.3px]">
          By joining, you agree to collaborate with {brand.name} on Waliet
        </p>
      </div>

      {/* Auth Dialog */}
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}
