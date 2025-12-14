import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, ArrowLeft, Loader2 } from "lucide-react";
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
    }
  }, [open]);

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
    const { data: existingAccount, error: checkError } = await supabase
      .from("social_accounts")
      .select("id, user_id")
      .eq("platform", selectedPlatform)
      .eq("username", username.toLowerCase())
      .maybeSingle();

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
        description: isRateLimit 
          ? "Too many verification attempts. Please try again in a few minutes."
          : selectedPlatform === "instagram" 
            ? "Could not verify your account. Make sure the code is in your Instagram bio and wait 1–2 minutes after updating before trying again." 
            : error.message || "Could not verify your account. Please make sure the code is in your bio."
      });
      setCooldownRemaining(30);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, toast, selectedPlatform, username, verificationCode, onSuccess, onOpenChange]);
  const handleBack = () => {
    setStep("input");
    setVerificationCode("");
  };
  
  const handleContinueClick = async () => {
    setIsContinuing(true);
    try {
      await handleContinueToVerification();
    } finally {
      setIsContinuing(false);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-6 overflow-hidden bg-card border-none [&>button]:hidden">
        {step === "input" ? <div className="flex flex-col">
            {/* Header */}
            <div className="pb-4">
              <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">
                Connect Account
              </h2>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Verify via bio code
              </p>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">
                  Platform
                </Label>
                <Select value={selectedPlatform} onValueChange={value => setSelectedPlatform(value as Platform)}>
                  <SelectTrigger className="w-full h-11 bg-muted/30 border-0 rounded-xl font-inter tracking-[-0.5px]">
                    <SelectValue>
                      <div className="flex items-center gap-2.5">
                        {getPlatformIcon(selectedPlatform, "h-4 w-4")}
                        <span className="text-sm">{getPlatformLabel(selectedPlatform)}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/50">
                    {(["tiktok", "instagram", "youtube", "twitter"] as Platform[]).map(platform => <SelectItem key={platform} value={platform} className="font-inter tracking-[-0.5px]">
                        <div className="flex items-center gap-2.5">
                          {getPlatformIcon(platform, "h-4 w-4")}
                          <span className="text-sm">{getPlatformLabel(platform)}</span>
                        </div>
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Username Input */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">
                  {selectedPlatform === "youtube" ? "Channel ID or Handle" : "Username"}
                </Label>
                <div className="relative flex items-center">
                  {showAtSymbol && (
                    <div className="absolute left-0 h-11 w-11 rounded-l-xl bg-muted/50 flex items-center justify-center border-r border-border/30">
                      <span className="text-muted-foreground text-sm font-medium">@</span>
                    </div>
                  )}
                  <Input 
                    id="username" 
                    placeholder={getPlaceholderText(selectedPlatform)} 
                    value={username} 
                    onChange={e => {
                      const value = e.target.value;
                      // Remove @ symbol and trim whitespace
                      const sanitized = value.replace(/@/g, "").trim();
                      setUsername(sanitized);
                    }} 
                    className={`h-11 bg-muted/30 border-0 rounded-xl font-inter tracking-[-0.5px] text-sm ${showAtSymbol ? 'pl-12' : 'pl-4'}`} 
                  />
                </div>
                {username.includes('@') && (
                  <p className="text-[11px] text-amber-500 font-inter tracking-[-0.5px]">
                    The @ symbol will be removed automatically
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 mt-6">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-10 rounded-xl font-inter tracking-[-0.5px] text-sm bg-muted/30 hover:bg-muted hover:text-foreground">
                Cancel
              </Button>
              <Button onClick={handleContinueClick} disabled={isContinuing} className="flex-1 h-10 rounded-xl font-inter tracking-[-0.5px] text-sm">
                {isContinuing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </Button>
            </div>
          </div> : <div className="flex flex-col">
            {/* Header */}
            <div className="pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center">
                  {getPlatformIcon(selectedPlatform, "h-5 w-5")}
                </div>
                <div>
                  <h2 className="text-sm font-semibold font-inter tracking-[-0.5px]">
                    @{username}
                  </h2>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                    {getPlatformLabel(selectedPlatform)}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Code */}
            <div className="pb-4">
              <div className="bg-muted/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                    Add this code to your bio
                  </span>
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
                  <span className="text-xl font-bold font-mono tracking-[0.3em] text-foreground">
                    {verificationCode}
                  </span>
                </div>
                {selectedPlatform === "instagram" && <p className="mt-3 text-[11px] text-muted-foreground/70 font-inter tracking-[-0.5px] text-center">
                    Instagram may take 1–2 minutes to update your bio
                  </p>}
              </div>
            </div>


            {/* Footer */}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleBack} className="h-10 px-4 rounded-xl font-inter tracking-[-0.5px] text-sm bg-muted/30 hover:bg-muted hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button onClick={handleCheckVerification} disabled={isChecking || cooldownRemaining > 0} className="flex-1 h-10 rounded-xl font-inter tracking-[-0.5px] text-sm">
                {isChecking ? <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Verifying...
                  </> : cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : "Verify Account"}
              </Button>
            </div>
          </div>}
      </DialogContent>
    </Dialog>;
}