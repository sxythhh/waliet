import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, TrendingUp, DollarSign } from "lucide-react";
import { CampaignsTab } from "@/components/dashboard/CampaignsTab";
import { DiscoverTab } from "@/components/dashboard/DiscoverTab";
import { TrainingTab } from "@/components/dashboard/TrainingTab";
import { ReferralsTab } from "@/components/dashboard/ReferralsTab";
import { WalletTab } from "@/components/dashboard/WalletTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { JoinPrivateCampaignDialog } from "@/components/JoinPrivateCampaignDialog";
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
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    const {
      data: profileData
    } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setProfile(profileData);
  };
  const fetchCampaigns = async () => {
    const {
      data
    } = await supabase.from("campaigns").select("*").eq("status", "active").order("created_at", {
      ascending: false
    });
    setCampaigns(data || []);
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  const handleTabChange = (value: string) => {
    setSearchParams({
      tab: value
    });
  };
  return <div className={currentTab === "discover" || currentTab === "referrals" || currentTab === "training" ? "pt-14 md:pt-0" : "pt-14 md:pt-0 px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 space-y-4 sm:space-y-6 md:space-y-8"}>
      {/* Header - Only show on campaigns tab */}
      {currentTab === "campaigns"}

      {/* Sign Out button for other tabs (except discover, referrals, training and wallet) */}
      {currentTab !== "campaigns" && currentTab !== "discover" && currentTab !== "referrals" && currentTab !== "training" && currentTab !== "wallet"}

      {/* Main Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        
        
        <TabsContent value="campaigns" className="mt-0 space-y-8">
          <CampaignsTab onOpenPrivateDialog={() => setPrivateDialogOpen(true)} />
        </TabsContent>
        
        <TabsContent value="discover" className="mt-0">
          <DiscoverTab />
        </TabsContent>
        
        <TabsContent value="training" className="mt-0">
          <TrainingTab />
        </TabsContent>
        
        <TabsContent value="referrals" className="mt-0">
          <ReferralsTab />
        </TabsContent>
        
        <TabsContent value="wallet" className="mt-0">
          <WalletTab />
        </TabsContent>
        
        <TabsContent value="profile" className="mt-0">
          <ProfileTab />
        </TabsContent>
      </Tabs>

      <JoinPrivateCampaignDialog open={privateDialogOpen} onOpenChange={setPrivateDialogOpen} />
    </div>;
}