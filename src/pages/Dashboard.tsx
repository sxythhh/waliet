import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { OnboardingCard } from "@/components/OnboardingCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { BlueprintsTab } from "@/components/brand/BlueprintsTab";
import { BlueprintEditor } from "@/components/brand/BlueprintEditor";
import { CreatorsTab } from "@/components/brand/CreatorsTab";
import { EducationTab } from "@/components/brand/EducationTab";
import { UserSettingsTab } from "@/components/brand/UserSettingsTab";
import { ScopeTab } from "@/components/brand/ScopeTab";
import { CreatorChatWidget } from "@/components/dashboard/CreatorChatWidget";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [privateDialogOpen, setPrivateDialogOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOnboardingCard, setShowOnboardingCard] = useState(false);
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const { completedCount, markOnboardingComplete } = useOnboardingStatus();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentBrand, setCurrentBrand] = useState<{
    id: string;
    name: string;
    slug: string;
    subscription_status: string | null;
  } | null>(null);
  const navigate = useNavigate();
  const currentTab = searchParams.get("tab") || "campaigns";
  const workspace = searchParams.get("workspace") || "creator";
  const selectedCampaignId = searchParams.get("campaign");
  const selectedBlueprintId = searchParams.get("blueprint");
  const isCreatorMode = workspace === "creator";
  const isBrandMode = !isCreatorMode;
  useEffect(() => {
    // Restore last workspace from localStorage if no workspace is set in URL
    const urlWorkspace = searchParams.get("workspace");
    const lastWorkspace = localStorage.getItem("lastWorkspace");
    
    if (!urlWorkspace && lastWorkspace && lastWorkspace !== "creator") {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("workspace", lastWorkspace);
      newParams.set("tab", searchParams.get("tab") || "campaigns");
      setSearchParams(newParams, { replace: true });
    }
    
    checkAuth();
    fetchCampaigns();
  }, []);

  // Fetch brand data when workspace changes
  useEffect(() => {
    if (isBrandMode && workspace) {
      fetchBrandBySlug(workspace);
    } else {
      setCurrentBrand(null);
    }
  }, [workspace, isBrandMode]);
  const fetchBrandBySlug = async (slug: string) => {
    const {
      data
    } = await supabase.from("brands").select("id, name, slug, subscription_status").eq("slug", slug).single();
    if (data) {
      setCurrentBrand(data);
    }
  };
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    const {
      data: profileData
    } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setProfile(profileData);

    // Check if user selected brand during onboarding
    const pendingBrand = sessionStorage.getItem('pendingBrandCreation');
    if (pendingBrand === 'true') {
      sessionStorage.removeItem('pendingBrandCreation');
      setShowCreateBrandDialog(true);
    }
    
    // Show onboarding card popup for new users in creator mode
    const currentWorkspace = searchParams.get("workspace") || "creator";
    if (profileData && !profileData.onboarding_completed && currentWorkspace === "creator") {
      setShowOnboardingCard(true);
    }
  };
  const fetchCampaigns = async () => {
    const {
      data
    } = await supabase.from("campaigns").select("*").eq("status", "active").order("created_at", {
      ascending: false
    });
    setCampaigns(data || []);
  };
  const { isAdmin } = useAdminCheck();

  const renderContent = () => {
    // Brand mode - check subscription status first (admins bypass paywall)
    if (isBrandMode && currentBrand) {
      // Show subscription embed if no active plan (unless admin or on settings page)
      if (currentBrand.subscription_status !== 'active' && !isAdmin && currentTab !== 'profile') {
        return (
          <iframe
            src="https://join.virality.gg/page-2"
            className="w-full h-full border-0"
            title="Subscribe"
          />
        );
      }

      // Brand mode with selected campaign - show detail view
      if (selectedCampaignId) {
        return <BrandCampaignDetailView campaignId={selectedCampaignId} />;
      }

      // Brand mode with selected blueprint - show editor
      if (selectedBlueprintId) {
        return <BlueprintEditor blueprintId={selectedBlueprintId} brandId={currentBrand.id} />;
      }

      // Brand mode tabs
      switch (currentTab) {
        case "campaigns":
          return <BrandCampaignsTab brandId={currentBrand.id} brandName={currentBrand.name} />;
        case "blueprints":
          return <BlueprintsTab brandId={currentBrand.id} />;
        case "scope":
          return <ScopeTab brandId={currentBrand.id} />;
        case "creators":
          return <CreatorsTab brandId={currentBrand.id} />;
        case "education":
          return <EducationTab brandId={currentBrand.id} />;
        case "profile":
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
      case "referrals":
        return <ReferralsTab />;
      case "wallet":
        return <WalletTab />;
      case "profile":
        return <ProfileTab />;
      default:
        return <CampaignsTab onOpenPrivateDialog={() => setPrivateDialogOpen(true)} />;
    }
  };
  return <div className="flex h-screen w-full bg-background">
      <AppSidebar />
      
      {/* Main Content */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col">
        <div className={`
          pt-14 pb-20 md:pt-0 md:pb-0 flex-1 overflow-y-auto
          ${currentTab === "discover" || currentTab === "referrals" || currentTab === "training" ? "" : isBrandMode ? "" : "px-4 sm:px-6 md:px-8 py-6 md:py-8"}
        `}>
          {renderContent()}
        </div>
      </main>

      <JoinPrivateCampaignDialog open={privateDialogOpen} onOpenChange={setPrivateDialogOpen} />
      
      {userId && <OnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} userId={userId} />}

      {/* Brand Creation Dialog - triggered when user selected Brand during onboarding */}
      <CreateBrandDialog 
        open={showCreateBrandDialog} 
        onOpenChange={setShowCreateBrandDialog} 
        hideTrigger 
      />

      {/* Creator Chat Widget - only show in creator mode */}
      {isCreatorMode && <CreatorChatWidget />}

      {/* Onboarding Card Popup for new users */}
      <Dialog open={showOnboardingCard} onOpenChange={setShowOnboardingCard}>
        <DialogContent className="sm:max-w-[440px] p-6 border-0 bg-card rounded-2xl">
          <OnboardingCard onSelect={() => {
            markOnboardingComplete();
            setShowOnboardingCard(false);
          }} />
        </DialogContent>
      </Dialog>
    </div>;
}