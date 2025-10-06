import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AnalyticsData {
  totalUsers: number;
  newUsersThisMonth: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalEarnings: number;
  totalWithdrawals: number;
}

export function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    newUsersThisMonth: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
  });
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
    fetchUserGrowthData();
    fetchCampaignData();
  }, []);

  const fetchAnalytics = async () => {
    // Fetch total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Fetch new users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const { count: newUsersThisMonth } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString());

    // Fetch campaigns
    const { count: totalCampaigns } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true });

    const { count: activeCampaigns } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Fetch earnings
    const { data: walletData } = await supabase
      .from("wallets")
      .select("total_earned, total_withdrawn");

    const totalEarnings = walletData?.reduce((sum, w) => sum + (Number(w.total_earned) || 0), 0) || 0;
    const totalWithdrawals = walletData?.reduce((sum, w) => sum + (Number(w.total_withdrawn) || 0), 0) || 0;

    setAnalytics({
      totalUsers: totalUsers || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      totalCampaigns: totalCampaigns || 0,
      activeCampaigns: activeCampaigns || 0,
      totalEarnings,
      totalWithdrawals,
    });
  };

  const fetchUserGrowthData = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("created_at")
      .order("created_at", { ascending: true });

    if (!data) return;

    // Group by month
    const monthlyData: { [key: string]: number } = {};
    data.forEach((profile) => {
      const month = new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    const chartData = Object.entries(monthlyData).map(([month, count]) => ({
      month,
      users: count,
    }));

    setUserGrowthData(chartData);
  };

  const fetchCampaignData = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("status")
      .order("created_at", { ascending: true });

    if (!data) return;

    const statusCount: { [key: string]: number } = {};
    data.forEach((campaign) => {
      statusCount[campaign.status] = (statusCount[campaign.status] || 0) + 1;
    });

    const chartData = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
    }));

    setCampaignData(chartData);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics.newUsersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeCampaigns} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Platform-wide
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalWithdrawals.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Paid out
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
