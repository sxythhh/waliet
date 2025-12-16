import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Loader2 } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";

interface VerifyAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  accountId: string;
  platform: string;
  username: string;
}

// Generate a random verification code
const generateVerificationCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Helper to filter verification code from bio
const filterVerificationCode = (bio: string, verificationCode: string): string => {
  const filtered = bio.replace(new RegExp(verificationCode, 'gi'), '');
  return filtered.replace(/\s+/g, ' ').trim();
};

export function VerifyAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  accountId,
  platform,
  username
}: VerifyAccountDialogProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  // Generate code when dialog opens
  useEffect(() => {
    if (open) {
      setVerificationCode(generateVerificationCode());
      setCopied(false);
      setCooldownRemaining(0);
      setIsChecking(false);
    }
  }, [open]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining(cooldownRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  const getPlatformLabel = (p: string) => {
    switch (p) {
      case "tiktok": return "TikTok";
      case "instagram": return "Instagram";
      case "youtube": return "YouTube";
      default: return p;
    }
  };

  const getPlatformIcon = (p: string, size: string = "h-5 w-5") => {
    const isLightMode = resolvedTheme === "light";
    switch (p) {
      case "tiktok":
        return <img src={isLightMode ? tiktokLogoBlack : tiktokLogo} alt="TikTok" className={size} />;
      case "instagram":
        return <img src={isLightMode ? instagramLogoBlack : instagramLogo} alt="Instagram" className={size} />;
      case "youtube":
        return <img src={isLightMode ? youtubeLogoBlack : youtubeLogo} alt="YouTube" className={size} />;
      default:
        return null;
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

  const handleCheckVerification = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    
    try {
      // Only TikTok, Instagram, and YouTube are supported
      if (!["tiktok", "instagram", "youtube"].includes(platform)) {
        toast({
          variant: "destructive",
          title: "Not Supported",
          description: `${getPlatformLabel(platform)} verification is not yet available.`
        });
        setIsChecking(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-social-bio', {
        body: {
          username,
          verificationCode,
          platform
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to verify');
      }

      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.verified) {
        // Update the existing account to verified
        const cleanBio = data.bio ? filterVerificationCode(data.bio, verificationCode) : null;
        
        const { error: updateError } = await supabase
          .from("social_accounts")
          .update({
            is_verified: true,
            bio: cleanBio,
            avatar_url: data.user?.avatar || null,
            follower_count: data.user?.followerCount || null
          })
          .eq("id", accountId);

        if (updateError) throw updateError;

        toast({
          title: "Account Verified!",
          description: `@${username} has been verified successfully.`
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Code Not Found",
          description: platform === "instagram" 
            ? "The verification code was not found in your Instagram bio. Instagram may cache your profile—wait 1–2 minutes after updating your bio, then try again." 
            : "The verification code was not found in your bio. Please add it and try again."
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
          : platform === "instagram" 
            ? "Could not verify your account. Make sure the code is in your Instagram bio and wait 1–2 minutes after updating before trying again." 
            : error.message || "Could not verify your account. Please make sure the code is in your bio."
      });
      setCooldownRemaining(30);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, toast, platform, username, verificationCode, accountId, onSuccess, onOpenChange]);

  const getProfileLink = () => {
    switch (platform) {
      case "tiktok": return `https://tiktok.com/@${username}`;
      case "instagram": return `https://instagram.com/${username}`;
      case "youtube": return `https://youtube.com/@${username}`;
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-6 overflow-hidden bg-card border-none [&>button]:hidden">
        <div className="flex flex-col">
          {/* Header */}
          <div className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              {getPlatformIcon(platform, "h-5 w-5")}
              <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">
                Verify @{username}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              Add the code to your bio to verify ownership
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                  Copy the verification code below
                </p>
              </div>

              {/* Verification Code */}
              <div className="flex items-center gap-2 ml-9">
                <div className="flex-1 px-4 py-3 rounded-xl bg-muted/30 font-mono text-lg tracking-[0.2em] text-center font-semibold">
                  {verificationCode}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl bg-muted/30 border-0 hover:bg-muted/50"
                  onClick={handleCopyCode}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                    Add the code anywhere in your {getPlatformLabel(platform)} bio
                  </p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs text-primary font-inter tracking-[-0.5px]"
                    onClick={() => window.open(getProfileLink(), '_blank')}
                  >
                    Open {getPlatformLabel(platform)} profile →
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                  Click verify below to confirm
                </p>
              </div>
            </div>

            {/* Verify Button */}
            <Button
              className="w-full h-12 rounded-xl font-inter tracking-[-0.5px]"
              onClick={handleCheckVerification}
              disabled={isChecking || cooldownRemaining > 0}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : cooldownRemaining > 0 ? (
                `Wait ${cooldownRemaining}s`
              ) : (
                "Verify Account"
              )}
            </Button>

            {/* Note */}
            <p className="text-[11px] text-muted-foreground/70 text-center font-inter tracking-[-0.5px]">
              The code will be automatically removed from your saved bio after verification
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
