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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentLedger } from "@/hooks/usePaymentLedger";
import { CreatorWithdrawDialog } from "@/components/dashboard/CreatorWithdrawDialog";
import { LocalCurrencyAmount } from "@/components/LocalCurrencyAmount";

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
        "group relative flex items-center gap-1.5 py-1.5 px-1.5 rounded-lg w-full text-left transition-all duration-200",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : danger
            ? "hover:bg-destructive/5 dark:hover:bg-destructive/10"
            : isActive
              ? "bg-primary/10"
              : "hover:bg-muted/50"
      )}
    >
      <div
        className={cn(
          "w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0 transition-colors",
          isActive ? "bg-primary/15" : ""
        )}
      >
        <Icon
          icon={icon}
          className={cn(
            "w-[18px] h-[18px]",
            danger ? "text-destructive" : isActive ? "text-primary" : "text-muted-foreground"
          )}
        />
      </div>
      <span className={cn(
        "text-[13px] font-medium truncate font-inter tracking-[-0.5px] transition-colors",
        danger ? "text-destructive" : isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground dark:group-hover:text-white"
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
    isPublicView,
    activeSection,
    setActiveSection,
    isMobile,
    setMobileNavOpen,
    mobileNavJustOpened,
  } = useSourceDetails();

  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
  const { user } = useAuth();

  // Wallet state
  const [walletBalance, setWalletBalance] = React.useState<number>(0);
  const [pendingWithdrawals, setPendingWithdrawals] = React.useState<number>(0);
  const [pendingBoostEarnings, setPendingBoostEarnings] = React.useState<number>(0);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = React.useState(false);
  const { summary: ledgerSummary } = usePaymentLedger(user?.id);

  // Fetch wallet data
  const fetchWalletData = React.useCallback(async () => {
    if (!user) return;

    // Fetch wallet balance
    const { data: walletData } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();
    if (walletData) {
      setWalletBalance(walletData.balance || 0);
    }

    // Fetch pending withdrawals (in transit)
    const { data: payoutRequests } = await supabase
      .from("payout_requests")
      .select("amount")
      .eq("user_id", user.id)
      .in("status", ["pending", "in_transit"]);
    if (payoutRequests) {
      const totalPending = payoutRequests.reduce((sum, req) => sum + (req.amount || 0), 0);
      setPendingWithdrawals(totalPending);
    }

    // Fetch pending boost earnings
    const { data: boostSubmissions } = await supabase
      .from("boost_video_submissions")
      .select("payout_amount")
      .eq("user_id", user.id)
      .eq("status", "approved");
    if (boostSubmissions) {
      const totalBoost = boostSubmissions.reduce((sum, sub) => sum + (sub.payout_amount || 0), 0);
      setPendingBoostEarnings(totalBoost);
    }
  }, [user]);

  React.useEffect(() => {
    if (user && !isPublicView) {
      fetchWalletData();
    }
  }, [user, isPublicView, fetchWalletData]);

  const totalPending = (ledgerSummary?.totalPending || 0) + pendingBoostEarnings;

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
                    window.open(isCampaign ? `/join/${sourceSlug}` : `/boost/${sourceSlug}`, '_blank');
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
                    const publicUrl = `${window.location.origin}${isCampaign ? `/join/${sourceSlug}` : `/boost/${sourceSlug}`}`;
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

      {/* Budget progress bar (campaigns only) - beneath banner */}
      {isCampaign && (() => {
        const budgetPercentage = budget > 0 ? Math.min(100, (budgetUsed / budget) * 100) : 0;
        const TOTAL_SEGMENTS = 8;
        const filledSegments = Math.round((budgetPercentage / 100) * TOTAL_SEGMENTS);

        return (
          <div className="px-3 pt-2 pb-1">
            <div className="relative group cursor-pointer">
              <div className="flex gap-0.5">
                {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 transition-all duration-300 border-t ${
                      i === 0 ? 'rounded-l-full' : ''
                    } ${
                      i === TOTAL_SEGMENTS - 1 ? 'rounded-r-full' : ''
                    } ${
                      i < filledSegments
                        ? 'bg-primary border-primary/40'
                        : 'bg-muted border-muted-foreground/10'
                    }`}
                  />
                ))}
              </div>
              {/* Tooltip indicator - shows on hover, positioned above last filled segment */}
              <div
                className="absolute bottom-full mb-1 pointer-events-none flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{
                  left: `${((Math.max(filledSegments, 1) - 0.5) / TOTAL_SEGMENTS) * 100}%`,
                  transform: filledSegments <= 1 ? 'translateX(-20%)' : filledSegments >= TOTAL_SEGMENTS - 1 ? 'translateX(-80%)' : 'translateX(-50%)'
                }}
              >
                <div className="bg-blue-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap font-inter">
                  ${budgetUsed.toLocaleString()} of ${budget.toLocaleString()}
                </div>
                <div
                  className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-blue-500"
                  style={{
                    marginLeft: filledSegments <= 1 ? '-30%' : filledSegments >= TOTAL_SEGMENTS - 1 ? '30%' : '0'
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}

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

        {/* Earnings - Right after Overview (hidden for public view) */}
        {!isPublicView && (
          <QuickActionItem
            icon="material-symbols:savings-outline"
            label="Earnings"
            description="View your earnings history"
            onClick={() => handleNavClick("earnings")}
            isActive={activeSection.type === "earnings"}
          />
        )}

        <QuickActionItem
          icon="material-symbols:sticky-note-2-outline"
          label="Blueprint"
          description="Content guide & training"
          onClick={() => handleNavClick("blueprint")}
          isActive={activeSection.type === "blueprint" || activeSection.type === "training"}
          badge={isCampaign && hasTrainingModules && trainingProgress < 100 ? `${completedCount}/${sortedModules.length}` : undefined}
        />

        {/* Folders - Always visible */}
        <QuickActionItem
          icon="material-symbols:folder-match-outline"
          label="Folders"
          description="Brand assets and resources"
          onClick={() => handleNavClick("assets")}
          isActive={activeSection.type === "assets"}
        />

        {/* Get Support (hidden for public view) */}
        {!isPublicView && (
          <QuickActionItem
            icon="material-symbols:support-agent"
            label="Get Support"
            description="Need help? Contact us"
            onClick={() => handleNavClick("support")}
            isActive={activeSection.type === "support"}
          />
        )}

        {/* My Submissions - Only show for boosts or campaigns that require video submissions (hidden for public view) */}
        {!isPublicView && (isBoost || (isCampaign && paymentModel === 'pay_per_post')) && (
          <QuickActionItem
            icon="material-symbols:install-desktop"
            label="My Submissions"
            description="View your submitted content"
            onClick={() => handleNavClick("submissions")}
            isActive={activeSection.type === "submissions"}
            badge={submissionCount > 0 ? submissionCount : undefined}
          />
        )}

        {/* BOOST: Agreement - Only show when contract exists (hidden for public view) */}
        {!isPublicView && isBoost && hasContract && (
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

        {/* Discord - Show Join Discord if user has Discord connected and there's a URL (hidden for public view) */}
        {!isPublicView && discordUrl && hasDiscordConnected && (
          <QuickActionItem
            icon="ic:baseline-discord"
            label="Discord"
            description="Join the community"
            onClick={() => window.open(discordUrl, '_blank')}
          />
        )}

      </div>

      {/* Wallet Balance Section (hidden for public view) */}
      {!isPublicView && user && (
        <div className={cn("px-3 pt-1.5 pb-3", !isCampaign && "mt-auto")}>
          <div className="px-3 py-2.5 rounded-lg bg-muted/30 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Current Balance</span>
                <span className="text-sm font-semibold font-inter tracking-[-0.5px]">
                  <LocalCurrencyAmount amount={walletBalance} />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Pending Balance</span>
                <span className="text-sm font-medium text-muted-foreground font-inter tracking-[-0.5px]">
                  <LocalCurrencyAmount amount={totalPending} />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">In Transit</span>
                <span className="text-sm font-medium text-muted-foreground font-inter tracking-[-0.5px]">
                  <LocalCurrencyAmount amount={pendingWithdrawals} />
                </span>
              </div>
            </div>
            <Button
              className="w-full font-inter tracking-[-0.5px]"
              size="sm"
              onClick={() => setWithdrawDialogOpen(true)}
            >
              Withdraw
            </Button>
          </div>
        </div>
      )}

      {/* Withdraw Dialog */}
      <CreatorWithdrawDialog
        open={withdrawDialogOpen}
        onOpenChange={setWithdrawDialogOpen}
        onSuccess={fetchWalletData}
      />
    </aside>
  );
}
