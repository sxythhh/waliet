"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";

interface LoginFormProps {
  error?: string;
  redirectTo: string;
}

export function LoginForm({ error: initialError, redirectTo }: LoginFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"main" | "magiclink" | "password">("main");
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push(redirectTo);
      }
    });
  }, [router, redirectTo, supabase.auth]);

  // Reset password when changing auth mode
  useEffect(() => {
    setPassword("");
  }, [authMode]);

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleWhopSignIn = () => {
    window.location.href = "/api/auth/whop";
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Use port 3000 for local dev (whop-proxy port)
      const baseUrl = window.location.origin.includes('localhost')
        ? 'http://localhost:3000'
        : window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${baseUrl}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        setStep("magiclink");
        startResendCooldown();
        toast({
          title: "Check your email!",
          description: "We sent you a magic link. Click it to sign in.",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send verification email";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const baseUrl = window.location.origin.includes('localhost')
        ? 'http://localhost:3000'
        : window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${baseUrl}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      } else {
        startResendCooldown();
        toast({ title: "Email resent!", description: "Check your email for a new magic link." });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to resend email";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message,
          });
        } else if (data.user && !data.session) {
          // Email confirmation required
          toast({
            title: "Check your email",
            description: "We sent you a confirmation link to verify your account.",
          });
          setStep("magiclink");
          startResendCooldown();
        } else if (data.session) {
          // Auto-confirmed (e.g., in dev mode)
          toast({
            title: "Account created!",
            description: "Welcome to Waliet!",
          });
          router.push(redirectTo);
          router.refresh();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          toast({
            variant: "destructive",
            title: "Invalid credentials",
            description: "Please check your email and password.",
          });
        } else if (data.user) {
          toast({
            title: "Welcome back!",
            description: "You're signed in successfully.",
          });
          router.push(redirectTo);
          router.refresh();
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithEmail = () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address.",
      });
      return;
    }
    setStep("password");
  };

  return (
    <>
    <Toaster />
    <div className="w-full max-w-[400px] space-y-8">
      {/* Logo */}
      {step === "main" && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-[17px] font-semibold text-foreground tracking-[-0.4px]">
            WALIET
          </span>
        </div>
      )}

      {/* Header - show for password and magiclink steps */}
      {step === "password" && (
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {authMode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {authMode === "signup" ? "Enter a password to create your account" : "Enter your password to sign in"}
          </p>
        </div>
      )}

      {step === "magiclink" && (
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Check your email
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            We sent a magic link to <span className="text-foreground font-medium">{email}</span>
          </p>
        </div>
      )}

      {/* Main Auth Options */}
      {step === "main" && (
        <div className="space-y-6">
          {/* Email Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleContinueWithEmail(); }} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email-main"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 pl-12 pr-28 bg-background border border-border rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 font-semibold rounded-md"
                style={{ letterSpacing: "-0.5px" }}
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
              <span className="bg-background px-4 text-muted-foreground">OR</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 bg-background hover:bg-muted border border-border text-foreground font-semibold gap-3 rounded-lg"
              style={{ letterSpacing: "-0.5px" }}
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
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 bg-[#FF6243] hover:bg-[#FF6243]/90 border-0 text-white font-semibold gap-3 rounded-lg"
              style={{ letterSpacing: "-0.5px" }}
              onClick={handleWhopSignIn}
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              Continue with Whop
            </Button>
          </div>

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            By signing up, you agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:text-primary">
              Privacy Policy
            </a>
            .
          </p>

          {initialError && (
            <p className="text-sm text-destructive text-center">{initialError}</p>
          )}
        </div>
      )}

      {/* Password Step */}
      {step === "password" && (
        <div className="space-y-6">
          <form onSubmit={handlePasswordAuth} className="space-y-4">
            {/* Email display */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                disabled
                className="h-12 pl-12 bg-muted/50 border border-border rounded-lg text-muted-foreground"
              />
            </div>

            {/* Password input */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={authMode === "signup" ? "Create a password" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={authMode === "signup" ? 8 : undefined}
                className="h-12 pl-12 pr-12 bg-background border border-border rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {authMode === "signup" && (
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-12 font-semibold rounded-lg"
              style={{ letterSpacing: "-0.5px" }}
              disabled={!password || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : authMode === "signup" ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Toggle auth mode */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {authMode === "signup" ? "Already have an account? " : "Don't have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "signup" ? "signin" : "signup");
                setPassword("");
              }}
              className="text-primary hover:underline font-medium"
            >
              {authMode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground">OR</span>
            </div>
          </div>

          {/* Magic link option */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 bg-background hover:bg-muted border border-border text-foreground font-semibold gap-3 rounded-lg"
            style={{ letterSpacing: "-0.5px" }}
            onClick={handleSendOTP}
            disabled={loading}
          >
            <Mail className="h-5 w-5" />
            Continue with magic link
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep("main");
              setPassword("");
            }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Change email
          </button>
        </div>
      )}

      {/* Magic Link Sent Step */}
      {step === "magiclink" && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Click the link in your email to sign in.
              <br />
              You can close this tab after clicking the link.
            </p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Didn&apos;t receive it?{" "}
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || loading}
                className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
              </button>
            </p>

            <button
              type="button"
              onClick={() => {
                setStep("main");
                setPassword("");
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Change email
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
