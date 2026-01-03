import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { preserveTrackingForOAuth } from "@/hooks/useUtmTracking";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { EmailOTPAuth } from "@/components/auth/EmailOTPAuth";
interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export default function AuthDialog({
  open,
  onOpenChange
}: AuthDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;
      const {
        data: profile
      } = await supabase.from("profiles").select("account_type, phone_number").eq("id", session.user.id).single();

      // Show onboarding if user doesn't have phone number set
      if (profile && !profile.phone_number) {
        setNewUserId(session.user.id);
        setShowOnboarding(true);
        onOpenChange(false);
      }
    };
    if (open) {
      checkOnboardingStatus();
    }
  }, [open, onOpenChange]);
  const handleGoogleSignIn = async () => {
    setLoading(true);
    // Preserve UTM and referral params before OAuth redirect
    preserveTrackingForOAuth();

    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };
  const handleDiscordSignIn = () => {
    setLoading(true);
    // Preserve UTM and referral params before OAuth redirect
    preserveTrackingForOAuth();

    const DISCORD_CLIENT_ID = '1358316231341375518';
    const redirectUri = `${window.location.origin}/discord/callback`;
    const state = btoa(JSON.stringify({
      action: 'auth'
    }));
    const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
    discordAuthUrl.searchParams.set('client_id', DISCORD_CLIENT_ID);
    discordAuthUrl.searchParams.set('redirect_uri', redirectUri);
    discordAuthUrl.searchParams.set('response_type', 'code');
    discordAuthUrl.searchParams.set('scope', 'identify email');
    discordAuthUrl.searchParams.set('state', state);
    window.location.href = discordAuthUrl.toString();
  };
  const handleClose = () => {
    setShowEmailForm(false);
    onOpenChange(false);
  };
  return <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[380px] border-0 bg-white dark:bg-[#050505] shadow-2xl p-6">
          <div className="rounded-xl">
            <div className="text-center space-y-4 pb-2 pt-2">
              <div className="flex items-center justify-center gap-2">
                <img alt="Virality Logo" className="h-7 w-auto" src="/lovable-uploads/8052c9b2-7adb-44e5-85ad-afd4a6c0a1a1.png" />
                <span className="font-clash font-bold tracking-tight text-lg text-foreground">VIRALITY</span>
              </div>
            </div>

            <div className="pt-2 py-0">
              {!showEmailForm ? <>
                  {/* Creator Sign In Section */}
                  <div className="space-y-4">
                    <div className="text-center">
                      
                    </div>

                    <div className="space-y-3">
                      <Button variant="outline" className="w-full h-12 bg-white hover:bg-white/90 text-black hover:text-black border-gray-200 dark:border-0 font-semibold font-geist gap-3" style={{
                    letterSpacing: '-0.5px'
                  }} onClick={handleGoogleSignIn} disabled={loading}>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                      </Button>

                      <Button variant="outline" className="w-full h-12 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white hover:text-white border-0 font-semibold font-geist gap-3" style={{
                    letterSpacing: '-0.5px'
                  }} onClick={handleDiscordSignIn} disabled={loading}>
                        <img alt="Discord" className="h-5 w-5" src="/lovable-uploads/7cbccb5b-27cd-4ef1-9051-677ab8901520.webp" />
                        Continue with Discord
                      </Button>

                      <Button variant="outline" className="w-full h-12 bg-black/5 hover:bg-black hover:text-white dark:bg-white/5 dark:hover:bg-white/10 border-0 font-semibold font-geist gap-3 text-foreground dark:text-white" style={{
                    letterSpacing: '-0.5px'
                  }} onClick={() => setShowEmailForm(true)} disabled={loading}>
                        <Mail className="h-5 w-5" />
                        Continue with Email
                      </Button>
                    </div>
                  </div>

                  {/* Divider */}
                  

                  {/* Client Sign In Section */}
                  <div className="space-y-4">
                    
                  </div>
                </> : (
                /* Email OTP Login */
                <EmailOTPAuth
                  onBack={() => setShowEmailForm(false)}
                  onSuccess={() => {
                    handleClose();
                    navigate("/dashboard");
                  }}
                />
              )}

              {/* Terms and Conditions */}
              <div className="mt-8 text-center" style={{
              letterSpacing: '-0.3px'
            }}>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By logging in, you agree to our{" "}
                  <a href="/creator-terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Creator Terms & Conditions
                  </a>
                  ,{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Terms of Service
                  </a>
                  , and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Dialog */}
      {newUserId && <OnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} userId={newUserId} />}
    </>;
}