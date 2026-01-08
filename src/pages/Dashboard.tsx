import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CampaignsTab } from "@/components/dashboard/CampaignsTab";
import { DiscoverTab } from "@/components/dashboard/DiscoverTab";
import { TrainingTab } from "@/components/dashboard/TrainingTab";
import { ReferralsTab } from "@/components/dashboard/ReferralsTab";
import { WalletTab } from "@/components/dashboard/WalletTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { BrandCampaignsTab } from "@/components/dashboard/BrandCampaignsTab";
import { BrandCampaignDetailView } from "@/components/dashboard/BrandCampaignDetailView";
import { JoinPrivateCampaignDialog } from "@/components/JoinPrivateCampaignDialog";
import { AppSidebar } from "@/components/AppSidebar";
import { AnnouncementPopup } from "@/components/onboarding";
import { BlueprintsTab } from "@/components/brand/BlueprintsTab";
import { BlueprintEditor } from "@/components/brand/BlueprintEditor";
import { CreatorsTab } from "@/components/brand/CreatorsTab";
import { CreatorDatabaseTab } from "@/components/brand/CreatorDatabaseTab";
import { CreatorContractsTab } from "@/components/brand/CreatorContractsTab";
import { CreatorLeaderboardTab } from "@/components/brand/CreatorLeaderboardTab";
import { EducationTab } from "@/components/brand/EducationTab";
import { UserSettingsTab } from "@/components/brand/UserSettingsTab";
import { SEOHead } from "@/components/SEOHead";

import { UnifiedMessagesWidget } from "@/components/shared/UnifiedMessagesWidget";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { useAuth } from "@/contexts/AuthContext";

