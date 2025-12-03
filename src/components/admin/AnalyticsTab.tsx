import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity, UserCheck, FileText, ClipboardCheck, ChevronDown } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, BarChart, CartesianGrid } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { format, subDays, subMonths, startOfWeek } from "date-fns";

interface AnalyticsData {
  totalUsers: number;
  newUsersThisMonth: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalEarnings: number;
  totalWithdrawals: number;
  totalAccounts: number;
  pendingApplications: number;
  pendingDemographicReviews: number;
}

type TimePeriod = '3D' | '1W' | '1M' | '3M' | 'ALL';

export function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    newUsersThisMonth: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
    totalAccounts: 0,
    pendingApplications: 0,
    pendingDemographicReviews: 0,
  });
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('3D');

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case '3D': return 'Last 3 Days';
      case '1W': return 'Last Week';
      case '1M': return 'Last Month';
      case '3M': return 'Last 3 Months';
      case 'ALL': return 'All Time';
      default: return 'Last Month';
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (timePeriod) {
      case '3D':
        return { start: subDays(now, 3), end: now };
      case '1W':
        return { start: subDays(now, 7), end: now };
      case '1M':
        return { start: subMonths(now, 1), end: now };
      case '3M':
        return { start: subMonths(now, 3), end: now };
      case 'ALL':
        return { start: new Date(0), end: now };
      default:
        return { start: subMonths(now, 1), end: now };
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchUserGrowthData();
    fetchCampaignData();
  }, [timePeriod]);

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

    // Fetch total accounts
    const { count: totalAccounts } = await supabase
      .from("social_accounts")
      .select("*", { count: "exact", head: true });

    // Fetch pending applications
    const { count: pendingApplications } = await supabase
      .from("campaign_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Fetch pending demographic reviews
    const { count: pendingDemographicReviews } = await supabase
      .from("demographic_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    setAnalytics({
      totalUsers: totalUsers || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      totalCampaigns: totalCampaigns || 0,
      activeCampaigns: activeCampaigns || 0,
      totalEarnings,
      totalWithdrawals,
      totalAccounts: totalAccounts || 0,
      pendingApplications: pendingApplications || 0,
      pendingDemographicReviews: pendingDemographicReviews || 0,
    });
  };

  const fetchUserGrowthData = async () => {
    const { start, end } = getDateRange();
    
    const { data } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (!data) return;

    // Determine grouping based on time period
    const groupBy = timePeriod === '3D' || timePeriod === '1W' ? 'day' : 'month';
    
    // Group by day or month
    const groupedData: { [key: string]: number } = {};
    data.forEach((profile) => {
      const key = groupBy === 'day' 
        ? format(new Date(profile.created_at), 'MMM dd')
        : new Date(profile.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          });
      groupedData[key] = (groupedData[key] || 0) + 1;
    });

    const chartData = Object.entries(groupedData).map(([key, count]) => ({
      month: key,
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
      {/* Key metrics - single row on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Users</CardTitle>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{analytics.totalUsers}</div>
            <p className="text-[10px] text-muted-foreground">+{analytics.newUsersThisMonth} this month</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Campaigns</CardTitle>
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{analytics.totalCampaigns}</div>
            <p className="text-[10px] text-muted-foreground">{analytics.activeCampaigns} active</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Earnings</CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">${analytics.totalEarnings.toFixed(0)}</div>
            <p className="text-[10px] text-muted-foreground">Platform-wide</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Withdrawals</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">${analytics.totalWithdrawals.toFixed(0)}</div>
            <p className="text-[10px] text-muted-foreground">Paid out</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Accounts</CardTitle>
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{analytics.totalAccounts}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pending Apps</CardTitle>
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{analytics.pendingApplications}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Demographics</CardTitle>
              <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{analytics.pendingDemographicReviews}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">User Growth</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-background border-0">
                  {getTimePeriodLabel()}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background z-50">
                <DropdownMenuItem onClick={() => setTimePeriod('3D')}>
                  Last 3 Days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimePeriod('1W')}>
                  Last Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimePeriod('1M')}>
                  Last Month
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimePeriod('3M')}>
                  Last 3 Months
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimePeriod('ALL')}>
                  All Time
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] sm:h-[250px] lg:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    style={{ opacity: 0.6 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    style={{ opacity: 0.6 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0C0C0C",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      fontFamily: "Geist, sans-serif",
                      fontWeight: 700,
                      letterSpacing: "-0.5px"
                    }}
                    labelStyle={{
                      color: "#666666",
                      fontWeight: 700,
                      marginBottom: "4px",
                      fontFamily: "Geist, sans-serif",
                      letterSpacing: "-0.5px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number) => [`${value}`, 'Users']}
                    itemStyle={{
                      color: "#ffffff",
                      fontFamily: "Geist, sans-serif",
                      letterSpacing: "-0.5px",
                      fontWeight: 700
                    }}
                    cursor={{
                      stroke: "#333333",
                      strokeWidth: 2
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fill="url(#userGrowthGradient)" 
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: "#3b82f6",
                      stroke: "#1a1a1a",
                      strokeWidth: 2
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Campaign Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] sm:h-[250px] lg:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignData}>
                  <XAxis 
                    dataKey="status" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    style={{ opacity: 0.6 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    style={{ opacity: 0.6 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0C0C0C",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      fontFamily: "Geist, sans-serif",
                      fontWeight: 700,
                      letterSpacing: "-0.5px"
                    }}
                    labelStyle={{
                      color: "#666666",
                      fontWeight: 700,
                      marginBottom: "4px",
                      fontFamily: "Geist, sans-serif",
                      letterSpacing: "-0.5px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number) => [`${value}`, 'Count']}
                    itemStyle={{
                      color: "#ffffff",
                      fontFamily: "Geist, sans-serif",
                      letterSpacing: "-0.5px",
                      fontWeight: 700
                    }}
                    cursor={{
                      fill: "rgba(255, 255, 255, 0.05)"
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#3b82f6" 
                    radius={[8, 8, 0, 0]} 
                    name="Campaigns"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
