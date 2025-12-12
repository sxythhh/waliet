import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import discordIcon from "@/assets/discord-icon-new.png";
interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export default function AuthDialog({
  open,
  onOpenChange
}: AuthDialogProps) {
  const {
    trackReferral
  } = useReferralTracking();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
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
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      data: signInData,
      error: signInError
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      if (signInError.message.includes("Invalid login credentials")) {
        // Try to sign up - if user exists, it means wrong password
        const {
          data: signUpData,
          error: signUpError
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });
        setLoading(false);
        if (signUpError) {
          // Check if the error indicates the user already exists
          if (signUpError.message.includes("already") || signUpError.message.includes("exists")) {
            toast({
              variant: "destructive",
              title: "Incorrect password",
              description: "The password you entered is incorrect. Please try again."
            });
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: signUpError.message
            });
          }
        } else if (signUpData.user) {
          await trackReferral(signUpData.user.id);
          toast({
            title: "Account created!",
            description: "Let's set up your profile."
          });
          setNewUserId(signUpData.user.id);
          onOpenChange(false);
          setShowOnboarding(true);
        }
      } else {
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: signInError.message
        });
      }
    } else {
      setLoading(false);
      onOpenChange(false);
      navigate("/dashboard");
    }
  };
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
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
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const {
        error
      } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: resetEmail,
          redirectTo: `${window.location.origin}/auth`
        }
      });
      setLoading(false);
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link."
        });
        setShowResetDialog(false);
        setResetEmail("");
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset email"
      });
    }
  };
  const handleClose = () => {
    setShowEmailForm(false);
    setEmail("");
    setPassword("");
    onOpenChange(false);
  };
  return <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[380px] border-0 bg-[#0a0a0a] shadow-2xl p-0">
          <div className="rounded-xl">
            <div className="text-center space-y-4 pb-2 pt-2">
              <div className="flex items-center justify-center gap-2">
                <img alt="Virality Logo" className="h-10 w-auto" src="/lovable-uploads/cb6c1dd3-b66b-47b3-b6ea-4a3ca8b5a371.png" />
                <span className="font-clash font-bold tracking-tight text-lg text-white">VIRALITY</span>
              </div>
            </div>

            <div className="pt-2 py-0">
              {!showEmailForm ? <>
                  {/* Creator Sign In Section */}
                  <div className="space-y-4">
                    <div className="text-center">
                      
                    </div>

                    <div className="space-y-3">
                      <Button variant="outline" className="w-full h-12 bg-white hover:bg-white/90 text-black hover:text-black border-0 font-semibold font-geist gap-3" style={{
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

                      <Button variant="outline" className="w-full h-12 bg-white/5 hover:bg-white/10 border-0 font-semibold font-geist gap-3 text-white" style={{
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
                </> : (/* Email Form */
            <div className="space-y-4">
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-white">Email</Label>
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="h-12 bg-black/80 border-0 focus-visible:ring-1 focus-visible:ring-primary" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-white">Password</Label>
                      <div className="relative">
                        <Input id="password" type={showPassword ? "text" : "password"} placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} minLength={6} className="h-12 bg-black/80 border-0 focus-visible:ring-1 focus-visible:ring-primary pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="text-right">
                        <button type="button" onClick={() => setShowResetDialog(true)} className="text-sm text-primary hover:underline">
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full h-12 font-semibold text-sm font-geist" style={{
                  letterSpacing: '-0.5px'
                }}>
                      {loading ? "Please wait..." : "Continue"}
                    </Button>
                  </form>
                </div>)}

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

      {/* Password Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-card border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" type="email" placeholder="you@example.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required disabled={loading} className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" />
            </div>
            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>;
}