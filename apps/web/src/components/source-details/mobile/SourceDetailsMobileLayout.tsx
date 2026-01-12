import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useSourceDetails } from "../SourceDetailsSidebarProvider";
import { SourceDetailsLeftSidebar, TrainingModule, ProgressStats } from "../SourceDetailsLeftSidebar";
import { MobileSwipeContainer } from "./MobileSwipeContainer";
import { MobileRightSwipeContainer } from "./MobileRightSwipeContainer";
import { OptimizedImage } from "@/components/OptimizedImage";
import { WalletDropdown } from "@/components/WalletDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface SourceDetailsMobileLayoutProps {
  // Source info
  sourceId: string;
  sourceTitle: string;
  sourceSlug?: string | null;
  brandName: string;
  brandLogoUrl?: string | null;
  brandColor?: string | null;
  bannerUrl?: string | null;
  memberCount?: number;
  isVerified?: boolean;
  discordUrl?: string | null;

  // Quick action callbacks
  onSubmitVideo?: () => void;
  onLeave?: () => void;
  brandSlug?: string | null;
  blueprintId?: string | null;
  hasConnectedAccounts?: boolean;
  canSubmit?: boolean;
  paymentModel?: string | null;

  // Discord props
  hasDiscordServer?: boolean;
  hasDiscordConnected?: boolean;

  // Assets props
  hasAssets?: boolean;

  // Training (campaigns only)
  modules?: TrainingModule[];
  completedModuleIds?: Set<string>;
  trainingProgress?: number;
  budget?: number;
  budgetUsed?: number;

  // Submission count
  submissionCount?: number;

  // Progress (boosts only)
  progressStats?: ProgressStats;

  // Contract props (for agreement tab)
  hasContract?: boolean;
  contractStatus?: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled' | null;

  // Right panel content
  rightPanel?: React.ReactNode;

  // Main content
  children: React.ReactNode;

  className?: string;
}

function MobileHeader({
  title,
  logoUrl,
  brandColor,
  onMenuTap,
  onRightPanelTap,
  avatarUrl,
  displayName,
  hasRightPanel,
}: {
  title: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  onMenuTap: () => void;
  onRightPanelTap?: () => void;
  avatarUrl?: string | null;
  displayName?: string;
  hasRightPanel?: boolean;
}) {
  const navigate = useNavigate();

  const getInitial = () => {
    return displayName?.charAt(0).toUpperCase() || "U";
  };

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border/50 h-14 px-4 flex items-center gap-3">
      {/* Tappable campaign info - opens menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMenuTap();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="flex-1 flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
      >
        {logoUrl ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <OptimizedImage src={logoUrl} alt={title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: brandColor || "#5865f2" }}
          >
            {title.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-semibold text-foreground truncate font-inter">
          {title}
        </span>
        <Icon icon="material-symbols:keyboard-arrow-down" className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Right side: Wallet + Profile */}
      <div className="flex items-center gap-2">
        <WalletDropdown variant="header" />
        <button
          onClick={() => navigate("/dashboard?tab=settings")}
          className="cursor-pointer"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={avatarUrl || undefined} alt={displayName || "Profile"} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {getInitial()}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
}

export function SourceDetailsMobileLayout({
  sourceId,
  sourceTitle,
  sourceSlug,
  brandName,
  brandLogoUrl,
  brandColor,
  bannerUrl,
  memberCount = 0,
  isVerified,
  discordUrl,
  // Quick action props
  onSubmitVideo,
  onLeave,
  brandSlug,
  blueprintId,
  hasConnectedAccounts,
  canSubmit,
  paymentModel,
  // Discord props
  hasDiscordServer = false,
  hasDiscordConnected = false,
  // Assets props
  hasAssets = false,
  // Training props
  modules = [],
  completedModuleIds = new Set(),
  trainingProgress = 0,
  budget = 0,
  budgetUsed = 0,
  submissionCount = 0,
  progressStats,
  // Contract props
  hasContract = false,
  contractStatus = null,
  rightPanel,
  children,
  className,
}: SourceDetailsMobileLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mobileNavOpen, setMobileNavOpen, rightPanelOpen, setRightPanelOpen } = useSourceDetails();

  // Profile data for header
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name, username")
        .eq("id", user.id)
        .single();
      if (data) {
        setAvatarUrl(data.avatar_url);
        setDisplayName(data.full_name || data.username || user.email || "");
      }
    };
    fetchProfile();
  }, [user]);

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      <MobileSwipeContainer
        isOpen={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        panel={
          <SourceDetailsLeftSidebar
            sourceTitle={sourceTitle}
            brandName={brandName}
            brandLogoUrl={brandLogoUrl}
            brandColor={brandColor}
            bannerUrl={bannerUrl}
            memberCount={memberCount}
            isVerified={isVerified}
            discordUrl={discordUrl}
            // Quick action props
            onSubmitVideo={onSubmitVideo}
            onLeave={onLeave}
            brandSlug={brandSlug}
            blueprintId={blueprintId}
            sourceSlug={sourceSlug}
            hasConnectedAccounts={hasConnectedAccounts}
            canSubmit={canSubmit}
            paymentModel={paymentModel}
            // Discord props
            hasDiscordServer={hasDiscordServer}
            hasDiscordConnected={hasDiscordConnected}
            // Assets props
            hasAssets={hasAssets}
            // Training props
            modules={modules}
            completedModuleIds={completedModuleIds}
            trainingProgress={trainingProgress}
            budget={budget}
            budgetUsed={budgetUsed}
            submissionCount={submissionCount}
            progressStats={progressStats}
            // Contract props
            hasContract={hasContract}
            contractStatus={contractStatus}
            className="h-full"
          />
        }
      >
        {/* Main content area */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <MobileHeader
            title={sourceTitle}
            logoUrl={brandLogoUrl}
            brandColor={brandColor}
            onMenuTap={() => setMobileNavOpen(true)}
            onRightPanelTap={() => setRightPanelOpen(true)}
            avatarUrl={avatarUrl}
            displayName={displayName}
            hasRightPanel={!!rightPanel}
          />

          {/* Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </MobileSwipeContainer>

      {/* Right panel (members, announcements, etc.) */}
      {rightPanel && (
        <MobileRightSwipeContainer
          isOpen={rightPanelOpen}
          onOpenChange={setRightPanelOpen}
          panel={rightPanel}
        />
      )}
    </div>
  );
}
