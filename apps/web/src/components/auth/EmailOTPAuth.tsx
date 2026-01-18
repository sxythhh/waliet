import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { preserveTrackingForOAuth } from "@/hooks/useUtmTracking";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { getStoredUtmParams, clearStoredUtmParams } from "@/hooks/useUtmTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface EmailOTPAuthProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface OAuthAccountInfo {
  provider: string;
  providerName: string;
}

export function EmailOTPAuth({ onBack, onSuccess }: EmailOTPAuthProps) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "oauth-required">("email");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [oauthAccount, setOauthAccount] = useState<OAuthAccountInfo | null>(null);
  const { trackReferral } = useReferralTracking();
  const { toast } = useToast();

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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First check if this email is associated with an OAuth-only account
      const { data: checkData, error: checkError } = await supabase.functions.invoke('check-auth-provider', {
        body: { email },
      });

      if (checkError) {
        console.error('Error checking auth provider:', checkError);
        // Continue anyway - fail gracefully
      } else if (checkData && !checkData.canUseEmailOTP && checkData.exists) {
        // User exists but only with OAuth - show them a dedicated screen
        const providers = checkData.providers || [];
        const oauthProvider = providers.find((p: string) => p !== 'email') || 'google';
        const providerName = oauthProvider === 'google' ? 'Google' :
                            oauthProvider === 'discord' ? 'Discord' :
                            oauthProvider.charAt(0).toUpperCase() + oauthProvider.slice(1);

        setOauthAccount({ provider: oauthProvider, providerName });
        setStep("oauth-required");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // This creates the user if they don't exist
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
        // Track referral for new users
        const referralResult = await trackReferral(data.user.id);
        clearStoredUtmParams();

        if (referralResult.success) {
          toast({
            title: "Welcome to Virality!",
            description: "You're signed in and referral applied successfully.",
          });
        } else {
          toast({
            title: "Welcome to Virality!",
            description: "You're signed in successfully.",
          });
        }

        onSuccess();
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
      // Re-check auth provider (in case account state changed)
      const { data: checkData, error: checkError } = await supabase.functions.invoke('check-auth-provider', {
        body: { email },
      });

      if (checkError) {
        console.error('Error checking auth provider:', checkError);
        // Continue anyway
      } else if (checkData && !checkData.canUseEmailOTP && checkData.exists) {
        const providers = checkData.providers || [];
        const oauthProvider = providers.find((p: string) => p !== 'email') || 'google';
        const providerName = oauthProvider === 'google' ? 'Google' :
                            oauthProvider === 'discord' ? 'Discord' :
                            oauthProvider.charAt(0).toUpperCase() + oauthProvider.slice(1);

        setOauthAccount({ provider: oauthProvider, providerName });
        setStep("oauth-required");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        startResendCooldown();
        toast({
          title: "Code resent!",
          description: "Check your email for a new verification code.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to resend code",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth login for accounts that require it
  const handleOAuthLogin = async (provider: string) => {
    setLoading(true);
    preserveTrackingForOAuth();

    if (provider === 'google') {
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
    } else if (provider === 'discord') {
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
    }
  };

  // OAuth required screen - when user tries email but has OAuth-only account
  if (step === "oauth-required" && oauthAccount) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setOauthAccount(null);
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Try different email
        </button>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Account found</h2>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">{email}</span> is linked to a {oauthAccount.providerName} account.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">
            Please sign in with {oauthAccount.providerName} to access your account.
          </p>
        </div>

        <Button
          onClick={() => handleOAuthLogin(oauthAccount.provider)}
          disabled={loading}
          className="w-full h-12 font-semibold font-inter gap-3"
          style={{ letterSpacing: '-0.5px' }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : oauthAccount.provider === 'google' ? (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          ) : (
            <>
              <img alt="Discord" className="h-5 w-5" src="/lovable-uploads/22519b01-406d-4fcc-a7c7-14444c183410.webp" />
              Continue with Discord
            </>
          )}
        </Button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setOtpCode("");
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Change email
        </button>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-4" role="group" aria-label="6-digit verification code">
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
            aria-describedby="otp-hint"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" aria-label="Digit 1 of 6" />
              <InputOTPSlot index={1} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" aria-label="Digit 2 of 6" />
              <InputOTPSlot index={2} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" aria-label="Digit 3 of 6" />
              <InputOTPSlot index={3} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" aria-label="Digit 4 of 6" />
              <InputOTPSlot index={4} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" aria-label="Digit 5 of 6" />
              <InputOTPSlot index={5} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" aria-label="Digit 6 of 6" />
            </InputOTPGroup>
          </InputOTP>
          <p id="otp-hint" className="sr-only">Enter the 6-digit verification code sent to your email</p>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSendOTP} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp-email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <Input
            id="otp-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="h-12 !bg-transparent border border-border/50 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/40"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !email}
          className="w-full h-12 font-medium font-inter"
          style={{ letterSpacing: '-0.5px' }}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending code...
            </>
          ) : (
            "Send verification code"
          )}
        </Button>
      </form>
    </div>
  );
}
