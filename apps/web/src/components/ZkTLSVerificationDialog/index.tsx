import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { useReclaimVerification } from "@/lib/zktls/hooks/useReclaimVerification";
import { Loader2 } from "lucide-react";
import QRCode from "react-qr-code";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

interface ZkTLSVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  socialAccountId: string;
  platform: string;
  username: string;
}

export function ZkTLSVerificationDialog({
  open,
  onOpenChange,
  onSuccess,
  socialAccountId,
  platform,
  username,
}: ZkTLSVerificationDialogProps) {
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const {
    status,
    requestUrl,
    error,
    verificationData,
    startVerification,
    reset,
    verificationMode,
  } = useReclaimVerification({
    socialAccountId,
    platform: platform as "tiktok" | "instagram",
    onSuccess: () => {
      const platformName = platform === "instagram" ? "Instagram" : "TikTok";
      toast({
        title: "Verified",
        description: `Your ${platformName} account has been verified.`,
      });
      onSuccess();
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: err.message || "Please try again.",
      });
    },
  });

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const isDark = resolvedTheme === "dark";
  const platformName = platform === "instagram" ? "Instagram" : "TikTok";
  const platformLogo =
    platform === "instagram"
      ? isDark
        ? instagramLogoWhite
        : instagramLogoBlack
      : isDark
        ? tiktokLogoWhite
        : tiktokLogoBlack;

  const isMobile = isMobileDevice();
  const isExtensionFlow = verificationMode === "extension";

  // Idle state - show start verification
  const renderIdleState = () => (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">
          Verify Your Account
        </h2>
        <div className="flex items-center gap-2">
          <img src={platformLogo} alt={platformName} className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">@{username}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Verify your {platformName} account to prove your audience insights to
        brands. This uses zkTLS cryptographic proofs.
      </p>

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="flex-1 h-11 rounded-xl"
        >
          Cancel
        </Button>
        <Button
          onClick={() => startVerification()}
          className="flex-1 h-11 rounded-xl"
        >
          Verify
        </Button>
      </div>
    </div>
  );

  // Waiting state - show QR or extension status
  const renderWaitingState = () => (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">
          {isExtensionFlow
            ? "Complete Verification"
            : isMobile
              ? "Verify Account"
              : "Scan QR Code"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isExtensionFlow
            ? "Complete the verification in the new browser tab."
            : isMobile
              ? `Tap to open ${platformName} and verify.`
              : `Scan with your phone to verify your ${platformName} account.`}
        </p>
      </div>

      {/* Instructions */}
      {!isExtensionFlow && (
        <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/50">
          <p className="font-medium text-foreground">After scanning:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Log into {platformName} if prompted</li>
            <li>Wait for the {platform === 'tiktok' ? 'Studio dashboard' : 'profile'} to load</li>
            <li>Stay on the page until verification completes</li>
          </ol>
        </div>
      )}

      {isExtensionFlow ? (
        <div className="flex flex-col items-center py-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">
            Waiting for verification...
          </p>
        </div>
      ) : requestUrl ? (
        <div className="space-y-4">
          {!isMobile && (
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-xl">
                <QRCode value={requestUrl} size={160} level="M" />
              </div>
            </div>
          )}

          {isMobile && (
            <Button
              className="w-full h-11 rounded-xl"
              onClick={() => window.open(requestUrl, "_blank")}
            >
              Open {platformName}
            </Button>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Waiting for verification...</span>
          </div>

          {!isMobile && (
            <button
              onClick={() => window.open(requestUrl, "_blank")}
              className="w-full text-xs text-muted-foreground hover:text-foreground underline"
            >
              Or open in browser
            </button>
          )}
        </div>
      ) : (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      <Button
        variant="outline"
        onClick={() => reset()}
        className="w-full h-11 rounded-xl"
      >
        Cancel
      </Button>
    </div>
  );

  // Verifying state
  const renderVerifyingState = () => (
    <div className="p-6 py-12 flex flex-col items-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
      <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] mb-1">
        Verifying
      </h2>
      <p className="text-sm text-muted-foreground">
        Processing your proof...
      </p>
    </div>
  );

  // Success state
  const renderSuccessState = () => {
    const data = verificationData?.extracted_data;

    return (
      <div className="p-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">
            Verified
          </h2>
          <p className="text-sm text-muted-foreground">
            Your {platformName} account has been verified for 30 days.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <img src={platformLogo} alt={platformName} className="h-4 w-4" />
            <span className="text-sm font-medium">@{username}</span>
            <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">
              Verified
            </span>
          </div>

          {/* Show key metrics */}
          {platform === "instagram" && data && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {data.follower_count != null && (
                <div>
                  <p className="text-muted-foreground text-xs">Followers</p>
                  <p className="font-semibold">
                    {data.follower_count.toLocaleString()}
                  </p>
                </div>
              )}
              {data.following_count != null && (
                <div>
                  <p className="text-muted-foreground text-xs">Following</p>
                  <p className="font-semibold">
                    {data.following_count.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {platform === "tiktok" && data?.overview && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {data.overview.postViews !== undefined && (
                <div>
                  <p className="text-muted-foreground text-xs">Post Views</p>
                  <p className="font-semibold">
                    {data.overview.postViews.toLocaleString()}
                  </p>
                </div>
              )}
              {data.overview.likes !== undefined && (
                <div>
                  <p className="text-muted-foreground text-xs">Likes</p>
                  <p className="font-semibold">
                    {data.overview.likes.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <Button
          onClick={() => onOpenChange(false)}
          className="w-full h-11 rounded-xl"
        >
          Done
        </Button>
      </div>
    );
  };

  // Error state
  const renderErrorState = () => (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">
          Verification Failed
        </h2>
        <p className="text-sm text-muted-foreground">
          {error || "Something went wrong. Please try again."}
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="flex-1 h-11 rounded-xl"
        >
          Cancel
        </Button>
        <Button onClick={() => reset()} className="flex-1 h-11 rounded-xl">
          Try Again
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (status) {
      case "idle":
        return renderIdleState();
      case "initializing":
      case "waiting":
        return renderWaitingState();
      case "verifying":
        return renderVerifyingState();
      case "success":
        return renderSuccessState();
      case "error":
        return renderErrorState();
      default:
        return renderIdleState();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden bg-background border-border [&>button]:hidden">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
