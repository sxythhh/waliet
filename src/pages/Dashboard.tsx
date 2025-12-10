import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CampaignsTab } from "@/components/dashboard/CampaignsTab";
import { DiscoverTab } from "@/components/dashboard/DiscoverTab";
import { TrainingTab } from "@/components/dashboard/TrainingTab";
import { ReferralsTab } from "@/components/dashboard/ReferralsTab";
import { WalletTab } from "@/components/dashboard/WalletTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { JoinPrivateCampaignDialog } from "@/components/JoinPrivateCampaignDialog";
import { AppSidebar } from "@/components/AppSidebar";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [privateDialogOpen, setPrivateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const currentTab = searchParams.get("tab") || "campaigns";

  useEffect(() => {
    checkAuth();
    fetchCampaigns();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setProfile(profileData);
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
  };

  const renderContent = () => {
    switch (currentTab) {
      case "campaigns":
        return <CampaignsTab onOpenPrivateDialog={() => setPrivateDialogOpen(true)} />;
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

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      
      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        <div className={`
          pt-14 pb-20 md:pt-0 md:pb-0
          ${currentTab === "discover" || currentTab === "referrals" || currentTab === "training" 
            ? "" 
            : "px-4 sm:px-6 md:px-8 py-6 md:py-8"
          }
        `}>
          {renderContent()}
        </div>
      </main>

      <JoinPrivateCampaignDialog open={privateDialogOpen} onOpenChange={setPrivateDialogOpen} />
    </div>
  );
}
