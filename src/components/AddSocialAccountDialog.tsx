import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, ArrowRight, ArrowLeft, X, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import xLogo from "@/assets/x-logo.png";
import xLogoLight from "@/assets/x-logo-light.png";

interface AddSocialAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Platform = "tiktok" | "instagram" | "youtube" | "twitter";
type Step = "input" | "verification";

const VERIFICATION_TIME_SECONDS = 600; // 10 minutes

// Generate a random verification code
const generateVerificationCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export function AddSocialAccountDialog({
  open,
  onOpenChange,
  onSuccess
}: AddSocialAccountDialogProps) {
  const [step, setStep] = useState<Step>("input");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("tiktok");
  const [username, setUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(VERIFICATION_TIME_SECONDS);
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep("input");
      setUsername("");
      setVerificationCode("");
      setTimeRemaining(VERIFICATION_TIME_SECONDS);
      setIsChecking(false);
      setCopied(false);
    }
  }, [open]);

  // Generate verification code when moving to verification step
  useEffect(() => {
    if (step === "verification" && !verificationCode) {
      setVerificationCode(generateVerificationCode());
      setTimeRemaining(VERIFICATION_TIME_SECONDS);
    }
  }, [step, verificationCode]);

  // Timer countdown
  useEffect(() => {
    if (step !== "verification" || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeRemaining]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = (timeRemaining / VERIFICATION_TIME_SECONDS) * 100;

  const getPlatformLabel = (platform: Platform) => {
    switch (platform) {
      case "tiktok":
        return "TikTok";
      case "instagram":
        return "Instagram";
      case "youtube":
        return "YouTube";
      case "twitter":
        return "X (Twitter)";
    }
  };

  const getPlatformIcon = (platform: Platform, size: string = "h-5 w-5") => {
    const isLightMode = resolvedTheme === "light";
    switch (platform) {
      case "tiktok":
        return <img src={isLightMode ? tiktokLogoBlack : tiktokLogo} alt="TikTok" className={size} />;
      case "instagram":
        return <img src={isLightMode ? instagramLogoBlack : instagramLogo} alt="Instagram" className={size} />;
      case "youtube":
        return <img src={isLightMode ? youtubeLogoBlack : youtubeLogo} alt="YouTube" className={size} />;
      case "twitter":
        return <img src={isLightMode ? xLogoLight : xLogo} alt="X" className={size} />;
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(verificationCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Verification code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy code",
      });
    }
  };

  const handleContinueToVerification = () => {
    if (!username.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your username",
      });
      return;
    }
    setVerificationCode(""); // Reset to generate new code
    setStep("verification");
  };

  const getAccountLink = (platform: Platform, username: string) => {
    switch (platform) {
      case "tiktok":
        return `https://tiktok.com/@${username}`;
      case "instagram":
        return `https://instagram.com/${username}`;
      case "youtube":
        return `https://youtube.com/@${username}`;
      case "twitter":
        return `https://x.com/${username}`;
    }
  };

  const handleCheckVerification = useCallback(async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    
    try {
      // Only TikTok and Instagram are supported for now
      if (selectedPlatform !== "tiktok" && selectedPlatform !== "instagram") {
        toast({
          variant: "destructive",
          title: "Not Supported",
          description: `${getPlatformLabel(selectedPlatform)} verification is not yet available.`,
        });
        setIsChecking(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-tiktok-bio', {
        body: { username, verificationCode, platform: selectedPlatform }
      });

      if (error) {
        throw new Error(error.message || 'Failed to verify');
      }

      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.verified) {
        // Success! Save the account
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error: insertError } = await supabase
          .from("social_accounts")
          .insert({
            user_id: user.id,
            platform: selectedPlatform,
            username: username,
            account_link: getAccountLink(selectedPlatform, username),
            follower_count: data.user?.followerCount || null,
            is_verified: true
          });

        if (insertError) throw insertError;

        toast({
          title: "Account Verified!",
          description: `@${username} has been connected successfully.`,
        });

        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Code Not Found",
          description: "The verification code was not found in your bio. Please add it and try again.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Could not verify your account. Please make sure the code is in your bio.",
      });
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, toast, selectedPlatform, username, verificationCode, onSuccess, onOpenChange]);

  const handleBack = () => {
    setStep("input");
    setVerificationCode("");
    setTimeRemaining(VERIFICATION_TIME_SECONDS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-[#0a0a0a] border-0 [&>button]:hidden">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {step === "input" ? (
          /* Step 1: Platform & Username Input */
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold font-inter tracking-[-0.5px]">
                Connect Social Account
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-inter tracking-[-0.5px]">
                Verify ownership by adding a code to your bio
              </p>
            </div>

            <div className="space-y-5">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
                  Platform
                </Label>
                <Select value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as Platform)}>
                  <SelectTrigger className="w-full h-12 bg-[#141414] border-0 font-inter tracking-[-0.5px]">
                    <SelectValue>
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(selectedPlatform)}
                        <span>{getPlatformLabel(selectedPlatform)}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-0">
                    {(["tiktok", "instagram", "youtube", "twitter"] as Platform[]).map((platform) => (
                      <SelectItem key={platform} value={platform} className="font-inter tracking-[-0.5px]">
                        <div className="flex items-center gap-3">
                          {getPlatformIcon(platform)}
                          <span>{getPlatformLabel(platform)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Username Input */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium font-inter tracking-[-0.5px]">
                  Username
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="username"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/@/g, "").trim())}
                    className="h-12 bg-[#141414] border-0 pl-8 font-inter tracking-[-0.5px]"
                  />
                </div>
              </div>

              {/* Continue Button */}
              <Button
                onClick={handleContinueToVerification}
                className="w-full h-12 bg-primary hover:bg-primary/90 font-inter tracking-[-0.5px] border-t border-t-[#4a86ff]/50 mt-4"
              >
                <span className="flex items-center gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Verification */
          <div className="p-5">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#141414] flex items-center justify-center">
                  {getPlatformIcon(selectedPlatform, "h-5 w-5")}
                </div>
                <div>
                  <h2 className="text-base font-semibold font-inter tracking-[-0.5px]">
                    @{username}
                  </h2>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                    {getPlatformLabel(selectedPlatform)}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 font-inter tracking-[-0.5px]">
                Pending
              </span>
            </div>

            {/* Verification Code - Compact */}
            <div className="bg-[#141414] rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  Add to your bio
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-inter tracking-[-0.5px]"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="bg-[#0a0a0a] rounded-md py-3 px-4 text-center">
                <span className="text-lg font-bold font-mono tracking-[0.25em]">
                  {verificationCode}
                </span>
              </div>
            </div>

            {/* Timer with Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  Expires in
                </span>
                <span className="text-sm font-semibold font-mono text-foreground">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-1.5 bg-[#1a1a1a]"
              />
            </div>

            {/* Check Button */}
            <Button
              onClick={handleCheckVerification}
              disabled={isChecking || timeRemaining === 0}
              className="w-full h-11 bg-primary hover:bg-primary/90 border-0 border-t border-t-[#4a86ff]/50 font-inter tracking-[-0.5px]"
            >
              {isChecking ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Check Verification"
              )}
            </Button>

            {/* Back Link */}
            <button
              onClick={handleBack}
              className="w-full mt-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-inter tracking-[-0.5px] flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Go back
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
