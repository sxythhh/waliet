import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import viralityLogo from "@/assets/virality-logo.webp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
export default function Auth() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const { trackReferral } = useReferralTracking();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session && !isRecoveryMode) {
        navigate("/dashboard");
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      } else if (session && !isRecoveryMode) {
        navigate("/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, isRecoveryMode]);
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      data,
      error
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          username
        }
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
      // Track referral if there's a referral code
      if (data.user) {
        await trackReferral(data.user.id);
      }
      toast({
        title: "Success!",
        description: "Account created successfully. Welcome to Virality!"
      });
    }
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };
  const handleDiscordSignIn = async () => {
    setLoading(true);
    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
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
        title: "Password updated",
        description: "Your password has been successfully updated."
      });
      setIsRecoveryMode(false);
      setNewPassword("");
      navigate("/dashboard");
    }
  };
  if (isRecoveryMode) {
    return <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border bg-[#0b0b0b]">
          <CardHeader className="text-center space-y-1 bg-[#0b0b0b]">
            <div className="flex justify-center">
              <img src={viralityLogo} alt="Virality Logo" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">Reset Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent className="bg-[#0b0b0b]">
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="h-11 bg-[#0F0F0F] border-2 border-transparent focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors pr-10"
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
              <Button type="submit" className="w-full h-11 font-chakra font-semibold" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>;
  }

  return <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border bg-[#0b0b0b]">
        <CardHeader className="text-center space-y-1 pb-0 bg-[#0b0b0b] mt-2">
          <div className="flex justify-center">
            <img src={viralityLogo} alt="Virality Logo" className="h-12 w-auto" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">Welcome to Virality</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="bg-[#0b0b0b]">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
              <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                  <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="h-11 bg-[#0F0F0F] border-2 border-transparent focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input id="signin-password" type={showSignInPassword ? "text" : "password"} placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="h-11 bg-[#0F0F0F] border-2 border-transparent focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors pr-10" />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                    <DialogTrigger asChild>
                      <button type="button" className="text-sm text-primary hover:underline text-right w-full">
                        Forgot password?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0b0b0b] border">
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          Enter your email address and we'll send you a link to reset your password.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="you@example.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="h-11 bg-[#0F0F0F] border-2 border-transparent focus-visible:border-primary"
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Sending..." : "Send Reset Link"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <Button type="submit" className="w-full h-11 mt-6 font-chakra font-semibold tracking-[-0.5px] text-[15px]" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0b0b0b] px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-11 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-700 border-gray-300 font-chakra font-semibold tracking-[-0.5px]"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-sm font-medium">Username</Label>
                  <Input id="signup-username" type="text" placeholder="creator123" value={username} onChange={e => setUsername(e.target.value)} required disabled={loading} className="h-11 bg-[#0F0F0F] border-2 border-transparent focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="h-11 bg-[#0F0F0F] border-2 border-transparent focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input id="signup-password" type={showSignUpPassword ? "text" : "password"} placeholder="Create secure password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} minLength={6} className="h-11 bg-[#0F0F0F] border-2 border-transparent focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors pr-10" />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full h-11 mt-6 font-chakra font-semibold tracking-[-0.5px] text-[15px]" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0b0b0b] px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-11 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-700 border-gray-300 font-chakra font-semibold tracking-[-0.5px]"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
}