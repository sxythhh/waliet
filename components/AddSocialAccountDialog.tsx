import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { ResponsiveDialog, ResponsiveDialogContent } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, ArrowLeft, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import xLogo from "@/assets/x-logo.png";
import xLogoLight from "@/assets/x-logo-light.png";
type Platform = "tiktok" | "instagram" | "youtube" | "twitter";

// Verification Step Component with timer, numbered steps, and warning
interface VerificationStepProps {
  username: string;
  platform: Platform;
  verificationCode: string;
  copied: boolean;
  isChecking: boolean;
  cooldownRemaining: number;
  getPlatformIcon: (platform: Platform, size?: string) => JSX.Element | null;
  getPlatformLabel: (platform: Platform) => string;
  handleCopyCode: () => void;
  handleBack: () => void;
  handleCheckVerification: () => void;
}
function VerificationStep({
  username,
  platform,
  verificationCode,
  copied,
  isChecking,
  cooldownRemaining,
  getPlatformIcon,
  getPlatformLabel,
  handleCopyCode,
  handleBack,
  handleCheckVerification,
}: VerificationStepProps) {
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const TOTAL_TIME = 600;
  useEffect(() => {
    if (timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const progressPercent = timeRemaining / TOTAL_TIME * 100;
  const getSettingsLink = () => {
    switch (platform) {
      case "tiktok":
        return "https://www.tiktok.com/setting";
      case "instagram":
        return "https://www.instagram.com/accounts/edit/";
      case "youtube":
        return "https://studio.youtube.com/channel/editing/details";
      default:
        return "";
    }
  };
  const steps = [`Open the ${getPlatformLabel(platform)} app on your phone`, "Go to your profile", 'Tap "Edit profile"', "Add the verification code to your Bio field", 'Tap "Save" to confirm'];
  return <div className="flex flex-col max-h-[85vh]">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        {/* Header with account info */}
        <div className="pb-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center">
            {getPlatformIcon(platform, "h-5 w-5")}
          </div>
          <div>
            <h2 className="text-sm font-semibold font-inter tracking-[-0.5px]">@{username}</h2>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">{getPlatformLabel(platform)}</p>
          </div>
        </div>

        {/* Verification Code Box */}
        <div className="pb-4">
          <div className="bg-muted/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Your verification code</span>
              <button onClick={handleCopyCode} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-inter tracking-[-0.5px]">
                {copied ? <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </> : <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>}
              </button>
            </div>
            <div onClick={handleCopyCode} className="bg-background rounded-lg py-4 px-4 text-center cursor-pointer hover:bg-background/80 transition-colors">
              <span className="text-xl font-bold font-mono tracking-[0.3em] text-foreground">{verificationCode}</span>
            </div>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Time remaining</span>
            <span className="text-sm font-semibold font-inter tracking-[-0.5px]">{formatTime(timeRemaining)}</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-muted/30" />
        </div>

        {/* How to add the code steps */}
        <div className="pb-4">
          <h3 className="text-sm font-semibold font-inter tracking-[-0.5px] mb-3">How to add the code:</h3>
          <div className="space-y-2.5">
            {steps.map((step, index) => <div key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-primary-foreground">{index + 1}</span>
                </div>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] leading-5">{step}</p>
              </div>)}
          </div>
        </div>

        {/* Open settings link */}
        <a href={getSettingsLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors font-inter tracking-[-0.5px] mb-4">
          Open {getPlatformLabel(platform)} settings
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        {/* Warning box - more compact on mobile */}
        <div className="bg-muted/30 rounded-xl p-3 mb-3 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
            Make sure your account is <strong className="text-foreground">public</strong>. You can remove the code after verification.
          </p>
        </div>

      </div>

      {/* Sticky footer buttons */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border/50 bg-background">
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleBack} className="w-full sm:w-auto sm:flex-1 h-11 rounded-xl font-inter tracking-[-0.5px] text-sm bg-muted/30 hover:bg-muted hover:text-foreground">
            Cancel
          </Button>
          <Button onClick={handleCheckVerification} disabled={isChecking || cooldownRemaining > 0 || timeRemaining <= 0} className="w-full sm:w-auto sm:flex-1 h-11 rounded-xl font-inter tracking-[-0.5px] text-sm">
            {isChecking ? <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Verifying...
              </> : cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : <>
                <Check className="h-4 w-4 mr-1.5" />
                Verify
              </>}
          </Button>
        </div>
      </div>
    </div>;
}
interface AddSocialAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialPlatform?: Platform;
}
type Step = "input" | "verification";

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
  onSuccess,
  initialPlatform
}: AddSocialAccountDialogProps) {
  const [step, setStep] = useState<Step>("input");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("tiktok");
  const [username, setUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const {
    toast
  } = useToast();
  const {
    resolvedTheme
  } = useTheme();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep("input");
      setUsername("");
      setVerificationCode("");
      setIsChecking(false);
      setCopied(false);
      setCooldownRemaining(0);
      if (initialPlatform) {
        setSelectedPlatform(initialPlatform);
      }
    }
  }, [open, initialPlatform]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining(cooldownRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  // Generate verification code when moving to verification step
  useEffect(() => {
    if (step === "verification" && !verificationCode) {
      setVerificationCode(generateVerificationCode());
    }
  }, [step, verificationCode]);

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
        description: "Verification code copied to clipboard"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy code"
      });
    }
  };
  const handleContinueToVerification = async () => {
    if (!username.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your username"
      });
      return;
    }

    // Check if this account already exists in the database
    const {
      data: existingAccount,
      error: checkError
    } = await supabase.from("social_accounts").select("id, user_id").eq("platform", selectedPlatform).eq("username", username.toLowerCase()).maybeSingle();
    if (checkError) {
      console.error("Error checking existing account:", checkError);
    }
    if (existingAccount) {
      toast({
        variant: "destructive",
        title: "Account Already Connected",
        description: "This social account is already connected to another user."
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
        // Handle channel ID or URL
        if (username.startsWith('UC') || username.includes('youtube.com')) {
          return username.includes('youtube.com') ? username : `https://youtube.com/channel/${username}`;
        }
        return `https://youtube.com/@${username}`;
      case "twitter":
        return `https://x.com/${username}`;
    }
  };
  const getPlaceholderText = (platform: Platform) => {
    switch (platform) {
      case "youtube":
        return "Channel ID or @handle";
      default:
        return "username";
    }
  };
  const showAtSymbol = selectedPlatform !== "youtube";
  const [isContinuing, setIsContinuing] = useState(false);
  const handleCheckVerification = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      // Only TikTok, Instagram, and YouTube are supported for now
      if (selectedPlatform !== "tiktok" && selectedPlatform !== "instagram" && selectedPlatform !== "youtube") {
        toast({
          variant: "destructive",
          title: "Not Supported",
          description: `${getPlatformLabel(selectedPlatform)} verification is not yet available.`
        });
        setIsChecking(false);
        return;
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('verify-social-bio', {
        body: {
          username,
          verificationCode,
          platform: selectedPlatform
        }
      });
      if (error) {
        throw new Error(error.message || 'Failed to verify');
      }
      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }
      if (data.verified) {
        // Success! Save the account
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const {
          error: insertError
        } = await supabase.from("social_accounts").insert({
          user_id: user.id,
          platform: selectedPlatform,
          username: username,
          account_link: getAccountLink(selectedPlatform, username),
          follower_count: data.user?.followerCount || null,
          is_verified: true,
          bio: data.bio || null,
          avatar_url: data.user?.avatar || null
        });
        if (insertError) throw insertError;
        toast({
          title: "Account Verified!",
          description: `@${username} has been connected successfully.`
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Code Not Found",
          description: selectedPlatform === "instagram" ? "The verification code was not found in your Instagram bio. Instagram may cache your profile—wait 1–2 minutes after updating your bio, then try again." : "The verification code was not found in your bio. Please add it and try again."
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "";
      const isRateLimit = errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit");
      toast({
        variant: "destructive",
        title: isRateLimit ? "API Rate Limited" : "Verification Failed",
        description: isRateLimit ? "Too many verification attempts. Please try again in a few minutes." : selectedPlatform === "instagram" ? "Could not verify your account. Make sure the code is in your Instagram bio and wait 1–2 minutes after updating before trying again." : error.message || "Could not verify your account. Please make sure the code is in your bio."
      });
      setCooldownRemaining(30);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, toast, selectedPlatform, username, verificationCode, onSuccess, onOpenChange]);
  const handleBack = () => {
    if (step === "manual") {
      setStep("verification");
      setProfileUrl("");
      setUrlError(null);
    } else {
      setStep("input");
      setVerificationCode("");
    }
  };
  const handleContinueClick = async () => {
    setIsContinuing(true);
    try {
      await handleContinueToVerification();
    } finally {
      setIsContinuing(false);
    }
  };
  return <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="p-0 overflow-hidden bg-background border-border [&>button]:hidden">
        {step === "input" ? <div className="flex flex-col max-h-[85vh]">
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto">
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">Connect Account</h2>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">
                  Select a platform to connect
                </p>
              </div>

              {/* Platform Selection - Vertical List */}
              <div className="px-6 pb-4">
                <div className="space-y-2">
                  {(["tiktok", "instagram", "youtube", "twitter"] as Platform[]).map(platform => {
                    const isSelected = selectedPlatform === platform;
                    return (
                      <button
                        key={platform}
                        onClick={() => setSelectedPlatform(platform)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 border-2 ${
                          isSelected
                            ? 'border-primary bg-primary/10 dark:bg-primary/15'
                            : 'border-transparent bg-muted/50 dark:bg-muted/30 hover:bg-muted/80 dark:hover:bg-muted/50'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-primary'
                            : 'bg-white dark:bg-background'
                        }`}>
                          {getPlatformIcon(platform, "h-4 w-4")}
                        </div>

                        {/* Platform name */}
                        <span className={`text-sm font-medium font-inter tracking-[-0.3px] flex-1 text-left ${
                          isSelected ? 'text-foreground' : 'text-foreground/80'
                        }`}>
                          {getPlatformLabel(platform)}
                        </span>

                        {/* Radio indicator */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/30 dark:border-muted-foreground/40'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Username Input */}
              <div className="px-6 pb-4 space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">
                  {selectedPlatform === "youtube" ? "Channel ID or Handle" : "Username"}
                </Label>
                <div className="relative flex items-center">
                  {showAtSymbol && (
                    <div className="absolute left-4 z-10 flex items-center justify-center pointer-events-none">
                      <span className="text-muted-foreground text-base font-medium">@</span>
                    </div>
                  )}
                  <Input
                    id="username"
                    placeholder={getPlaceholderText(selectedPlatform)}
                    value={username}
                    onChange={e => {
                      let value = e.target.value.trim();

                      // Extract username from URLs
                      if (value.includes('youtube.com')) {
                        // YouTube channel URL: /channel/UC...
                        const channelMatch = value.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
                        if (channelMatch) {
                          value = channelMatch[1];
                        } else {
                          // YouTube handle URL: /@username or /username
                          const handleMatch = value.match(/youtube\.com\/@?([a-zA-Z0-9_.-]+)/);
                          if (handleMatch) {
                            value = handleMatch[1];
                          }
                        }
                      } else if (value.includes('tiktok.com')) {
                        const match = value.match(/tiktok\.com\/@?([a-zA-Z0-9_.-]+)/);
                        if (match) value = match[1];
                      } else if (value.includes('instagram.com')) {
                        const match = value.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/);
                        if (match) value = match[1];
                      } else if (value.includes('x.com') || value.includes('twitter.com')) {
                        const match = value.match(/(?:x|twitter)\.com\/([a-zA-Z0-9_]+)/);
                        if (match) value = match[1];
                      }

                      // Remove @ symbol
                      const sanitized = value.replace(/@/g, "");
                      setUsername(sanitized);
                    }}
                    className={`h-11 bg-muted/50 dark:bg-muted/30 border-2 border-transparent rounded-xl font-inter tracking-[-0.3px] text-base focus-visible:ring-0 focus-visible:border-primary ${showAtSymbol ? 'pl-10' : 'pl-4'}`}
                  />
                </div>
                {username.includes('@') && (
                  <p className="text-xs text-amber-500 font-inter tracking-[-0.3px]">
                    The @ symbol will be removed automatically
                  </p>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-border/50 bg-background flex gap-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-11 rounded-xl font-inter tracking-[-0.3px] text-sm hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleContinueClick}
                disabled={isContinuing || !username.trim()}
                className="flex-1 h-11 rounded-xl font-inter tracking-[-0.3px] text-sm bg-primary hover:bg-primary/90"
              >
                {isContinuing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </Button>
            </div>
          </div> : step === "verification" ? <VerificationStep username={username} platform={selectedPlatform} verificationCode={verificationCode} copied={copied} isChecking={isChecking} cooldownRemaining={cooldownRemaining} getPlatformIcon={getPlatformIcon} getPlatformLabel={getPlatformLabel} handleCopyCode={handleCopyCode} handleBack={handleBack} handleCheckVerification={handleCheckVerification} /> : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>;
}