type BrandSummary = {
  id: string;
  name: string;
  slug: string;
  subscription_status: string | null;
  logo_url: string | null;
};

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [privateDialogOpen, setPrivateDialogOpen] = useState(false);
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentBrand, setCurrentBrand] = useState<BrandSummary | null>(null);
  const navigate = useNavigate();

  const currentTab = searchParams.get("tab") || "campaigns";
  const workspace = searchParams.get("workspace") || "creator";
  const selectedCampaignId = searchParams.get("campaign");
  const selectedBoostId = searchParams.get("boost");
  const selectedBlueprintId = searchParams.get("blueprint");
  // On mobile, default to database subtab for creators tab
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const defaultCreatorsSubtab = isMobile ? "database" : "messages";
  const currentSubtab = searchParams.get("subtab") || (currentTab === "creators" ? defaultCreatorsSubtab : "messages");

  const isCreatorMode = workspace === "creator";
  const isBrandMode = !isCreatorMode;

  const { session, loading: authLoading } = useAuth();
  const [oauthCompleting, setOauthCompleting] = useState(false);

  // If we land on /dashboard with implicit tokens in the hash (some OAuth setups),
  // complete the session before applying the auth gate.
  useEffect(() => {
    const run = async () => {
      const hash = window.location.hash || "";
      if (!hash.includes("access_token=") || !hash.includes("refresh_token=")) return;

      try {
        setOauthCompleting(true);
        const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        }

        // Remove tokens from URL immediately
        window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
      } catch (e: any) {
        toast.error(e?.message || "Failed to complete sign-in");
      } finally {
        setOauthCompleting(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    // Restore last workspace from localStorage if no workspace is set in URL
    // But validate that the workspace actually exists first
    const validateAndRestoreWorkspace = async () => {
      const urlWorkspace = searchParams.get("workspace");
      const lastWorkspace = localStorage.getItem("lastWorkspace");

      if (!urlWorkspace && lastWorkspace && lastWorkspace !== "creator") {
        // Validate that the brand slug exists before restoring
        const { data: brandExists } = await supabase
          .from("brands")
          .select("slug")
          .eq("slug", lastWorkspace)
          .maybeSingle();

        if (brandExists) {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("workspace", lastWorkspace);
          newParams.set("tab", searchParams.get("tab") || "campaigns");
          setSearchParams(newParams, { replace: true });
        } else {
          // Clear invalid workspace from localStorage
          localStorage.removeItem("lastWorkspace");
        }
      }
    };

    validateAndRestoreWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth gate + initial data load (wait for auth to finish initializing after OAuth redirect)
  useEffect(() => {
    if (authLoading || oauthCompleting) return;

    if (!session) {
      navigate("/auth", { replace: true });
      return;
    }

    setUserId(session.user.id);

    const loadProfile = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Check if user selected brand during onboarding
      const pendingBrand = sessionStorage.getItem("pendingBrandCreation");
      if (pendingBrand === "true") {
        sessionStorage.removeItem("pendingBrandCreation");
        setShowCreateBrandDialog(true);
      }
    };

    loadProfile();
  }, [authLoading, oauthCompleting, session, navigate, searchParams]);

  // Fetch brand data when workspace changes
  useEffect(() => {
    if (isBrandMode && workspace) {
      fetchBrandBySlug(workspace);
    } else {
      setCurrentBrand(null);
    }
  }, [workspace, isBrandMode]);

  // Handle brand onboarding completion from URL params
  useEffect(() => {
    const onboardingStatus = searchParams.get("onboarding");
    const status = searchParams.get("status");

    if (onboardingStatus === "complete" && (status === "submitted" || status === "success") && currentBrand) {
      const updateOnboardingStatus = async () => {
        try {
          const { error } = await supabase
            .from("brands")
            .update({ whop_onboarding_complete: true })
            .eq("id", currentBrand.id);

          if (!error) {
            toast.success("Verification completed successfully!");
          }

          // Clean up URL params
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("onboarding");
          newParams.delete("status");
          setSearchParams(newParams, { replace: true });
        } catch (error) {
          console.error("Error updating onboarding status:", error);
        }
      };

      updateOnboardingStatus();
    }
  }, [searchParams, currentBrand, setSearchParams]);

  const fetchBrandBySlug = async (slug: string) => {
    const { data } = await supabase
      .from("brands")
      .select("id, name, slug, subscription_status, logo_url")
      .eq("slug", slug)
      .single();

    if (data) {
      setCurrentBrand(data);
    }
  };

  // Brand workspace favicon and title
  useEffect(() => {
    if (!isBrandMode || !currentBrand) return;

    // Update document title
    const originalTitle = document.title;
    document.title = `${currentBrand.name} | Virality`;

    // Update favicon if brand has a logo
    const originalFavicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    const originalHref = originalFavicon?.href || '/favicon.ico';
    const originalAppleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    const originalAppleHref = originalAppleIcon?.href;

    if (currentBrand.logo_url) {
      let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (faviconLink) {
        faviconLink.href = currentBrand.logo_url;
      } else {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.href = currentBrand.logo_url;
        document.head.appendChild(faviconLink);
      }

      if (originalAppleIcon) {
        originalAppleIcon.href = currentBrand.logo_url;
      }
    }

    // Cleanup: restore original favicon and title on unmount or when leaving brand mode
    return () => {
      document.title = originalTitle;
      const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (link) {
        link.href = originalHref;
      }
      if (originalAppleIcon && originalAppleHref) {
        originalAppleIcon.href = originalAppleHref;
      }
    };
  }, [isBrandMode, currentBrand]);

  const renderContent = () => {
    // Brand mode - let BrandCampaignsTab handle its own loading state
    if (isBrandMode && !currentBrand) {
      return null;
    }

    // Brand mode
    if (isBrandMode && currentBrand) {

      // Brand mode with selected campaign - show detail view
      if (selectedCampaignId) {
        return <BrandCampaignDetailView campaignId={selectedCampaignId} />;
      }

      // Brand mode with selected boost - show detail view
      if (selectedBoostId) {
        return <BrandCampaignDetailView boostId={selectedBoostId} />;
      }

      // Brand mode with selected blueprint - show editor
      if (selectedBlueprintId) {
        return <BlueprintEditor blueprintId={selectedBlueprintId} brandId={currentBrand.id} />;
      }

      // Brand mode tabs
      switch (currentTab) {
        case "campaigns":
          return <BrandCampaignsTab brandId={currentBrand.id} brandName={currentBrand.name} />;
        case "analytics":
          return <BrandCampaignDetailView brandId={currentBrand.id} />;
        case "blueprints":
          return <BlueprintsTab brandId={currentBrand.id} />;
        case "creators":
          // Handle creator subtabs
          switch (currentSubtab) {
            case "messages":
              return <CreatorsTab brandId={currentBrand.id} />;
            case "database":
              return <CreatorDatabaseTab brandId={currentBrand.id} />;
            case "contracts":
              return <CreatorContractsTab brandId={currentBrand.id} />;
            case "leaderboard":
              return <CreatorLeaderboardTab brandId={currentBrand.id} />;
            default:
              return <CreatorsTab brandId={currentBrand.id} />;
          }
        case "education":
          return <EducationTab brandId={currentBrand.id} />;
        case "settings":
          return <UserSettingsTab />;
        default:
          return <BrandCampaignsTab brandId={currentBrand.id} brandName={currentBrand.name} />;
      }
    }

    // Creator mode tabs
    switch (currentTab) {
      case "campaigns":
        return <CampaignsTab onOpenPrivateDialog={() => setPrivateDialogOpen(true)} className="pb-[30px]" />;
      case "discover":
        return <DiscoverTab />;
      case "training":
        return <TrainingTab />;
      case "profile":
        return <WalletTab />;
      case "settings":
        return <ProfileTab />;
      // Payments tab (wallet)
      case "wallet":
        return <ReferralsTab />;
      default:
        return <CampaignsTab onOpenPrivateDialog={() => setPrivateDialogOpen(true)} />;
    }
  };
  return <div className="flex h-screen w-full bg-white dark:bg-background">
      <SEOHead title="Dashboard" description="Your Virality creator dashboard" noIndex={true} />
      <AppSidebar />
      
      {/* Main Content */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col bg-background">
        <div className={`
          pt-14 md:pt-0 flex-1 overflow-y-auto pb-20 md:pb-0 bg-background
          ${currentTab === "discover" || currentTab === "wallet" || currentTab === "training" ? "" : isBrandMode ? "" : "px-4 sm:px-6 md:px-8 py-6 md:py-8"}
        `}>
          {renderContent()}
        </div>
      </main>

      <JoinPrivateCampaignDialog open={privateDialogOpen} onOpenChange={setPrivateDialogOpen} />

      {/* Announcements Popup */}
      {userId && <AnnouncementPopup userId={userId} />}

      {/* Brand Creation Dialog - triggered when user selected Brand during onboarding */}
      <CreateBrandDialog
        open={showCreateBrandDialog}
        onOpenChange={setShowCreateBrandDialog}
        hideTrigger
      />

      {/* Creator Chat Widget */}
      {isCreatorMode && <UnifiedMessagesWidget />}

    </div>;
}