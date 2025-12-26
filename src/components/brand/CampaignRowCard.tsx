import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Progress } from "@/components/ui/progress";
import { Eye, Video, ChevronRight, Archive, Pencil, Play, DollarSign } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-black.png";
import instagramLogo from "@/assets/instagram-logo-black.png";

interface CampaignRowCardProps {
  id: string;
  title: string;
  type: "campaign" | "boost";
  bannerUrl: string | null;
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
  onClick: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onTopUp?: () => void;
}

export function CampaignRowCard({
  id,
  title,
  type,
  bannerUrl,
  budget,
  budgetUsed,
  rpmRate,
  videosPerMonth,
  spotsRemaining,
  maxCreators,
  status,
  endDate,
  allowedPlatforms,
  totalViews = 0,
  totalVideos = 0,
  pendingReviewCount = 0,
  onClick,
  onEdit,
  onArchive,
  onTopUp,
}: CampaignRowCardProps) {
  const budgetPercentage = budget > 0 ? (budgetUsed / budget) * 100 : 0;
  
  // Calculate days left
  const getDaysLeft = () => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };
  
  const daysLeft = getDaysLeft();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
    return `$${num.toFixed(0)}`;
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return <img src={tiktokLogo} alt="TikTok" className="w-4 h-4 dark:invert" />;
      case 'youtube':
        return <img src={youtubeLogo} alt="YouTube" className="w-4 h-4 dark:invert" />;
      case 'instagram':
        return <img src={instagramLogo} alt="Instagram" className="w-4 h-4 dark:invert" />;
      default:
        return null;
    }
  };

  return (
    <Card 
      className="group bg-card hover:bg-accent/30 transition-all duration-200 overflow-hidden cursor-pointer border-border/50"
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Banner Image */}
        <div className="relative w-full sm:w-40 md:w-48 h-28 sm:h-auto flex-shrink-0 overflow-hidden bg-muted">
          {bannerUrl ? (
            <OptimizedImage
              src={bannerUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-muted-foreground/50 text-xs font-medium">
                No Banner
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Main Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Days Left Label */}
            {daysLeft !== null && daysLeft > 0 && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                {daysLeft} DAYS LEFT
              </span>
            )}
            {status === 'draft' && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                DRAFT
              </span>
            )}
            {status === 'ended' && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">
                ENDED
              </span>
            )}

            {/* Title with Budget */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold truncate group-hover:underline">
                {title}
              </h3>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatCurrency(budgetUsed)}/{formatCurrency(budget)}
              </span>
            </div>

            {/* Budget Progress */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatCurrency(budgetUsed)} / {formatCurrency(budget)}
              </span>
              <div className="flex-1 max-w-32">
                <Progress value={budgetPercentage} className="h-1.5" />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {budgetPercentage.toFixed(0)}%
              </span>
            </div>

            {/* Tags Row */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                type === 'campaign' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                {type === 'campaign' ? 'Clipping' : 'Boost'}
              </span>
              
              {type === 'campaign' && rpmRate !== undefined && (
                <span className="text-muted-foreground">
                  ${rpmRate.toFixed(2)} / 1k views
                </span>
              )}
              
              {type === 'boost' && videosPerMonth !== undefined && (
                <span className="text-muted-foreground">
                  {videosPerMonth} videos/mo
                </span>
              )}

              {type === 'boost' && spotsRemaining !== undefined && maxCreators !== undefined && (
                <span className="text-muted-foreground">
                  {spotsRemaining}/{maxCreators} spots
                </span>
              )}

              {/* Platform Icons */}
              {allowedPlatforms && allowedPlatforms.length > 0 && (
                <div className="flex items-center gap-1.5 ml-1">
                  {allowedPlatforms.map((platform) => (
                    <span key={platform}>{getPlatformIcon(platform)}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats & Actions */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{formatNumber(totalViews)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5" />
                <span>{totalVideos}</span>
              </div>
            </div>

            {/* Review Badge */}
            {pendingReviewCount > 0 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
              >
                {pendingReviewCount} need review
                <ChevronRight className="w-3 h-3" />
              </button>
            )}

            {/* Action Buttons - Hidden on mobile, visible on hover */}
            <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onArchive && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive();
                  }}
                >
                  <Archive className="w-3 h-3 mr-1" />
                  Archive
                </Button>
              )}
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
              {status === 'active' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </Button>
              )}
              {onTopUp && (
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTopUp();
                  }}
                >
                  <DollarSign className="w-3 h-3 mr-1" />
                  Top up
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
