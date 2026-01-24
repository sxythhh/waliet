import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OptimizedImage } from "@/components/OptimizedImage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@iconify/react";
import clippingIconWhite from "@/assets/clipping-icon-white.svg";
import clippingIconDark from "@/assets/clipping-icon-dark.svg";
import boostIconWhite from "@/assets/boost-icon-white.svg";
import boostIconDark from "@/assets/boost-icon-dark.svg";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface CampaignMember {
  id: string;
  avatar_url?: string | null;
  display_name?: string;
  full_name?: string | null;
  username?: string | null;
}

interface CampaignGridCardProps {
  id: string;
  title: string;
  type: "campaign" | "boost";
  bannerUrl: string | null;
  brandColor?: string | null;
  budget: number;
  budgetUsed: number;
  status: string;
  members?: CampaignMember[];
  totalMemberCount?: number;
  onClick: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onPause?: () => void;
  onDelete?: () => void;
  onTopUp?: () => void;
  onShare?: () => void;
  onPreview?: () => void;
  slug?: string;
  dataTourTarget?: string;
}

export function CampaignGridCard({
  title,
  type,
  bannerUrl,
  brandColor,
  budget,
  budgetUsed,
  status,
  members = [],
  totalMemberCount,
  onClick,
  onEdit,
  onDuplicate,
  onPause,
  onDelete,
  onTopUp,
  onShare,
  onPreview,
  slug,
  dataTourTarget,
}: CampaignGridCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const budgetPercentage = budget > 0 ? (budgetUsed / budget) * 100 : 0;
  const budgetRemaining = Math.max(0, budget - budgetUsed);

  // Status colors
  const isDepleted = budget > 0 && budgetPercentage >= 100;
  const isCritical = budget > 0 && budgetPercentage >= 90;
  const isWarning = budget > 0 && budgetPercentage >= 75 && budgetPercentage < 90;

  const getBarColor = () => {
    return "bg-primary";
  };

  const getTextColor = () => {
    return "text-foreground";
  };

  // Status badge - matching /c/ page design
  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return (
          <Badge className="rounded-md bg-emerald-600 hover:bg-emerald-600 border-t border-t-emerald-400 gap-1 text-white font-inter tracking-[-0.5px]">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Active
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="rounded-md bg-emerald-600 hover:bg-emerald-600 border-t border-t-emerald-400 gap-1 text-white font-inter tracking-[-0.5px]">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Under Review
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="secondary" className="rounded-md border-t border-t-border/80 font-inter tracking-[-0.5px]">Draft</Badge>
        );
      case "paused":
        return (
          <Badge variant="secondary" className="rounded-md border-t border-t-border/80 font-inter tracking-[-0.5px]">Paused</Badge>
        );
      case "ended":
        return (
          <Badge className="rounded-md bg-red-600 hover:bg-red-600 border-t border-t-red-400 text-white font-inter tracking-[-0.5px]">Ended</Badge>
        );
      default:
        return null;
    }
  };

  // Type badge - matching /c/ page design
  const getTypeBadge = () => {
    return (
      <Badge variant="secondary" className="gap-1 opacity-70 font-inter tracking-[-0.5px]">
        <img
          key={`icon-${isDark}`}
          src={type === "campaign" ? (isDark ? clippingIconWhite : clippingIconDark) : (isDark ? boostIconWhite : boostIconDark)}
          alt=""
          className="w-3 h-3"
        />
        {type === "campaign" ? "Clipping" : "Retainer"}
      </Badge>
    );
  };

  const formatCurrency = (num: number) => {
    return `$${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  return (
    <Card
      data-tour-target={dataTourTarget}
      className="group bg-card hover:bg-muted/30 dark:bg-[#0e0e0e] dark:hover:bg-[#121212] transition-all duration-200 overflow-hidden cursor-pointer border border-border/50 dark:border-transparent rounded-xl"
      onClick={onClick}
    >
      {/* Banner - 3:1 aspect ratio (shorter) */}
      <div className="relative aspect-[3/1] overflow-hidden bg-muted">
        {bannerUrl ? (
          <OptimizedImage
            src={bannerUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: brandColor || "#6366f1" }}
          />
        )}

        {/* Hover actions overlay - top right */}
        <div className={cn(
          "absolute top-2 right-2 flex items-center gap-1.5 transition-opacity",
          dropdownOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {/* Fund Campaign button */}
          {onTopUp && (
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-white shadow-lg font-inter tracking-[-0.5px]"
              onClick={(e) => {
                e.stopPropagation();
                onTopUp();
              }}
            >
              Fund
            </Button>
          )}

          {/* Preview button */}
          {onPreview && slug && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs bg-card dark:bg-[#0e0e0e] hover:bg-muted dark:hover:bg-[#1a1a1a] text-foreground hover:text-foreground shadow-lg gap-1 font-inter tracking-[-0.5px]"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
            >
              <span className="material-symbols-rounded text-[14px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}>open_in_new</span>
              Preview
            </Button>
          )}

          {/* Resume button for paused/ended */}
          {(status === "paused" || status === "ended") && onPause && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2.5 text-xs bg-white/90 hover:bg-white text-black shadow-lg font-inter tracking-[-0.5px]"
              onClick={(e) => {
                e.stopPropagation();
                onPause();
              }}
            >
              Resume
            </Button>
          )}

          {/* Three-dot menu */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="w-7 h-7 rounded-md bg-card dark:bg-[#0e0e0e] hover:bg-muted dark:hover:bg-[#1a1a1a] flex items-center justify-center text-foreground shadow-lg transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon icon="material-symbols:more-vert" className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-36 bg-popover dark:bg-[#0a0a0a] border-border dark:border-[#1a1a1a]"
              onClick={(e) => e.stopPropagation()}
            >
              {onShare && slug && (
                <DropdownMenuItem
                  onClick={onShare}
                  className="cursor-pointer text-xs py-1.5 gap-2 focus:bg-muted dark:focus:bg-[#151515] font-inter tracking-[-0.5px]"
                >
                  <Icon icon="material-symbols:ios-share" className="w-4 h-4" />
                  Share
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem
                  onClick={onEdit}
                  className="cursor-pointer text-xs py-1.5 gap-2 focus:bg-muted dark:focus:bg-[#151515] font-inter tracking-[-0.5px]"
                >
                  <Icon icon="material-symbols:edit-outline" className="w-4 h-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem
                  onClick={onDuplicate}
                  className="cursor-pointer text-xs py-1.5 gap-2 focus:bg-muted dark:focus:bg-[#151515] font-inter tracking-[-0.5px]"
                >
                  <Icon icon="material-symbols:content-copy-outline" className="w-4 h-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onPause && status !== "paused" && status !== "ended" && (
                <>
                  <DropdownMenuSeparator className="bg-border dark:bg-[#1a1a1a]" />
                  <DropdownMenuItem
                    onClick={onPause}
                    className="cursor-pointer text-xs py-1.5 gap-2 focus:bg-muted dark:focus:bg-[#151515] font-inter tracking-[-0.5px]"
                  >
                    <Icon icon="material-symbols:pause-circle-outline" className="w-4 h-4" />
                    Pause
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator className="bg-border dark:bg-[#1a1a1a]" />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="cursor-pointer text-xs py-1.5 gap-2 text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/50 font-inter tracking-[-0.5px]"
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

      {/* Content */}
      <div className="p-3 space-y-2.5">
        {/* Title row with badges */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground truncate font-inter tracking-[-0.5px]">
            {title || "Untitled"}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {getStatusBadge()}
          </div>
        </div>

        {/* Budget progress - continuous bar */}
        {budget > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium font-inter tracking-[-0.5px] text-foreground">
                {formatCurrency(budgetRemaining)} left
              </span>
              <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                {Math.round(budgetPercentage)}% used
              </span>
            </div>
            {/* Continuous progress bar */}
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, budgetPercentage)}%` }}
              />
            </div>
          </div>
        )}

        {/* Show unfunded state */}
        {budget === 0 && status !== "draft" && (
          <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Unfunded</p>
        )}

        {/* Members avatar stack */}
        {members.length > 0 ? (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex -space-x-2">
              {members.slice(0, 3).map((member, index) => (
                <Avatar
                  key={member.id}
                  className="w-6 h-6 rounded-full ring-0"
                  style={{ zIndex: 3 - index }}
                >
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-muted dark:bg-[#2a2a2a] text-muted-foreground">
                    {(member.display_name || member.full_name || member.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {(totalMemberCount || members.length) > 3 && (
              <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                +{(totalMemberCount || members.length) - 3} more
              </span>
            )}
            {members.length <= 3 && members.length > 0 && !totalMemberCount && (
              <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                {members.length} {members.length === 1 ? "creator" : "creators"}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] pt-1">No members yet</p>
        )}
      </div>
    </Card>
  );
}
