import { useState, useEffect } from "react";
import { AlertTriangle, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDaysUntilExpiry } from "@/lib/zktls/types";

interface VerificationExpiryBannerProps {
  expiresAt: string | Date;
  onReVerify: () => void;
  className?: string;
  dismissible?: boolean;
  storageKey?: string;
}

export function VerificationExpiryBanner({
  expiresAt,
  onReVerify,
  className,
  dismissible = true,
  storageKey = "zktls-expiry-banner-dismissed",
}: VerificationExpiryBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const daysRemaining = getDaysUntilExpiry(expiresAt);
  const isExpired = daysRemaining <= 0;

  // Check if banner was dismissed within the last 24 hours
  useEffect(() => {
    if (!dismissible) return;

    const dismissedAt = localStorage.getItem(storageKey);
    if (dismissedAt) {
      const dismissedTime = new Date(dismissedAt).getTime();
      const now = new Date().getTime();
      const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60);

      // Show again after 24 hours
      if (hoursSinceDismissed < 24) {
        setIsDismissed(true);
      }
    }
  }, [dismissible, storageKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(storageKey, new Date().toISOString());
  };

  // Don't show if verification is valid for more than 7 days
  if (daysRemaining > 7) {
    return null;
  }

  if (isDismissed && dismissible) {
    return null;
  }

  if (isExpired) {
    return (
      <div
        className={cn(
          "relative flex items-center gap-3 p-4 rounded-xl",
          "bg-destructive/10 border border-destructive/20",
          className
        )}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive font-inter tracking-[-0.3px]">
            Verification Expired
          </p>
          <p className="text-xs text-destructive/80 font-inter tracking-[-0.3px] mt-0.5">
            Your analytics verification has expired. Re-verify to restore your trusted status and continue joining campaigns.
          </p>
        </div>
        <Button
          size="sm"
          variant="destructive"
          onClick={onReVerify}
          className="flex-shrink-0 h-9 rounded-lg font-inter tracking-[-0.3px]"
        >
          Re-verify Now
        </Button>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-destructive/20 text-destructive/60 hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 p-4 rounded-xl",
        "bg-amber-500/10 border border-amber-500/20",
        className
      )}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400 font-inter tracking-[-0.3px]">
          Verification Expiring Soon
        </p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 font-inter tracking-[-0.3px] mt-0.5">
          {daysRemaining === 1
            ? "Your analytics verification expires tomorrow."
            : `Your analytics verification expires in ${daysRemaining} days.`}{" "}
          Re-verify to maintain your trusted status.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onReVerify}
        className="flex-shrink-0 h-9 rounded-lg border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-inter tracking-[-0.3px]"
      >
        Re-verify
      </Button>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-amber-500/20 text-amber-600/60 dark:text-amber-400/60 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
