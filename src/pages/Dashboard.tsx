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
import { BlueprintsTab } from "@/components/brand/BlueprintsTab";
import { BlueprintEditor } from "@/components/brand/BlueprintEditor";
import { CreatorsTab } from "@/components/brand/CreatorsTab";
import { UserSettingsTab } from "@/components/brand/UserSettingsTab";
import { CreatorChatWidget } from "@/components/dashboard/CreatorChatWidget";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [privateDialogOpen, setPrivateDialogOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOnboardingCard, setShowOnboardingCard] = useState(true);
  const { shouldShowOnboarding, isLoading: onboardingLoading } = useOnboardingStatus();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentBrand, setCurrentBrand] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const navigate = useNavigate();
  const currentTab = searchParams.get("tab") || "campaigns";
  const workspace = searchParams.get("workspace") || "creator";
  const selectedCampaignId = searchParams.get("campaign");
  const selectedBlueprintId = searchParams.get("blueprint");
  const isCreatorMode = workspace === "creator";
  const isBrandMode = !isCreatorMode;
  useEffect(() => {
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
    } = await supabase.from("brands").select("id, name, slug").eq("slug", slug).single();
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

    // Onboarding disabled - keeping code for potential future use
    // if (profileData && !profileData.phone_number) {
    //   setShowOnboarding(true);
    // }
  };
  const fetchCampaigns = async () => {
    const {
      data
    } = await supabase.from("campaigns").select("*").eq("status", "active").order("created_at", {
      ascending: false
    });
    setCampaigns(data || []);
  };
  const renderContent = () => {
    // Brand mode with selected campaign - show detail view
    if (isBrandMode && currentBrand && selectedCampaignId) {
      return <BrandCampaignDetailView campaignId={selectedCampaignId} />;
    }

    // Brand mode with selected blueprint - show editor
    if (isBrandMode && currentBrand && selectedBlueprintId) {
      return <BlueprintEditor blueprintId={selectedBlueprintId} brandId={currentBrand.id} />;
    }

    // Brand mode tabs
    if (isBrandMode && currentBrand) {
      switch (currentTab) {
        case "campaigns":
          return <BrandCampaignsTab brandId={currentBrand.id} brandName={currentBrand.name} />;
        case "blueprints":
          return <BlueprintsTab brandId={currentBrand.id} />;
        case "creators":
          return <CreatorsTab brandId={currentBrand.id} />;
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

      {/* Onboarding Card Popup - show when user has 0 tasks completed */}
      {isCreatorMode && (
        <OnboardingCard 
          open={shouldShowOnboarding && showOnboardingCard && !onboardingLoading} 
          onOpenChange={setShowOnboardingCard} 
        />
      )}

      {/* Creator Chat Widget - only show in creator mode */}
      {isCreatorMode && <CreatorChatWidget />}
    </div>;
}