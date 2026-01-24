import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Check,
  X,
  ExternalLink,
  Clock,
  ChevronRight,
  Film,
  History,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Status configuration
const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-amber-500", textColor: "text-amber-500" },
  approved: { label: "Approved", color: "bg-blue-500", textColor: "text-blue-500" },
  ready_to_post: { label: "Ready to Post", color: "bg-violet-500", textColor: "text-violet-500" },
  posted: { label: "Posted", color: "bg-emerald-500", textColor: "text-emerald-500" },
};

interface BoostVideoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    caption?: string | null;
    video_title?: string | null;
    submission_notes?: string | null;
    gdrive_url?: string | null;
    video_url?: string;
    video_thumbnail_url?: string | null;
    status: string;
    submitted_at: string;
    feedback?: string | null;
    duration_seconds?: number | null;
    revision_number?: number;
  } | null;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  onApprove: () => void;
  onReject: (feedback: string) => void;
  onMoveToStage: (stage: string) => void;
  onSaveFeedback: (feedback: string) => void;
  updating?: boolean;
}

// Helper to clean caption - removes garbage lines like "0", single chars, just numbers
const cleanCaption = (text: string | null | undefined): string | null => {
  if (!text) return null;

  // Split on any line break character (handles \n, \r\n, \r, and Unicode line separators)
  const lines = text.split(/[\r\n\u2028\u2029]+/).map(line => line.trim()).filter(line => {
    if (line.length < 2) return false; // Single char or empty
    if (/^\d+$/.test(line)) return false; // Just numbers
    return true;
  });

  const cleaned = lines.join(' ').trim();
  if (cleaned.length < 3) return null;
  // Final check: if result is just digits/whitespace, return null
  if (/^\d+$/.test(cleaned)) return null;
  return cleaned;
};

export function BoostVideoDetailSheet({
  open,
  onOpenChange,
  video,
  profile,
  onApprove,
  onReject,
  onMoveToStage,
  onSaveFeedback,
  updating = false,
}: BoostVideoDetailSheetProps) {
  const [feedbackText, setFeedbackText] = useState("");

  // Sync feedback text when video changes
  useEffect(() => {
    if (video?.feedback) {
      setFeedbackText(video.feedback);
    } else {
      setFeedbackText("");
    }
  }, [video?.id, video?.feedback]);

  if (!video) return null;

  const status = video.status as keyof typeof STATUS_CONFIG;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isPending = status === "pending";
  const isApproved = status === "approved";
  const isReadyToPost = status === "ready_to_post";
  const isPosted = status === "posted";

  const creatorName = profile?.full_name || profile?.username || "Unknown";

  // Get cleaned caption, filtering out garbage data
  const getCaption = () => {
    const cleaned = cleanCaption(video.caption) || cleanCaption(video.video_title) || cleanCaption(video.submission_notes);
    return cleaned;
  };
  const videoCaption = getCaption();

  // Extract Google Drive file ID for embed
  const getGDriveEmbedUrl = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return null;
  };

  const gdriveEmbedUrl = video.gdrive_url ? getGDriveEmbedUrl(video.gdrive_url) : null;

  const getNextStage = (): { id: string; label: string } | null => {
    if (isPending) return { id: "approved", label: "Approved" };
    if (isApproved) return { id: "ready_to_post", label: "Ready to Post" };
    if (isReadyToPost) return { id: "posted", label: "Posted" };
    return null;
  };

  const nextStage = getNextStage();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleApprove = () => {
    // Save feedback if any before approving
    if (feedbackText.trim() && feedbackText !== video.feedback) {
      onSaveFeedback(feedbackText);
    }
    onApprove();
  };

  const handleReject = () => {
    onReject(feedbackText);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        {/* Compact Header */}
        <SheetHeader className="px-4 py-3 border-b border-border/50 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm font-medium">Review Video</SheetTitle>
          <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0.5", statusConfig.textColor)}>
            <div className={cn("w-1.5 h-1.5 rounded-[2px] mr-1.5", statusConfig.color)} />
            {statusConfig.label}
          </Badge>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Video Section - Vertical video (9:16) with max height */}
          <div className="w-full aspect-[9/16] max-h-[60vh] bg-black relative mx-auto" style={{ maxWidth: '340px' }}>
            {gdriveEmbedUrl ? (
              // Auto-load Google Drive embed
              <iframe
                src={gdriveEmbedUrl}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : (
              // No video available
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
                <Film className="w-8 h-8" />
                <p className="text-xs">Preview not available</p>
                {video.gdrive_url && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => window.open(video.gdrive_url!, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open in Drive
                  </Button>
                )}
              </div>
            )}
            {/* External link overlay */}
            {video.gdrive_url && (
              <button
                onClick={() => window.open(video.gdrive_url!, "_blank")}
                className="absolute top-2 right-2 p-1.5 rounded bg-black/60 hover:bg-black/80 transition-colors z-10"
              >
                <ExternalLink className="w-4 h-4 text-white" />
              </button>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4 space-y-4">
            {/* Caption - Primary content (only show if meaningful) */}
            {videoCaption && (
              <p className="text-sm leading-relaxed text-foreground">
                {videoCaption}
              </p>
            )}

            {/* Metadata Row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Duration */}
              {video.duration_seconds && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(video.duration_seconds)}</span>
                </div>
              )}

              {/* Revision */}
              {(video.revision_number ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <History className="w-3 h-3" />
                  <span>Rev {video.revision_number}</span>
                </div>
              )}
            </div>

            {/* Creator Info - Secondary */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/30">
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {creatorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {creatorName}
              </span>
              <span className="text-xs text-muted-foreground/50">
                {formatDistanceToNow(new Date(video.submitted_at), { addSuffix: true })}
              </span>
            </div>

            {/* Feedback Section - Always Visible */}
            <div className="pt-2">
              <Textarea
                placeholder="Add feedback for the creator..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[80px] resize-none text-sm bg-muted/30 border-border/50"
              />
              {feedbackText !== (video.feedback || "") && feedbackText.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => onSaveFeedback(feedbackText)}
                  disabled={updating}
                >
                  Save feedback
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="border-t border-border p-3 bg-background space-y-2">
          {/* Pending: Approve / Reject */}
          {isPending && (
            <div className="flex gap-2">
              <Button
                className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium border-t-emerald-500"
                onClick={handleApprove}
                disabled={updating}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-10 font-medium"
                onClick={handleReject}
                disabled={updating}
              >
                <X className="w-4 h-4 mr-1.5" />
                Reject
              </Button>
            </div>
          )}

          {/* Non-pending: Move to next stage */}
          {!isPending && nextStage && (
            <Button
              className="w-full h-10"
              onClick={() => onMoveToStage(nextStage.id)}
              disabled={updating}
            >
              Move to {nextStage.label}
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}

          {/* Posted: Completion message */}
          {isPosted && (
            <p className="text-center text-xs text-muted-foreground py-1">
              This video has been posted
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
