import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ChevronDown } from "lucide-react";
import {
  CheckCircle,
  RadioButtonUnchecked,
  Bolt,
} from "@mui/icons-material";
import { cn } from "@/lib/utils";
import { useSourceDetails, SourceDetailsSectionType } from "./SourceDetailsSidebarProvider";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

// Training module interface (for campaigns)
export interface TrainingModule {
  id: string;
  title: string;
  required: boolean;
  order_index: number;
}

// Progress stats interface (for boosts)
export interface ProgressStats {
  totalViews: number;
  targetViews: number;
  earnings: number;
  submissionCount: number;
}

interface SourceDetailsLeftSidebarProps {
  // Common props
  brandName: string;
  brandLogoUrl?: string | null;
  brandColor?: string | null;
  isVerified?: boolean;
  sourceTitle: string;
  bannerUrl?: string | null;
  discordUrl?: string | null;
  submissionCount?: number;
  memberCount?: number;
  className?: string;

  // Quick action props
  onSubmitVideo?: () => void;
  onLeave?: () => void;
  brandSlug?: string | null;
  blueprintId?: string | null;
  sourceSlug?: string | null;
  hasConnectedAccounts?: boolean;
  canSubmit?: boolean;
  paymentModel?: string | null;

  // Discord props
  hasDiscordServer?: boolean;
  hasDiscordConnected?: boolean;

  // Assets props
  hasAssets?: boolean;

  // Campaign-specific props
  modules?: TrainingModule[];
  completedModuleIds?: Set<string>;
  trainingProgress?: number;
  budget?: number;
  budgetUsed?: number;

  // Boost-specific props
  progressStats?: ProgressStats;

  // Contract props (for agreement tab)
  hasContract?: boolean;
  contractStatus?: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled' | null;
}

interface QuickActionItemProps {
  icon: string;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  badge?: string | number;
  isActive?: boolean;
}

