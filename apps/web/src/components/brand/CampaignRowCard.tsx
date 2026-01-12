import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight } from "lucide-react";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import { Icon } from "@iconify/react";
import tiktokLogo from "@/assets/tiktok-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-black.png";
import instagramLogo from "@/assets/instagram-logo-black.png";
import clippingIconWhite from "@/assets/clipping-icon-white.svg";
import clippingIconDark from "@/assets/clipping-icon-dark.svg";
import boostIconWhite from "@/assets/boost-icon-white.svg";
import boostIconDark from "@/assets/boost-icon-dark.svg";
import { useTheme } from "@/components/ThemeProvider";
interface CampaignMember {
  id: string;
  avatar_url?: string | null;
  display_name?: string;
}
interface CampaignRowCardProps {
  id: string;
  title: string;
  type: "campaign" | "boost";
  bannerUrl: string | null;
  brandColor?: string | null;
  budget: number;
  budgetUsed: number;
  rpmRate?: number;
  videosPerMonth?: number;
  spotsRemaining?: number;
  maxCreators?: number;
  status: string;
  endDate?: string | null;
  allowedPlatforms?: string[] | null;
  totalViews?: number;
  totalVideos?: number;
  pendingReviewCount?: number;
  members?: CampaignMember[];
  slug?: string;
  onClick: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onPause?: () => void;
  onDelete?: () => void;
  onTopUp?: () => void;
  onShare?: () => void;
}
export function CampaignRowCard({
  title,
  type,
  bannerUrl,
  brandColor,
  budget,
  budgetUsed,
  rpmRate,
  videosPerMonth,
  spotsRemaining,
  maxCreators,
  status,
  endDate,
  allowedPlatforms,
  pendingReviewCount = 0,
  members = [],
  slug,
  onClick,
  onEdit,
  onDuplicate,
  onPause,
  onDelete,
  onTopUp,
  onShare
}: CampaignRowCardProps) {
  const {
    resolvedTheme
  } = useTheme();
  const isDark = resolvedTheme === "dark";
  const budgetPercentage = budget > 0 ? budgetUsed / budget * 100 : 0;
  const getDaysLeft = () => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };
  const daysLeft = getDaysLeft();
  const formatCurrency = (num: number) => {
    return `$${num.toLocaleString('en-US', {
      maximumFractionDigits: 0
    })}`;
  };
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "tiktok":
        return <img src={tiktokLogo} alt="TikTok" className="w-4 h-4 dark:invert" />;
      case "youtube":
        return <img src={youtubeLogo} alt="YouTube" className="w-4 h-4 dark:invert" />;
      case "instagram":
        return <img src={instagramLogo} alt="Instagram" className="w-4 h-4 dark:invert" />;
      default:
        return null;
    }
  };
  const visibleMembers = members.slice(0, 3);
  const remainingCount = members.length - 3;
  return <Card className="group bg-[#ffffff] dark:bg-[#0e0e0e] hover:bg-[#f9f9f9] dark:hover:bg-[#121212] transition-all duration-200 overflow-hidden cursor-pointer border-0" onClick={onClick}>
      <div className="flex flex-col sm:flex-row font-inter tracking-[-0.5px] border border-border dark:border-[#0e0e0e] rounded-lg overflow-hidden">
        {/* Banner */}
        <div className="relative w-full sm:w-40 md:w-48 h-28 sm:h-28 flex-shrink-0 overflow-hidden bg-muted">
          {bannerUrl ? <OptimizedImage src={bannerUrl} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="w-full h-full flex items-center justify-center" style={{
          backgroundColor: brandColor || "#6366f1"
        }}>
              <img alt="" src="/lovable-uploads/090bbb71-fff3-4820-a16e-521aac57990e.png" className="w-8 h-8 opacity-100" />
            </div>}
          
          {/* Status Badge - positioned in corner */}
          {daysLeft !== null && daysLeft > 0 && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[11px] font-medium bg-amber-500/90 text-white rounded">
              {daysLeft} days left
            </span>
          )}
          {daysLeft !== null && daysLeft === 0 && status !== "draft" && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[11px] font-medium bg-red-500/90 text-white rounded">
              Expired
            </span>
          )}
          {status === "draft" && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[11px] font-medium bg-muted-foreground/80 text-white rounded">
              Draft
            </span>
          )}
          {status === "paused" && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[11px] font-medium bg-amber-600/90 text-white rounded">
              Paused{budget > 0 && budgetUsed >= budget ? " (Budget Depleted)" : ""}
            </span>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Main Info */}
          <div className="flex-1 min-w-0 space-y-2">

            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold truncate group-hover:underline">
                {title}
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-muted dark:bg-[#2a2a2a] text-foreground dark:text-white text-xs opacity-60">
                <img key={`icon-${isDark}`} src={type === "campaign" ? isDark ? clippingIconWhite : clippingIconDark : isDark ? boostIconWhite : boostIconDark} alt="" className="w-3 h-3" />
                {type === "campaign" ? "Clipping" : "Boost"}
              </span>
            </div>

            {/* Budget Progress */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap font-semibold">
                {formatCurrency(budgetUsed)}/{formatCurrency(budget)}
              </span>
              <div className="flex-1 max-w-32">
                <Progress value={budgetPercentage} className="h-1.5" />
              </div>
              
            </div>

            {/* Tags Row */}
            <div className="flex items-center gap-3 flex-wrap text-xs">
              {type === "campaign" && rpmRate !== undefined}

              {type === "boost" && videosPerMonth !== undefined && <span className="text-muted-foreground">{videosPerMonth} videos/mo</span>}

              {type === "boost" && spotsRemaining !== undefined && maxCreators !== undefined && <span className="text-muted-foreground">
                  {spotsRemaining}/{maxCreators} spots
                </span>}

              {/* Members inline */}
              {visibleMembers.length > 0 ? <div className="flex items-center">
                  <div className="flex -space-x-1.5">
                    {visibleMembers.map((member, index) => <div key={member.id} className="w-5 h-5 rounded-full border-0 bg-muted flex items-center justify-center overflow-hidden" style={{
                  zIndex: 3 - index
                }}>
                        {member.avatar_url ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-medium text-muted-foreground uppercase">
                            {member.display_name?.charAt(0) || "?"}
                          </span>}
                      </div>)}
                  </div>
                  {remainingCount > 0 && <span className="ml-1.5 text-xs text-muted-foreground">+{remainingCount} more</span>}
                </div> : <span className="text-xs text-muted-foreground/60">No members yet</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="hidden sm:flex sm:flex-col items-center sm:items-end justify-end gap-3 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">

            {pendingReviewCount > 0 && <button onClick={e => {
            e.stopPropagation();
            onClick();
          }} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors">
                {pendingReviewCount} need review
                <ChevronRight className="w-3 h-3" />
              </button>}

            <div className="hidden sm:flex items-center gap-1.5">
              {/* Other action buttons - visible on hover */}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {status === "ended" && <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-border dark:border-0 bg-muted dark:bg-[#0a0a0a] hover:bg-muted/80 dark:hover:bg-[#151515] text-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
                    Resume
                  </Button>}

                {onTopUp && <Button size="sm" className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" onClick={e => {
                e.stopPropagation();
                onTopUp();
              }}>
                    Fund Campaign
                  </Button>}
              </div>

              {/* Three-dot menu - visible on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 border-border dark:border-0 bg-muted dark:bg-[#0a0a0a] hover:bg-muted/80 dark:hover:bg-[#151515] text-foreground hover:text-foreground"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreVertRoundedIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 bg-popover dark:bg-[#0a0a0a] border-border dark:border-[#1a1a1a]" onClick={e => e.stopPropagation()}>
                    {onShare && slug && (
                      <DropdownMenuItem onClick={onShare} className="cursor-pointer text-xs py-1.5 gap-2 focus:bg-muted dark:focus:bg-[#151515]">
                        <Icon icon="material-symbols:reply-rounded" className="w-4 h-4 -scale-x-100" />
                        Share
                      </DropdownMenuItem>
                    )}
                    {onEdit && (
                      <DropdownMenuItem onClick={onEdit} className="cursor-pointer text-xs py-1.5 gap-2 focus:bg-muted dark:focus:bg-[#151515]">
                        <Icon icon="material-symbols:edit-outline" className="w-4 h-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDuplicate && (
                      <DropdownMenuItem onClick={onDuplicate} className="cursor-pointer text-xs py-1.5 gap-2 focus:bg-muted dark:focus:bg-[#151515]">
                        <Icon icon="material-symbols:content-copy-outline" className="w-4 h-4" />
                        Duplicate
                      </DropdownMenuItem>
                    )}
                    {onPause && (
                      <>
                        <DropdownMenuSeparator className="bg-border dark:bg-[#1a1a1a]" />
                        <DropdownMenuItem onClick={onPause} className="cursor-pointer text-xs py-1.5 gap-2 focus:bg-muted dark:focus:bg-[#151515]">
                          {status === "paused" ? (
                            <>
                              <Icon icon="material-symbols:play-circle-outline" className="w-4 h-4" />
                              Resume
                            </>
                          ) : (
                            <>
                              <Icon icon="material-symbols:pause-circle-outline" className="w-4 h-4" />
                              Pause
                            </>
                          )}
                        </DropdownMenuItem>
                      </>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator className="bg-border dark:bg-[#1a1a1a]" />
                        <DropdownMenuItem
                          onClick={onDelete}
                          className="cursor-pointer text-xs py-1.5 gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                        >
                          <Icon icon="material-symbols:delete-outline" className="w-4 h-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>;
}