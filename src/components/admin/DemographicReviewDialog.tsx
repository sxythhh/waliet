import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";

interface DemographicSubmission {
  id: string;
  tier1_percentage: number;
  screenshot_url: string | null;
  submitted_at: string;
  status: string;
  score: number | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  social_accounts: {
    id: string;
    platform: string;
    username: string;
    user_id: string;
    avatar_url?: string | null;
    follower_count?: number | null;
    bio?: string | null;
    account_link?: string | null;
  };
}

interface DemographicReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: DemographicSubmission | null;
  submissions: DemographicSubmission[];
  onApprove: (submission: DemographicSubmission, score: number) => Promise<void>;
  onReject: (submission: DemographicSubmission) => Promise<void>;
  onNavigate: (submission: DemographicSubmission) => void;
  isProcessing: boolean;
}

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "tiktok":
      return <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />;
    case "instagram":
      return <img src={instagramLogo} alt="Instagram" className="w-4 h-4" />;
    case "youtube":
      return <img src={youtubeLogo} alt="YouTube" className="w-4 h-4" />;
    default:
      return null;
  }
}

export function DemographicReviewDialog({
  open,
  onOpenChange,
  submission,
  submissions,
  onApprove,
  onReject,
  onNavigate,
  isProcessing,
}: DemographicReviewDialogProps) {
  const [score, setScore] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Get current index and navigation helpers
  const currentIndex = submission
    ? submissions.findIndex((s) => s.id === submission.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < submissions.length - 1;

  // Reset score when submission changes
  useEffect(() => {
    if (submission) {
      setScore(submission.tier1_percentage.toString());
    }
  }, [submission?.id]);

  const goToPrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(submissions[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, submissions, onNavigate]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      onNavigate(submissions[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, submissions, onNavigate]);

  const handleApprove = useCallback(async () => {
    if (!submission || isProcessing) return;
    const numScore = parseInt(score) || submission.tier1_percentage;
    await onApprove(submission, numScore);
    // Auto-advance to next
    if (hasNext) {
      goToNext();
    } else {
      onOpenChange(false);
    }
  }, [submission, score, isProcessing, onApprove, hasNext, goToNext, onOpenChange]);

  const handleReject = useCallback(async () => {
    if (!submission || isProcessing) return;
    await onReject(submission);
    // Auto-advance to next
    if (hasNext) {
      goToNext();
    } else {
      onOpenChange(false);
    }
  }, [submission, isProcessing, onReject, hasNext, goToNext, onOpenChange]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "a":
        case "A":
          e.preventDefault();
          handleApprove();
          break;
        case "r":
        case "R":
          e.preventDefault();
          handleReject();
          break;
        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          goToPrev();
          break;
        case "ArrowRight":
        case "k":
        case "K":
          e.preventDefault();
          goToNext();
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          e.preventDefault();
          setScore((parseInt(e.key) * 10).toString());
          break;
        case "0":
          e.preventDefault();
          setScore("100");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleApprove, handleReject, goToPrev, goToNext, onOpenChange]);

  if (!submission) return null;

  const account = submission.social_accounts;
  const hasAvatar = !!account.avatar_url;
  const followerCount = account.follower_count || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">
              Review Submission
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentIndex + 1} of {submissions.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="gap-1.5 text-muted-foreground"
              >
                <KeyboardIcon sx={{ fontSize: 16 }} />
                <span className="text-xs">Shortcuts</span>
              </Button>
            </div>
          </div>

          {/* Keyboard shortcuts help */}
          {showShortcuts && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">A</kbd>{" "}
                  Approve
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">R</kbd>{" "}
                  Reject
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">
                    ←
                  </kbd>{" "}
                  Previous
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">
                    →
                  </kbd>{" "}
                  Next
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">
                    1-9
                  </kbd>{" "}
                  Score 10-90
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">0</kbd>{" "}
                  Score 100
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">
                    Esc
                  </kbd>{" "}
                  Close
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Section */}
          <div className="w-1/2 bg-black flex items-center justify-center p-4">
            {submission.screenshot_url ? (
              <video
                key={submission.id}
                src={submission.screenshot_url}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-lg"
                style={{ aspectRatio: "9/16" }}
              />
            ) : (
              <div className="text-muted-foreground text-center">
                <p className="text-sm">No video available</p>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="w-1/2 p-6 overflow-y-auto flex flex-col">
            {/* Account Info */}
            <a
              href={
                account.account_link ||
                `https://${account.platform}.com/@${account.username}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="relative flex-shrink-0">
                {hasAvatar ? (
                  <img
                    src={account.avatar_url!}
                    alt={account.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-lg font-semibold text-muted-foreground">
                      {account.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center">
                  {getPlatformIcon(account.platform)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm font-inter tracking-[-0.5px] truncate flex items-center gap-1.5">
                  @{account.username}
                  <OpenInNewIcon sx={{ fontSize: 14 }} className="text-muted-foreground" />
                </h3>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  {followerCount > 0
                    ? `${followerCount.toLocaleString()} followers`
                    : "No follower data"}
                </p>
              </div>
            </a>

            {/* Meta Info */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-inter tracking-[-0.5px]">
                  Tier 1: {submission.tier1_percentage}%
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs font-inter tracking-[-0.5px] text-amber-500 border-amber-500/30"
                >
                  Pending
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Submitted{" "}
                {new Date(submission.submitted_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              {account.bio && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">
                    Bio
                  </p>
                  <p className="text-sm font-inter tracking-[-0.5px]">{account.bio}</p>
                </div>
              )}
            </div>

            {/* Score Input */}
            <div className="mt-auto pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-inter tracking-[-0.5px]">
                  Demographics Score (0-100)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="Enter score"
                  className="text-lg h-12 font-inter tracking-[-0.5px]"
                />
                <p className="text-[11px] text-muted-foreground font-inter tracking-[-0.5px]">
                  Press 1-9 for quick scores (10-90), 0 for 100
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="flex-1 gap-2 font-inter tracking-[-0.5px]"
                >
                  <CancelIcon sx={{ fontSize: 20 }} />
                  Reject
                  <kbd className="ml-2 px-1.5 py-0.5 bg-white/10 rounded text-[10px]">R</kbd>
                </Button>
                <Button
                  size="lg"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 gap-2 font-inter tracking-[-0.5px]"
                >
                  <CheckCircleIcon sx={{ fontSize: 20 }} />
                  {isProcessing ? "Processing..." : "Approve"}
                  <kbd className="ml-2 px-1.5 py-0.5 bg-white/10 rounded text-[10px]">A</kbd>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="px-6 py-3 border-t border-border flex items-center justify-between flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrev}
            disabled={!hasPrev}
            className="gap-1.5"
          >
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
            Previous
          </Button>
          <p className="text-xs text-muted-foreground">
            Use arrow keys to navigate
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            disabled={!hasNext}
            className="gap-1.5"
          >
            Next
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
