import { ShieldCheck, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isVerificationExpiringSoon, getDaysUntilExpiry } from "@/lib/zktls/types";
import { format } from "date-fns";

interface VerificationBadgeProps {
  verifiedAt?: string | Date;
  expiresAt?: string | Date;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showExpiry?: boolean;
}

export function VerificationBadge({
  verifiedAt,
  expiresAt,
  className,
  size = "md",
  showLabel = true,
  showExpiry = true,
}: VerificationBadgeProps) {
  const isExpiringSoon = expiresAt ? isVerificationExpiringSoon(expiresAt) : false;
  const daysRemaining = expiresAt ? getDaysUntilExpiry(expiresAt) : null;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  if (isExpired) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center rounded-full font-medium font-inter tracking-[-0.3px]",
                "bg-muted/50 text-muted-foreground border border-muted-foreground/20",
                sizeClasses[size],
                className
              )}
            >
              <ShieldCheck className={cn(iconSizes[size], "opacity-50")} />
              {showLabel && <span>Expired</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="text-xs">
              Verification expired. Re-verify your analytics to restore your verified status.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isExpiringSoon) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center rounded-full font-medium font-inter tracking-[-0.3px]",
                "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                sizeClasses[size],
                className
              )}
            >
              <AlertTriangle className={iconSizes[size]} />
              {showLabel && (
                <span>
                  {showExpiry && daysRemaining
                    ? `Expires in ${daysRemaining}d`
                    : "Expiring Soon"}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px]">
            <div className="space-y-1">
              <p className="text-xs font-medium">Verification Expiring Soon</p>
              <p className="text-xs text-muted-foreground">
                {daysRemaining === 1
                  ? "Your verification expires tomorrow."
                  : `Your verification expires in ${daysRemaining} days.`}{" "}
                Re-verify to maintain your verified status.
              </p>
              {verifiedAt && (
                <p className="text-[10px] text-muted-foreground pt-1">
                  Verified on {format(new Date(verifiedAt), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center rounded-full font-medium font-inter tracking-[-0.3px]",
              "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
              sizeClasses[size],
              className
            )}
          >
            <ShieldCheck className={iconSizes[size]} />
            {showLabel && <span>Verified</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <div className="space-y-1">
            <p className="text-xs font-medium">zkTLS Verified Analytics</p>
            <p className="text-xs text-muted-foreground">
              This creator's analytics have been cryptographically verified directly from TikTok.
            </p>
            {verifiedAt && (
              <p className="text-[10px] text-muted-foreground pt-1">
                Verified on {format(new Date(verifiedAt), "MMM d, yyyy")}
              </p>
            )}
            {expiresAt && daysRemaining && (
              <p className="text-[10px] text-muted-foreground">
                Valid for {daysRemaining} more days
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
