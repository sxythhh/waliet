import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { getStoredUtmParams, clearStoredUtmParams } from "@/hooks/useUtmTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface EmailOTPAuthProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function EmailOTPAuth({ onBack, onSuccess }: EmailOTPAuthProps) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
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
        // User exists but only with OAuth - show them a message
        toast({
          variant: "destructive",
          title: "Different sign-in method required",
          description: checkData.message || "Please use the social login method you originally signed up with.",
        });
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
        toast({
          variant: "destructive",
          title: "Different sign-in method required",
          description: checkData.message || "Please use the social login method you originally signed up with.",
        });
        setStep("email");
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

        <div className="flex flex-col items-center gap-4">
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
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" />
              <InputOTPSlot index={1} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" />
              <InputOTPSlot index={2} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" />
              <InputOTPSlot index={3} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" />
              <InputOTPSlot index={4} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" />
              <InputOTPSlot index={5} className="bg-muted/50 dark:bg-black/50 border-border dark:border-white/20 text-foreground" />
            </InputOTPGroup>
          </InputOTP>

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
            className="h-12 bg-muted/50 dark:bg-black/50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !email}
          className="w-full h-12 font-semibold font-inter"
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
