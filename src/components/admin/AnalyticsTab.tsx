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
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1M');

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">
              Social accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.pendingApplications}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Demographics</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.pendingDemographicReviews}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>
      </div>

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
        <Card className="bg-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">User Growth</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-background">
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
            <div className="h-[300px]">
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
                      fontFamily: "Instrument Sans, sans-serif",
                      letterSpacing: "-0.5px"
                    }}
                    labelStyle={{
                      color: "#666666",
                      fontWeight: 500,
                      marginBottom: "4px",
                      fontFamily: "Instrument Sans, sans-serif",
                      letterSpacing: "-0.5px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number) => [`${value}`, 'Users']}
                    itemStyle={{
                      color: "#ffffff",
                      fontFamily: "Instrument Sans, sans-serif",
                      letterSpacing: "-0.5px",
                      fontWeight: 600
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
            <div className="h-[300px]">
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
                      fontFamily: "Instrument Sans, sans-serif",
                      letterSpacing: "-0.5px"
                    }}
                    labelStyle={{
                      color: "#666666",
                      fontWeight: 500,
                      marginBottom: "4px",
                      fontFamily: "Instrument Sans, sans-serif",
                      letterSpacing: "-0.5px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number) => [`${value}`, 'Count']}
                    itemStyle={{
                      color: "#ffffff",
                      fontFamily: "Instrument Sans, sans-serif",
                      letterSpacing: "-0.5px",
                      fontWeight: 600
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
