import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, TrendingUp, DollarSign } from "lucide-react";
import { CampaignsTab } from "@/components/dashboard/CampaignsTab";
import { DiscoverTab } from "@/components/dashboard/DiscoverTab";
import { WalletTab } from "@/components/dashboard/WalletTab";
import { LeaderboardTab } from "@/components/dashboard/LeaderboardTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
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
  return <div className={currentTab === "discover" ? "" : "p-8 space-y-8"}>
      {/* Header - Only show on campaigns tab */}
      {currentTab === "campaigns" && <>
          <div className="flex items-center justify-between">
            
            <Button onClick={handleSignOut} variant="outline" className="border-none">
              Sign Out
        </Button>
      </div>
    </>}

      {/* Sign Out button for other tabs (except discover and wallet) */}
      {currentTab !== "campaigns" && currentTab !== "discover" && currentTab !== "wallet" && <div className="flex justify-end">
          <Button onClick={handleSignOut} variant="outline" className="border-none">
            Sign Out
          </Button>
        </div>}

      {/* Main Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        
        
        <TabsContent value="campaigns" className="mt-0">
          <CampaignsTab />
        </TabsContent>
        
        <TabsContent value="discover" className="mt-0">
          <DiscoverTab />
        </TabsContent>
        
        <TabsContent value="wallet" className="mt-0">
          <WalletTab />
        </TabsContent>
        
        <TabsContent value="leaderboard" className="mt-0">
          <LeaderboardTab />
        </TabsContent>
        
        <TabsContent value="profile" className="mt-0">
          <ProfileTab />
        </TabsContent>
      </Tabs>
    </div>;
}