function QuickActionItem({ icon, label, onClick, disabled, danger, badge, isActive }: QuickActionItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex items-center gap-1.5 p-2 rounded-lg w-full text-left transition-all duration-200",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : danger
            ? "hover:bg-destructive/5 dark:hover:bg-destructive/10"
            : isActive
              ? "bg-primary/10"
              : "hover:bg-muted/50"
      )}
    >
      <Icon
        icon={icon}
        className={cn(
          "w-5 h-5 flex-shrink-0",
          danger ? "text-destructive" : isActive ? "text-primary" : "text-muted-foreground"
        )}
      />
      <span className={cn(
        "text-sm font-medium truncate font-inter tracking-[-0.5px] transition-colors",
        danger ? "text-destructive" : isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground dark:group-hover:text-white"
      )}>
        {label}
      </span>
      {badge !== undefined && (
        <span className="min-w-[18px] h-[18px] text-[10px] font-semibold bg-primary/20 text-primary rounded-full font-inter ml-auto flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  );
}

interface TrainingItemProps {
  label: string;
  moduleId: string;
  isCompleted: boolean;
  isRequired: boolean;
}

function TrainingItem({ label, moduleId, isCompleted, isRequired }: TrainingItemProps) {
  const { activeSection, setActiveSection } = useSourceDetails();
  const isActive = activeSection.type === "training" && activeSection.moduleId === moduleId;

  return (
    <button
      onClick={() => setActiveSection({ type: "training", moduleId })}
      className={cn(
        "flex items-center w-full px-2 py-1.5 text-xs rounded-lg transition-all group",
        isActive
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <span className={cn(
        "mr-2 flex-shrink-0",
        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )}>
        {isCompleted ? (
          <CheckCircle sx={{ fontSize: 16 }} className="text-green-500" />
        ) : (
          <RadioButtonUnchecked sx={{ fontSize: 16 }} />
        )}
      </span>
      <span className="flex-1 text-left truncate font-medium font-inter tracking-[-0.5px]">{label}</span>
      {isRequired && !isCompleted && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-2 animate-pulse" />
      )}
    </button>
  );
}

export function SourceDetailsLeftSidebar({
  brandName,
  brandLogoUrl,
  brandColor,
  isVerified,
  sourceTitle,
  bannerUrl,
  discordUrl,
  submissionCount = 0,
  memberCount = 0,
  className,
  // Quick action props
  onSubmitVideo,
  onLeave,
  brandSlug,
  blueprintId,
  sourceSlug,
  hasConnectedAccounts = false,
  canSubmit = true,
  paymentModel,
  // Discord props
  hasDiscordServer = false,
  hasDiscordConnected = false,
  // Assets props
  hasAssets = false,
  // Campaign props
  modules = [],
  completedModuleIds = new Set(),
  trainingProgress = 0,
  budget = 0,
  budgetUsed = 0,
  // Boost props
  progressStats,
  // Contract props
  hasContract = false,
  contractStatus = null,
}: SourceDetailsLeftSidebarProps) {
  const navigate = useNavigate();
  const {
    sourceType,
    activeSection,
    setActiveSection,
    isMobile,
    setMobileNavOpen,
    mobileNavJustOpened,
  } = useSourceDetails();

  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);

  // Prevent popover from opening when sidebar just opened (accidental tap prevention)
  const handlePopoverOpenChange = (open: boolean) => {
    if (open && mobileNavJustOpened) {
      return; // Ignore open requests when sidebar just opened
    }
    setHeaderMenuOpen(open);
  };

  const isCampaign = sourceType === "campaign";
  const isBoost = sourceType === "boost";

  // Sort modules by order_index (campaigns only)
  const sortedModules = React.useMemo(
    () => [...modules].sort((a, b) => a.order_index - b.order_index),
    [modules]
  );

  const completedCount = sortedModules.filter((m) => completedModuleIds.has(m.id)).length;
  const hasTrainingModules = sortedModules.length > 0;

  // Generate gradient fallback using brand color or default
  const gradientColor = brandColor || "#5865f2";
  const gradientStyle = {
    background: bannerUrl
      ? undefined
      : `linear-gradient(135deg, ${gradientColor} 0%, ${gradientColor}cc 50%, ${gradientColor}88 100%)`,
  };

  // Handle navigation item click
  const handleNavClick = (type: SourceDetailsSectionType) => {
    setActiveSection({ type });
    if (isMobile) setMobileNavOpen(false);
  };

  return (
    <aside
      className={cn(
        "flex-shrink-0 bg-card overflow-y-auto flex flex-col",
        isMobile ? "w-full" : "w-64 border-r border-border/50",
        className
      )}
    >
      {/* Banner Section */}
      <div
        className="h-28 w-full relative"
        style={gradientStyle}
      >
        {bannerUrl && (
          <OptimizedImage
            src={bannerUrl}
            alt={sourceTitle}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Gradient overlay - fades from dark at top to transparent at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
        {/* Brand logo and title at top - clickable header */}
        <div className={cn(
          "absolute top-0 left-0 right-0 z-10",
          mobileNavJustOpened && "pointer-events-none"
        )}>
          <Popover open={headerMenuOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-1.5 transition-all",
                  "hover:bg-black/[0.33]",
                  headerMenuOpen && "bg-black/[0.33]"
                )}
              >
                {/* Brand logo */}
                {brandLogoUrl ? (
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-black/20 shadow-lg">
                    <OptimizedImage
                      src={brandLogoUrl}
                      alt={brandName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-lg"
                    style={{ backgroundColor: brandColor || "#5865f2" }}
                  >
                    {brandName.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Title and member count */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                  <h2 className="text-[13px] font-semibold text-white truncate drop-shadow-lg leading-tight font-inter tracking-[-0.3px]" title={sourceTitle}>
                    {sourceTitle}
                  </h2>
                  <span className="text-[11px] text-white/60 drop-shadow leading-none font-inter">
                    {memberCount.toLocaleString()} {memberCount === 1 ? "member" : "members"}
                  </span>
                </div>
                {/* Chevron indicator */}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-white/50 flex-shrink-0 transition-transform",
                    headerMenuOpen && "rotate-180"
                  )}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[246px] p-1 bg-popover dark:bg-background border border-border/50 rounded-lg shadow-xl ml-[5px]"
              align="start"
              sideOffset={0}
            >
              {/* View Brand */}
              {brandSlug && (
                <button
                  onClick={() => {
                    navigate(`/b/${brandSlug}`);
                    setHeaderMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Icon icon="material-symbols:storefront" className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground font-inter tracking-[-0.5px]">View Brand</span>
                </button>
              )}
              {/* View Public Page */}
              {sourceSlug && (
                <button
                  onClick={() => {
                    window.open(isCampaign ? `/c/${sourceSlug}` : `/boost/${sourceSlug}`, '_blank');
                    setHeaderMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Icon icon="material-symbols:open-in-new" className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground font-inter tracking-[-0.5px]">
                    {isCampaign ? "Campaign Page" : "Boost Page"}
                  </span>
                </button>
              )}
              {/* Invite Creators */}
              {sourceSlug && (
                <button
                  onClick={() => {
                    const publicUrl = `${window.location.origin}${isCampaign ? `/c/${sourceSlug}` : `/boost/${sourceSlug}`}`;
                    navigator.clipboard.writeText(publicUrl);
                    toast.success("Link copied to clipboard");
                    setHeaderMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Icon icon="material-symbols:content-copy" className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground font-inter tracking-[-0.5px]">Invite Creators</span>
                </button>
              )}
              {/* Leave Campaign/Boost */}
              {onLeave && (
                <button
                  onClick={() => {
                    onLeave();
                    setHeaderMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                >
                  <Icon icon="material-symbols:logout" className="w-4 h-4 text-destructive" />
                  <span className="text-[13px] font-medium text-destructive font-inter tracking-[-0.5px]">
                    {isCampaign ? "Leave Campaign" : "Leave Boost"}
                  </span>
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-2 py-3 space-y-1">
        {/* Submit Video - Prominent CTA at top */}
        {onSubmitVideo && (isCampaign ? paymentModel === 'pay_per_post' : true) && (
          <button
            onClick={onSubmitVideo}
            disabled={isCampaign ? !hasConnectedAccounts : !canSubmit}
            className={cn(
              "w-full py-2 px-4 rounded-lg text-sm font-semibold font-inter tracking-[-0.5px] transition-all mb-2",
              (isCampaign ? !hasConnectedAccounts : !canSubmit)
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/90"
            )}
          >
            Submit Video
          </button>
        )}

        {/* Main Navigation */}
        <QuickActionItem
          icon="material-symbols:inbox-outline"
          label="Overview"
          description={isCampaign ? "Details, platforms & pay rate" : "Boost details & earnings"}
          onClick={() => handleNavClick("overview")}
          isActive={activeSection.type === "overview"}
        />

        <QuickActionItem
          icon="material-symbols:sticky-note-2-outline"
          label="Blueprint"
          description="Content guide & training"
          onClick={() => handleNavClick("blueprint")}
          isActive={activeSection.type === "blueprint" || activeSection.type === "training"}
          badge={isCampaign && hasTrainingModules && trainingProgress < 100 ? `${completedCount}/${sortedModules.length}` : undefined}
        />

        {/* Assets - Show if blueprint has assets */}
        {hasAssets && (
          <QuickActionItem
            icon="material-symbols:folder-open-outline"
            label="Assets"
            description="Brand assets and resources"
            onClick={() => handleNavClick("assets")}
            isActive={activeSection.type === "assets"}
          />
        )}

        {/* Get Support */}
        <QuickActionItem
          icon="material-symbols:support-agent"
          label="Get Support"
          description="Need help? Contact us"
          onClick={() => handleNavClick("support")}
          isActive={activeSection.type === "support"}
        />

        {/* My Submissions - Only show for boosts or campaigns that require video submissions */}
        {(isBoost || (isCampaign && paymentModel === 'pay_per_post')) && (
          <QuickActionItem
            icon="material-symbols:install-desktop"
            label="My Submissions"
            description="View your submitted content"
            onClick={() => handleNavClick("submissions")}
            isActive={activeSection.type === "submissions"}
            badge={submissionCount > 0 ? submissionCount : undefined}
          />
        )}

        {/* Earnings */}
        <QuickActionItem
          icon="material-symbols:savings-outline"
          label="Earnings"
          description="View your earnings history"
          onClick={() => handleNavClick("earnings")}
          isActive={activeSection.type === "earnings"}
        />

        {/* BOOST: Agreement - Only show when contract exists */}
        {isBoost && hasContract && (
          <QuickActionItem
            icon="material-symbols:lab-profile-outline"
            label="Agreement"
            description={
              contractStatus === 'signed'
                ? "Contract signed"
                : contractStatus === 'sent' || contractStatus === 'viewed'
                  ? "Signature required"
                  : contractStatus === 'draft'
                    ? "Contract being prepared"
                    : contractStatus === 'expired'
                      ? "Contract expired"
                      : contractStatus === 'cancelled'
                        ? "Contract cancelled"
                        : "View contract"
            }
            onClick={() => handleNavClick("agreement")}
            isActive={activeSection.type === "agreement"}
            badge={
              contractStatus === 'sent' || contractStatus === 'viewed'
                ? "!"
                : contractStatus === 'expired' || contractStatus === 'cancelled'
                  ? "!"
                  : undefined
            }
          />
        )}

        {/* Discord - Show Connect Discord if server has Discord but user hasn't connected */}
        {hasDiscordServer && !hasDiscordConnected && (
          <QuickActionItem
            icon="ic:baseline-discord"
            label="Connect Discord"
            description="Link your Discord account"
            onClick={() => {
              // Store return URL and redirect to Discord connect
              localStorage.setItem('discord_return_url', window.location.href);
              window.location.href = '/connect-discord';
            }}
          />
        )}

        {/* Discord - Show Join Discord if user has Discord connected and there's a URL */}
        {discordUrl && hasDiscordConnected && (
          <QuickActionItem
            icon="ic:baseline-discord"
            label="Discord"
            description="Join the community"
            onClick={() => window.open(discordUrl, '_blank')}
          />
        )}

      </div>

      {/* Bottom status - Budget progress (campaigns only) */}
      {isCampaign && (
        <div className="p-3 border-t border-border/50 mt-auto">
          <div className="px-3 py-2.5 rounded-lg bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-foreground font-inter tracking-[-0.5px]">
                  ${budgetUsed.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground font-medium font-inter">
                  / ${budget.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    budget > 0 && budgetUsed >= budget ? "bg-red-500" : "bg-primary"
                  )}
                  style={{ width: `${budget > 0 ? Math.min((budgetUsed / budget) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
