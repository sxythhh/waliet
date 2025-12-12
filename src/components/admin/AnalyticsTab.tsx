import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity, UserCheck, FileText, ClipboardCheck, ChevronDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, BarChart, CartesianGrid, Line, LineChart, ComposedChart, Legend, PieChart, Pie, Cell } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { format, subDays, subMonths, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

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
  pendingPayouts: number;
  completedPayouts: number;
  avgWithdrawalAmount: number;
}

type TimePeriod = '3D' | '1W' | '1M' | '3M' | 'ALL';

const CHART_COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  red: '#ef4444',
  cyan: '#06b6d4',
};

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
    pendingPayouts: 0,
    completedPayouts: 0,
    avgWithdrawalAmount: 0,
  });
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [withdrawalData, setWithdrawalData] = useState<any[]>([]);
  const [payoutStatusData, setPayoutStatusData] = useState<any[]>([]);
  const [earningsVsWithdrawalsData, setEarningsVsWithdrawalsData] = useState<any[]>([]);
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
        return { start: new Date('2024-01-01'), end: now };
      default:
        return { start: subMonths(now, 1), end: now };
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchUserGrowthData();
    fetchCampaignData();
    fetchWithdrawalData();
    fetchPayoutStatusData();
    fetchEarningsVsWithdrawalsData();
  }, [timePeriod]);

  const fetchAnalytics = async () => {
    // Fetch total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Fetch new users this month
    const startOfMonthDate = new Date();
    startOfMonthDate.setDate(1);
    const { count: newUsersThisMonth } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonthDate.toISOString());

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

    // Fetch payout stats
    const { count: pendingPayouts } = await supabase
      .from("payout_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: completedPayouts } = await supabase
      .from("payout_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    // Fetch average withdrawal amount
    const { data: payoutData } = await supabase
      .from("payout_requests")
      .select("amount")
      .eq("status", "completed");

    const avgWithdrawalAmount = payoutData && payoutData.length > 0
      ? payoutData.reduce((sum, p) => sum + Number(p.amount), 0) / payoutData.length
      : 0;

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
      pendingPayouts: pendingPayouts || 0,
      completedPayouts: completedPayouts || 0,
      avgWithdrawalAmount,
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

  const fetchWithdrawalData = async () => {
    const { start, end } = getDateRange();
    
    const { data } = await supabase
      .from("payout_requests")
      .select("amount, created_at, status")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (!data) return;

    // Determine grouping based on time period
    const groupBy = timePeriod === '3D' || timePeriod === '1W' ? 'day' : timePeriod === '1M' ? 'week' : 'month';
    
    // Group data
    const groupedData: { [key: string]: { total: number; count: number; completed: number } } = {};
    data.forEach((payout) => {
      let key: string;
      const date = new Date(payout.created_at);
      
      if (groupBy === 'day') {
        key = format(date, 'MMM dd');
      } else if (groupBy === 'week') {
        key = `Week ${format(startOfWeek(date), 'MMM dd')}`;
      } else {
        key = format(date, 'MMM yyyy');
      }
      
      if (!groupedData[key]) {
        groupedData[key] = { total: 0, count: 0, completed: 0 };
      }
      groupedData[key].total += Number(payout.amount);
      groupedData[key].count += 1;
      if (payout.status === 'completed') {
        groupedData[key].completed += Number(payout.amount);
      }
    });

    const chartData = Object.entries(groupedData).map(([key, values]) => ({
      period: key,
      total: values.total,
      count: values.count,
      completed: values.completed,
    }));

    setWithdrawalData(chartData);
  };

  const fetchPayoutStatusData = async () => {
    const { data } = await supabase
      .from("payout_requests")
      .select("status, amount");

    if (!data) return;

    const statusData: { [key: string]: { count: number; amount: number } } = {};
    data.forEach((payout) => {
      if (!statusData[payout.status]) {
        statusData[payout.status] = { count: 0, amount: 0 };
      }
      statusData[payout.status].count += 1;
      statusData[payout.status].amount += Number(payout.amount);
    });

    const chartData = Object.entries(statusData).map(([status, values]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: values.count,
      amount: values.amount,
    }));

    setPayoutStatusData(chartData);
  };

  const fetchEarningsVsWithdrawalsData = async () => {
    const { start, end } = getDateRange();
    
    // Fetch earnings (wallet transactions of type 'earning')
    const { data: earningsData } = await supabase
      .from("wallet_transactions")
      .select("amount, created_at")
      .eq("type", "earning")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    // Fetch withdrawals
    const { data: withdrawalsData } = await supabase
      .from("wallet_transactions")
      .select("amount, created_at")
      .eq("type", "withdrawal")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    const groupBy = timePeriod === '3D' || timePeriod === '1W' ? 'day' : timePeriod === '1M' ? 'week' : 'month';
    
    const groupedData: { [key: string]: { earnings: number; withdrawals: number } } = {};
    
    const getKey = (date: Date) => {
      if (groupBy === 'day') return format(date, 'MMM dd');
      if (groupBy === 'week') return `W${format(startOfWeek(date), 'dd')}`;
      return format(date, 'MMM');
    };

    earningsData?.forEach((t) => {
      const key = getKey(new Date(t.created_at));
      if (!groupedData[key]) groupedData[key] = { earnings: 0, withdrawals: 0 };
      groupedData[key].earnings += Math.abs(Number(t.amount));
    });

    withdrawalsData?.forEach((t) => {
      const key = getKey(new Date(t.created_at));
      if (!groupedData[key]) groupedData[key] = { earnings: 0, withdrawals: 0 };
      groupedData[key].withdrawals += Math.abs(Number(t.amount));
    });

    const chartData = Object.entries(groupedData).map(([key, values]) => ({
      period: key,
      earnings: values.earnings,
      withdrawals: values.withdrawals,
    }));

    setEarningsVsWithdrawalsData(chartData);
  };

  const PIE_COLORS = [CHART_COLORS.orange, CHART_COLORS.green, CHART_COLORS.red, CHART_COLORS.purple];

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "#0C0C0C",
      border: "none",
      borderRadius: "12px",
      padding: "12px 16px",
      fontFamily: "Inter, sans-serif",
      fontWeight: 500,
      letterSpacing: "-0.5px"
    },
    labelStyle: {
      color: "#666666",
      fontWeight: 500,
      marginBottom: "4px",
      fontFamily: "Inter, sans-serif",
      letterSpacing: "-0.5px",
      fontSize: "12px"
    },
    itemStyle: {
      color: "#ffffff",
      fontFamily: "Inter, sans-serif",
      letterSpacing: "-0.5px",
      fontWeight: 500
    }
  };

  return (
    <div className="space-y-6">
      {/* Key metrics - single row on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card/50 border-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">Users</CardTitle>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-inter tracking-[-0.5px]">{analytics.totalUsers}</div>
            <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px] flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              +{analytics.newUsersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">Campaigns</CardTitle>
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-inter tracking-[-0.5px]">{analytics.totalCampaigns}</div>
            <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">{analytics.activeCampaigns} active</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">Total Earnings</CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-inter tracking-[-0.5px]">${analytics.totalEarnings.toFixed(0)}</div>
            <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">Platform-wide</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">Total Paid Out</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-inter tracking-[-0.5px]">${analytics.totalWithdrawals.toFixed(0)}</div>
            <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
              Avg: ${analytics.avgWithdrawalAmount.toFixed(0)}/withdrawal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-card/50 border-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">Accounts</CardTitle>
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-inter tracking-[-0.5px]">{analytics.totalAccounts}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">Pending Apps</CardTitle>
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-inter tracking-[-0.5px]">{analytics.pendingApplications}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">Demographics</CardTitle>
              <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-inter tracking-[-0.5px]">{analytics.pendingDemographicReviews}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">Pending Payouts</CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-inter tracking-[-0.5px] text-orange-500">{analytics.pendingPayouts}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">Completed</CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-inter tracking-[-0.5px] text-green-500">{analytics.completedPayouts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Time period selector */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-card/50 border-0 font-inter tracking-[-0.5px]">
              {getTimePeriodLabel()}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10 z-50">
            <DropdownMenuItem onClick={() => setTimePeriod('3D')} className="font-inter tracking-[-0.5px]">Last 3 Days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimePeriod('1W')} className="font-inter tracking-[-0.5px]">Last Week</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimePeriod('1M')} className="font-inter tracking-[-0.5px]">Last Month</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimePeriod('3M')} className="font-inter tracking-[-0.5px]">Last 3 Months</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimePeriod('ALL')} className="font-inter tracking-[-0.5px]">All Time</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Withdrawals Over Time - Full Width */}
      <Card className="bg-card/50 border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">Withdrawals Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={withdrawalData}>
                <defs>
                  <linearGradient id="withdrawalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="period" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  style={{ opacity: 0.6 }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  style={{ opacity: 0.6 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  style={{ opacity: 0.6 }}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, name: string) => {
                    if (name === 'count') return [value, 'Requests'];
                    return [`$${value.toFixed(2)}`, name === 'total' ? 'Total' : 'Completed'];
                  }}
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="total" 
                  stroke={CHART_COLORS.green}
                  strokeWidth={2} 
                  fill="url(#withdrawalGradient)" 
                  name="total"
                />
                <Bar 
                  yAxisId="right"
                  dataKey="count" 
                  fill={CHART_COLORS.blue}
                  radius={[4, 4, 0, 0]} 
                  name="count"
                  opacity={0.7}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Earnings vs Withdrawals */}
        <Card className="bg-card/50 border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">Earnings vs Withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsVsWithdrawalsData}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="withdrawalsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.orange} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART_COLORS.orange} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="period" 
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
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="earnings" 
                    stroke={CHART_COLORS.blue}
                    strokeWidth={2} 
                    fill="url(#earningsGradient)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="withdrawals" 
                    stroke={CHART_COLORS.orange}
                    strokeWidth={2} 
                    fill="url(#withdrawalsGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payout Status Distribution */}
        <Card className="bg-card/50 border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">Payout Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payoutStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {payoutStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} requests ($${props.payload.amount?.toFixed(2) || 0})`,
                      props.payload.name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 ml-4">
                {payoutStatusData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                      {entry.name}: {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card className="bg-card/50 border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.purple} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
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
                    {...tooltipStyle}
                    formatter={(value: number) => [value, 'Users']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke={CHART_COLORS.purple} 
                    strokeWidth={2} 
                    fill="url(#userGrowthGradient)" 
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: CHART_COLORS.purple,
                      stroke: "#1a1a1a",
                      strokeWidth: 2
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Status */}
        <Card className="bg-card/50 border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">Campaign Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
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
                    {...tooltipStyle}
                    formatter={(value: number) => [value, 'Campaigns']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill={CHART_COLORS.cyan} 
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
