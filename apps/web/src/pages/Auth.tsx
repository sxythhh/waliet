import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { preserveTrackingForOAuth } from "@/hooks/useUtmTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { getStoredUtmParams, clearStoredUtmParams } from "@/hooks/useUtmTracking";
import { useTheme } from "@/components/ThemeProvider";

// Helper to get/set last used auth method
const LAST_AUTH_METHOD_KEY = "virality_last_auth_method";
type AuthMethod = "google" | "discord" | "email";

const getLastAuthMethod = (): AuthMethod | null => {
  return localStorage.getItem(LAST_AUTH_METHOD_KEY) as AuthMethod | null;
};

const setLastAuthMethod = (method: AuthMethod) => {
  localStorage.setItem(LAST_AUTH_METHOD_KEY, method);
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"main" | "otp">("main");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [lastAuthMethod, setLastAuthMethodState] = useState<AuthMethod | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackReferral } = useReferralTracking();
  const { theme, setTheme } = useTheme();

  // Load last auth method on mount
  useEffect(() => {
    setLastAuthMethodState(getLastAuthMethod());
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isRecoveryMode) {
        const returnUrl = sessionStorage.getItem('applyReturnUrl');
        navigate(returnUrl || "/dashboard");
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      } else if (session && !isRecoveryMode) {
        const returnUrl = sessionStorage.getItem('applyReturnUrl');
        navigate(returnUrl || "/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, isRecoveryMode]);

  // Start cooldown timer for resend
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setLastAuthMethod("google");
    preserveTrackingForOAuth();
    const { error } = await supabase.auth.signInWithOAuth({
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
    setLastAuthMethod("discord");
    preserveTrackingForOAuth();
    const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '1358316231341375518';
    const redirectUri = `${window.location.origin}/discord/callback`;
    const state = btoa(JSON.stringify({ action: 'auth' }));
    const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
    discordAuthUrl.searchParams.set('client_id', DISCORD_CLIENT_ID);
    discordAuthUrl.searchParams.set('redirect_uri', redirectUri);
    discordAuthUrl.searchParams.set('response_type', 'code');
    discordAuthUrl.searchParams.set('scope', 'identify email');
    discordAuthUrl.searchParams.set('state', state);
    window.location.href = discordAuthUrl.toString();
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: getStoredUtmParams() || undefined,
        },
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        setStep("otp");
        startResendCooldown();
        toast({
          title: "Code sent!",
          description: "Check your email for a 6-digit verification code.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send verification code",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Invalid code",
          description: "Please check the code and try again.",
        });
        setOtpCode("");
      } else if (data.user) {
        setLastAuthMethod("email");
        const referralResult = await trackReferral(data.user.id);
        clearStoredUtmParams();
        toast({
          title: "Welcome to Virality!",
          description: referralResult.success
            ? "You're signed in and referral applied successfully."
            : "You're signed in successfully.",
        });
        const returnUrl = sessionStorage.getItem('applyReturnUrl');
        navigate(returnUrl || "/dashboard");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to verify code",
      });
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      } else {
        startResendCooldown();
        toast({ title: "Code resent!", description: "Check your email for a new verification code." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to resend code" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Password updated", description: "Your password has been successfully updated." });
      setIsRecoveryMode(false);
      setNewPassword("");
      navigate("/dashboard");
    }
  };

  // Password Recovery Mode
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen flex">
        <SEOHead title="Reset Password" description="Reset your Virality account password" noIndex={true} />
        {/* Left Panel - Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-[400px] space-y-8">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src="/lovable-uploads/05566301-7c21-4e5b-9e22-a097cbaf1442.png" alt="Virality" className="h-8 w-auto" />
            </div>

            {/* Header */}
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight font-inter">Reset Password</h1>
              <p className="text-muted-foreground mt-1 font-inter text-sm">Enter your new password below</p>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium text-foreground font-inter">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="h-12 bg-background border border-border rounded-lg px-4 pr-10 font-inter focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 font-semibold font-inter rounded-lg" style={{ letterSpacing: '-0.5px' }} disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </div>
        </div>

      </div>
    );
  }

  // Main Auth Page
  return (
    <div className="min-h-screen flex">
      <SEOHead title="Sign In" description="Sign in to your Virality account" noIndex={true} />

      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-background relative">
        {/* Theme Toggle - Top Right */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors"
          aria-label="Toggle theme"
        >
          <span
            className="material-symbols-rounded text-[20px] text-muted-foreground"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
          >
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>

        <div className="w-full max-w-[400px] space-y-8">
          {/* Virality Logo + Wordmark */}
          {step === "main" && (
            <div className="flex items-center justify-center gap-2">
              <img
                alt="Virality Logo"
                className="h-6 w-6"
                src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png"
                width="24"
                height="24"
              />
              <span className="text-[17px] font-clash font-semibold text-foreground tracking-[-0.4px] -ml-0.5">
                VIRALITY
              </span>
            </div>
          )}

          {/* Header - only show for OTP step */}
          {step === "otp" && (
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight font-inter">
                Check your email
              </h1>
              <p className="text-muted-foreground mt-1 font-inter text-sm">
                We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
              </p>
            </div>
          )}

          {/* Main Auth Options */}
          {step === "main" && (
            <div className="space-y-6">
              {/* Email Input */}
              <form onSubmit={handleSendOTP} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email-main"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 pl-12 pr-28 bg-background border border-border rounded-lg font-inter focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 font-semibold font-inter rounded-md"
                    style={{ letterSpacing: '-0.5px' }}
                    disabled={!email || loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
                  </Button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-4 text-muted-foreground font-inter">OR</span>
                </div>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-12 bg-background hover:bg-muted dark:hover:bg-[#0F0F0F] hover:text-foreground border border-border text-foreground font-semibold font-inter gap-3 rounded-lg relative"
                  style={{ letterSpacing: '-0.5px' }}
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                  {lastAuthMethod === "google" && (
                    <span className="absolute right-3 px-2 py-0.5 text-[10px] font-medium bg-primary/15 text-primary rounded">
                      Last used
                    </span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 bg-[#5865F2] hover:bg-[#5865F2]/90 border-0 text-white font-semibold font-inter gap-3 rounded-lg relative"
                  style={{ letterSpacing: '-0.5px' }}
                  onClick={handleDiscordSignIn}
                  disabled={loading}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Continue with Discord
                  {lastAuthMethod === "discord" && (
                    <span className="absolute right-3 px-2 py-0.5 text-[10px] font-medium bg-white/20 text-white rounded">
                      Last used
                    </span>
                  )}
                </Button>
              </div>

              {/* Terms */}
              <p className="text-xs text-muted-foreground text-center font-inter leading-relaxed">
                By signing up, you agree to the{" "}
                <a href="https://virality.gg/terms" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:text-primary">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="https://virality.gg/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:text-primary">
                  Privacy Policy
                </a>
                .
              </p>

            </div>
          )}

          {/* OTP Step */}
          {step === "otp" && (
            <div className="space-y-6">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(value) => {
                  setOtpCode(value);
                  if (value.length === 6) {
                    handleVerifyOTP(value);
                  }
                }}
                disabled={loading}
                className="w-full justify-start"
              >
                <InputOTPGroup className="w-full justify-between">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-12 w-full max-w-[60px] text-lg bg-background border border-border rounded-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-inter">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </div>
              )}

              <div className="flex items-center justify-between text-sm font-inter">
                <p className="text-muted-foreground">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0 || loading}
                    className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setStep("main");
                    setOtpCode("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
