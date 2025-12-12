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

  const handleCheckVerification = useCallback(async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    
    try {
      // TODO: This will call the API to scrape and verify
      // For now, this is just a placeholder that will be implemented with the API
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Checking...",
        description: "Verification API will be connected in next step",
      });
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Could not verify your account. Please make sure the code is in your bio.",
      });
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, toast]);

  const handleBack = () => {
    setStep("input");
    setVerificationCode("");
    setTimeRemaining(VERIFICATION_TIME_SECONDS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-[#1a1a1a] border-border/50">
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
                  <SelectTrigger className="w-full h-12 bg-[#0a0a0a] border-border/50 font-inter tracking-[-0.5px]">
                    <SelectValue>
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(selectedPlatform)}
                        <span>{getPlatformLabel(selectedPlatform)}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-border/50">
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
                    className="h-12 bg-[#0a0a0a] border-border/50 pl-8 font-inter tracking-[-0.5px]"
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
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-lg bg-[#0a0a0a] flex items-center justify-center">
                {getPlatformIcon(selectedPlatform, "h-7 w-7")}
              </div>
              <div>
                <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">
                  Verify @{username}
                </h2>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                  {getPlatformLabel(selectedPlatform)} Account
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center mb-6">
              <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/30 font-inter tracking-[-0.5px]">
                Waiting for Verification
              </span>
            </div>

            {/* Verification Code Section */}
            <div className="space-y-2 mb-6">
              <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
                Verification Code
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 h-14 bg-[#0a0a0a] rounded-lg flex items-center justify-center border border-border/30">
                  <span className="text-xl font-bold font-mono tracking-[0.2em]">
                    {verificationCode}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  className="h-14 w-14 bg-[#0a0a0a] border-border/30 hover:bg-[#2a2a2a]"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center font-inter tracking-[-0.5px]">
                Add this code to your {getPlatformLabel(selectedPlatform)} bio
              </p>
            </div>

            {/* Time Remaining */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                  Time Remaining
                </span>
                <span className="text-lg font-semibold font-mono">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-1.5 bg-[#0a0a0a]"
              />
            </div>

            {/* Check Verification Button */}
            <Button
              onClick={handleCheckVerification}
              disabled={isChecking || timeRemaining === 0}
              className="w-full h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-border/30 font-inter tracking-[-0.5px] mb-4"
            >
              {isChecking ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Check Verification Status
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center font-inter tracking-[-0.5px]">
              We'll automatically check every 10 seconds, or click the button above to check now.
            </p>

            {/* Back Button */}
            <button
              onClick={handleBack}
              className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-inter tracking-[-0.5px] flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
