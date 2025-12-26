import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flag, CheckCircle, ExternalLink } from "lucide-react";
import { FlaggingWindowBadge, canBeFlagged } from "./FlaggingWindowBadge";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";

interface VideoSubmission {
  video_url: string;
  video_title: string | null;
  video_description: string | null;
  video_thumbnail_url: string | null;
  video_author_avatar: string | null;
  platform: string | null;
  views: number | null;
  likes: number | null;
  video_author_username: string | null;
  paid_views?: number | null;
}

interface PayoutItemRowProps {
  item: {
    id: string;
    submission_id: string;
    amount: number;
    status?: string;
    flagged_at: string | null;
    flag_reason: string | null;
    views_at_request?: number | null;
    video_submission?: VideoSubmission;
  };
  requestCreatedAt: string;
  clearingEndsAt: string;
  onFlag: (itemId: string) => void;
  onApprove?: (itemId: string) => void;
  isFlagging?: boolean;
  isApproving?: boolean;
}

function getPlatformIcon(platform: string | null) {
  switch (platform?.toLowerCase()) {
    case 'tiktok':
      return tiktokLogo;
    case 'instagram':
      return instagramLogo;
    case 'youtube':
      return youtubeLogo;
    default:
      return null;
  }
}

export function PayoutItemRow({
  item,
  requestCreatedAt,
  clearingEndsAt,
  onFlag,
  onApprove,
  isFlagging = false,
  isApproving = false,
}: PayoutItemRowProps) {
  const platformIcon = getPlatformIcon(item.video_submission?.platform || null);
  const isFlagged = !!item.flagged_at;
  const isApproved = item.status === 'approved';
  const canFlag = !isFlagged && !isApproved && canBeFlagged(requestCreatedAt, clearingEndsAt);
  
  return (
    <div 
      className={`group rounded-lg border overflow-hidden transition-all hover:border-border/60 ${
        isApproved 
          ? 'bg-emerald-500/5 border-emerald-500/20' 
          : isFlagged 
            ? 'bg-amber-500/5 border-amber-500/20' 
            : 'bg-card/40 border-border/40'
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail */}
        <div className="relative w-14 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {item.video_submission?.video_thumbnail_url ? (
            <img 
              src={item.video_submission.video_thumbnail_url} 
              alt="" 
              className="w-full h-full object-cover"
            />
          ) : platformIcon ? (
            <div className="w-full h-full flex items-center justify-center">
              <img src={platformIcon} alt="" className="h-6 w-6 opacity-50" />
            </div>
          ) : null}
          {platformIcon && item.video_submission?.video_thumbnail_url && (
            <div className="absolute bottom-1 right-1 p-1 rounded bg-black/60">
              <img src={platformIcon} alt="" className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={item.video_submission?.video_author_avatar || undefined} />
              <AvatarFallback className="text-[10px] bg-muted">
                {item.video_submission?.video_author_username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">
              @{item.video_submission?.video_author_username || 'unknown'}
            </span>
            {item.video_submission?.video_url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a 
                    href={item.video_submission.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>View video</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{(item.views_at_request || item.video_submission?.views || 0).toLocaleString()} views</span>
            {item.video_submission?.likes !== null && item.video_submission?.likes !== undefined && (
              <span>{item.video_submission.likes.toLocaleString()} likes</span>
            )}
          </div>
          {isFlagged && item.flag_reason && (
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Flagged: {item.flag_reason}
            </div>
          )}
        </div>

        {/* Amount & Status */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-semibold">${item.amount.toFixed(2)}</span>
          {isApproved ? (
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
              <CheckCircle className="h-3 w-3" />
              Approved
            </Badge>
          ) : isFlagged ? (
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
              <Flag className="h-3 w-3" />
              Flagged
            </Badge>
          ) : (
            <FlaggingWindowBadge 
              createdAt={requestCreatedAt} 
              clearingEndsAt={clearingEndsAt} 
              compact 
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-2">
          {canFlag && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFlag(item.id);
                  }}
                  disabled={isFlagging}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Flag for review</TooltipContent>
            </Tooltip>
          )}
          {!isApproved && !isFlagged && onApprove && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(item.id);
                  }}
                  disabled={isApproving}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Approve payout</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
