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
      {currentTab === "campaigns" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Creator Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your campaigns, earnings, and profile
              </p>
            </div>
            <Button onClick={handleSignOut} variant="outline" className="border-none">
              Sign Out
            </Button>
          </div>

          {/* Stats Cards */}
          {profile && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-card border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${profile.total_earnings?.toFixed(2) || "0.00"}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{campaigns.length}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Creator Level</CardTitle>
                  <Sparkles className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Rising Star</div>
                </CardContent>
              </Card>
            </div>}
        </>
      )}

      {/* Sign Out button for other tabs (except discover) */}
      {currentTab !== "campaigns" && currentTab !== "discover" && (
        <div className="flex justify-end">
          <Button onClick={handleSignOut} variant="outline" className="border-none">
            Sign Out
          </Button>
        </div>
      )}

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