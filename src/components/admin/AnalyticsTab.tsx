import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity, UserCheck, FileText, ClipboardCheck, ChevronDown, ArrowUpRight, ArrowDownRight, Calendar, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, BarChart, ComposedChart, PieChart, Pie, Cell } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, subMonths, startOfWeek, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  totalUsers: number;
  newUsersCurrentPeriod: number;
  newUsersPreviousPeriod: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalEarnings: number;
  earningsCurrentPeriod: number;
  earningsPreviousPeriod: number;
  totalWithdrawals: number;
  withdrawalsCurrentPeriod: number;
  withdrawalsPreviousPeriod: number;
  totalAccounts: number;
  accountsCurrentPeriod: number;
  accountsPreviousPeriod: number;
  pendingApplications: number;
  pendingDemographicReviews: number;
  pendingPayouts: number;
  completedPayouts: number;
  avgWithdrawalAmount: number;
  activeMembers: number;
  registrationToJoinRate: number;
  registrationToPayoutRate: number;
}

type TimePeriod = 'TODAY' | '3D' | '1W' | '1M' | '3M' | 'ALL' | 'CUSTOM';

const CHART_COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  red: '#ef4444',
  cyan: '#06b6d4',
};

const TIME_OPTIONS = [
  { value: 'TODAY', label: 'Today' },
  { value: '3D', label: '3 Days' },
  { value: '1W', label: '1 Week' },
  { value: '1M', label: '1 Month' },
  { value: '3M', label: '3 Months' },
  { value: 'ALL', label: 'All Time' },
];

export function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    newUsersCurrentPeriod: 0,
    newUsersPreviousPeriod: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalEarnings: 0,
    earningsCurrentPeriod: 0,
    earningsPreviousPeriod: 0,
    totalWithdrawals: 0,
    withdrawalsCurrentPeriod: 0,
    withdrawalsPreviousPeriod: 0,
    totalAccounts: 0,
    accountsCurrentPeriod: 0,
    accountsPreviousPeriod: 0,
    pendingApplications: 0,
    pendingDemographicReviews: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    avgWithdrawalAmount: 0,
    activeMembers: 0,
    registrationToJoinRate: 0,
    registrationToPayoutRate: 0,
  });
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [withdrawalData, setWithdrawalData] = useState<any[]>([]);
  const [payoutStatusData, setPayoutStatusData] = useState<any[]>([]);
  const [earningsVsWithdrawalsData, setEarningsVsWithdrawalsData] = useState<any[]>([]);
  const [creatorFunnelData, setCreatorFunnelData] = useState<any[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1W');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const getTimePeriodLabel = () => {
    if (timePeriod === 'CUSTOM' && customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d')}`;
    }
    return TIME_OPTIONS.find(o => o.value === timePeriod)?.label || '1 Week';
  };

  const getDateRange = () => {
    const now = new Date();
    if (timePeriod === 'CUSTOM' && customDateRange.from && customDateRange.to) {
      return { start: startOfDay(customDateRange.from), end: endOfDay(customDateRange.to) };
    }
    switch (timePeriod) {
      case 'TODAY':
        return { start: startOfDay(now), end: now };
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
        return { start: subDays(now, 7), end: now };
    }
  };

  const getPreviousDateRange = () => {
    const { start, end } = getDateRange();
    const duration = end.getTime() - start.getTime();
    return {
      start: new Date(start.getTime() - duration),
      end: new Date(end.getTime() - duration),
    };
  };

  useEffect(() => {
    fetchAnalytics();
    fetchUserGrowthData();
    fetchCampaignData();
    fetchWithdrawalData();
    fetchPayoutStatusData();
    fetchEarningsVsWithdrawalsData();
    fetchCreatorFunnelData();
  }, [timePeriod, customDateRange]);

  const fetchAnalytics = async () => {
    const { start, end } = getDateRange();
    const { start: prevStart, end: prevEnd } = getPreviousDateRange();

    // Fetch total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Fetch users in current period
    const { count: newUsersCurrentPeriod } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    // Fetch users in previous period
    const { count: newUsersPreviousPeriod } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevStart.toISOString())
      .lte("created_at", prevEnd.toISOString());

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

    // Fetch earnings in current period
    const { data: currentEarningsData } = await supabase
      .from("wallet_transactions")
      .select("amount")
      .eq("type", "earning")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    const earningsCurrentPeriod = currentEarningsData?.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

    // Fetch earnings in previous period
    const { data: prevEarningsData } = await supabase
      .from("wallet_transactions")
      .select("amount")
      .eq("type", "earning")
      .gte("created_at", prevStart.toISOString())
      .lte("created_at", prevEnd.toISOString());
    const earningsPreviousPeriod = prevEarningsData?.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

    // Fetch withdrawals in current period - only completed
    const { data: currentWithdrawalsData } = await supabase
      .from("payout_requests")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    const withdrawalsCurrentPeriod = currentWithdrawalsData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Fetch withdrawals in previous period - only completed
    const { data: prevWithdrawalsData } = await supabase
      .from("payout_requests")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", prevStart.toISOString())
      .lte("created_at", prevEnd.toISOString());
    const withdrawalsPreviousPeriod = prevWithdrawalsData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Fetch total accounts
    const { count: totalAccounts } = await supabase
      .from("social_accounts")
      .select("*", { count: "exact", head: true });

    // Fetch accounts in current period
    const { count: accountsCurrentPeriod } = await supabase
      .from("social_accounts")
      .select("*", { count: "exact", head: true })
      .gte("connected_at", start.toISOString())
      .lte("connected_at", end.toISOString());

    // Fetch accounts in previous period
    const { count: accountsPreviousPeriod } = await supabase
      .from("social_accounts")
      .select("*", { count: "exact", head: true })
      .gte("connected_at", prevStart.toISOString())
      .lte("connected_at", prevEnd.toISOString());

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

    // Fetch active members (users with completed payouts in last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const { data: activePayouts } = await supabase
      .from("payout_requests")
      .select("user_id")
      .eq("status", "completed")
      .gte("processed_at", thirtyDaysAgo.toISOString());
    const activeMembers = new Set(activePayouts?.map(p => p.user_id) || []).size;

    // Calculate registration-to-join conversion rate
    const { count: usersWhoJoined } = await supabase
      .from("campaign_submissions")
      .select("creator_id", { count: "exact", head: true });
    const registrationToJoinRate = totalUsers && totalUsers > 0 
      ? ((usersWhoJoined || 0) / totalUsers) * 100 
      : 0;

    // Calculate registration-to-payout conversion rate
    const { data: usersWithPayouts } = await supabase
      .from("payout_requests")
      .select("user_id")
      .eq("status", "completed");
    const uniqueUsersWithPayouts = new Set(usersWithPayouts?.map(p => p.user_id) || []).size;
    const registrationToPayoutRate = totalUsers && totalUsers > 0 
      ? (uniqueUsersWithPayouts / totalUsers) * 100 
      : 0;

    setAnalytics({
      totalUsers: totalUsers || 0,
      newUsersCurrentPeriod: newUsersCurrentPeriod || 0,
      newUsersPreviousPeriod: newUsersPreviousPeriod || 0,
      totalCampaigns: totalCampaigns || 0,
      activeCampaigns: activeCampaigns || 0,
      totalEarnings,
      earningsCurrentPeriod,
      earningsPreviousPeriod,
      totalWithdrawals,
      withdrawalsCurrentPeriod,
      withdrawalsPreviousPeriod,
      totalAccounts: totalAccounts || 0,
      accountsCurrentPeriod: accountsCurrentPeriod || 0,
      accountsPreviousPeriod: accountsPreviousPeriod || 0,
      pendingApplications: pendingApplications || 0,
      pendingDemographicReviews: pendingDemographicReviews || 0,
      pendingPayouts: pendingPayouts || 0,
      completedPayouts: completedPayouts || 0,
      avgWithdrawalAmount,
      activeMembers,
      registrationToJoinRate,
      registrationToPayoutRate,
    });
  };

  const fetchCreatorFunnelData = async () => {
    // Fetch payout counts per user
    const { data: payoutCounts } = await supabase
      .from("payout_requests")
      .select("user_id")
      .eq("status", "completed");

    if (!payoutCounts) {
      setCreatorFunnelData([]);
      return;
    }

    // Count payouts per user
    const userPayoutCounts: { [key: string]: number } = {};
    payoutCounts.forEach((p) => {
      userPayoutCounts[p.user_id] = (userPayoutCounts[p.user_id] || 0) + 1;
    });

    // Categorize into funnel buckets
    let onePayout = 0;
    let twoToFive = 0;
    let sixToTen = 0;
    let elevenToTwenty = 0;
    let twentyPlus = 0;

    Object.values(userPayoutCounts).forEach((count) => {
      if (count === 1) onePayout++;
      else if (count >= 2 && count <= 5) twoToFive++;
      else if (count >= 6 && count <= 10) sixToTen++;
      else if (count >= 11 && count <= 20) elevenToTwenty++;
      else twentyPlus++;
    });

    setCreatorFunnelData([
      { name: '1 payout', value: onePayout, fill: CHART_COLORS.blue },
      { name: '2-5 payouts', value: twoToFive, fill: CHART_COLORS.cyan },
      { name: '6-10 payouts', value: sixToTen, fill: CHART_COLORS.green },
      { name: '11-20 payouts', value: elevenToTwenty, fill: CHART_COLORS.orange },
      { name: '20+ payouts', value: twentyPlus, fill: CHART_COLORS.purple },
    ]);
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

  const PIE_COLORS = [CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.red, CHART_COLORS.purple];

  const CustomTooltip = ({ active, payload, label, type }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-[#0C0C0C] rounded-xl px-4 py-3 shadow-xl border border-white/5">
        <p className="text-[11px] text-white/50 font-inter tracking-[-0.5px] mb-2 uppercase">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            let displayName = entry.name;
            let displayValue = entry.value;
            
            if (type === 'withdrawal') {
              if (entry.dataKey === 'total') displayName = 'Total Amount';
              if (entry.dataKey === 'count') displayName = 'Requests';
              if (entry.dataKey === 'completed') displayName = 'Completed';
              displayValue = entry.dataKey === 'count' ? entry.value : `$${entry.value.toFixed(2)}`;
            } else if (type === 'earnings') {
              displayName = entry.dataKey === 'earnings' ? 'Earnings' : 'Withdrawals';
              displayValue = `$${entry.value.toFixed(2)}`;
            } else if (type === 'users') {
              displayName = 'New Users';
              displayValue = entry.value;
            } else if (type === 'campaigns') {
              displayName = 'Campaigns';
              displayValue = entry.value;
            }

            return (
              <div key={index} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: entry.color || entry.fill }}
                  />
                  <span className="text-xs text-white/70 font-inter tracking-[-0.5px]">{displayName}</span>
                </div>
                <span className="text-sm font-semibold text-white font-inter tracking-[-0.5px]">{displayValue}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-[#0C0C0C] rounded-xl px-4 py-3 shadow-xl border border-white/5">
        <p className="text-[11px] text-white/50 font-inter tracking-[-0.5px] mb-2 uppercase">{data.name}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs text-white/70 font-inter tracking-[-0.5px]">Requests</span>
            <span className="text-sm font-semibold text-white font-inter tracking-[-0.5px]">{data.value}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs text-white/70 font-inter tracking-[-0.5px]">Amount</span>
            <span className="text-sm font-semibold text-white font-inter tracking-[-0.5px]">${data.amount?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      </div>
    );
  };

  const getChangeIndicator = (current: number, previous: number) => {
    if (previous === 0) return { isPositive: current > 0, change: current > 0 ? 100 : 0 };
    const change = ((current - previous) / previous) * 100;
    return { isPositive: change >= 0, change: Math.abs(change) };
  };

  const getPeriodLabel = () => {
    switch (timePeriod) {
      case 'TODAY': return 'vs yesterday';
      case '3D': return 'vs prev 3 days';
      case '1W': return 'vs prev week';
      case '1M': return 'vs prev month';
      case '3M': return 'vs prev 3 months';
      case 'ALL': return 'all time';
      case 'CUSTOM': return 'vs prev period';
      default: return '';
    }
  };

  const userChange = getChangeIndicator(analytics.newUsersCurrentPeriod, analytics.newUsersPreviousPeriod);
  const earningsChange = getChangeIndicator(analytics.earningsCurrentPeriod, analytics.earningsPreviousPeriod);
  const withdrawalsChange = getChangeIndicator(analytics.withdrawalsCurrentPeriod, analytics.withdrawalsPreviousPeriod);
  const accountsChange = getChangeIndicator(analytics.accountsCurrentPeriod, analytics.accountsPreviousPeriod);

  return (
    <div className="space-y-6">
      {/* Header with title and time period selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-inter tracking-[-0.5px] text-white">Virality Data</h1>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-sm font-medium font-inter tracking-[-0.5px] text-white hover:text-white/80 transition-colors">
                {timePeriod === 'CUSTOM' && customDateRange.from && customDateRange.to 
                  ? `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d')}`
                  : TIME_OPTIONS.find(o => o.value === timePeriod)?.label || 'Select'}
                <ChevronDown className="h-4 w-4 text-white/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0c0c0c] border-white/10 min-w-[140px]">
              {TIME_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTimePeriod(option.value as TimePeriod)}
                  className="flex items-center justify-between text-sm font-inter tracking-[-0.5px] text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  {option.label}
                  {timePeriod === option.value && <Check className="h-3.5 w-3.5 text-white" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => setIsDatePickerOpen(true)}
                className="flex items-center gap-2 text-sm font-inter tracking-[-0.5px] text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5" />
                Custom Range
                {timePeriod === 'CUSTOM' && <Check className="h-3.5 w-3.5 text-white ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <span />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#0a0a0a] border-white/10" align="end">
              <CalendarComponent
                mode="range"
                selected={{ from: customDateRange.from, to: customDateRange.to }}
                onSelect={(range) => {
                  setCustomDateRange({ from: range?.from, to: range?.to });
                  if (range?.from && range?.to) {
                    setTimePeriod('CUSTOM');
                    setIsDatePickerOpen(false);
                  }
                }}
                numberOfMonths={2}
                className="rounded-md pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Key metrics - redesigned */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/[0.03] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 font-inter tracking-[-0.5px]">New Users</p>
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-semibold font-inter",
              userChange.isPositive ? "text-green-400" : "text-red-400"
            )}>
              {userChange.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {userChange.change.toFixed(0)}%
            </div>
          </div>
          <div className="text-2xl font-bold font-inter tracking-[-0.5px] text-white">
            {timePeriod === 'ALL' ? analytics.totalUsers.toLocaleString() : analytics.newUsersCurrentPeriod.toLocaleString()}
          </div>
          <p className="text-[10px] text-white/30 font-inter tracking-[-0.5px] mt-1">
            vs {analytics.newUsersPreviousPeriod} previous
          </p>
        </div>

        <div className="bg-white/[0.03] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 font-inter tracking-[-0.5px]">Earnings</p>
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-semibold font-inter",
              earningsChange.isPositive ? "text-green-400" : "text-red-400"
            )}>
              {earningsChange.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {earningsChange.change.toFixed(0)}%
            </div>
          </div>
          <div className="text-2xl font-bold font-inter tracking-[-0.5px] text-white">
            ${timePeriod === 'ALL' ? analytics.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : analytics.earningsCurrentPeriod.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-white/30 font-inter tracking-[-0.5px] mt-1">
            vs ${analytics.earningsPreviousPeriod.toFixed(2)} previous
          </p>
        </div>

        <div className="bg-white/[0.03] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 font-inter tracking-[-0.5px]">Paid Out</p>
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-semibold font-inter",
              withdrawalsChange.isPositive ? "text-green-400" : "text-red-400"
            )}>
              {withdrawalsChange.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {withdrawalsChange.change.toFixed(0)}%
            </div>
          </div>
          <div className="text-2xl font-bold font-inter tracking-[-0.5px] text-white">
            ${timePeriod === 'ALL' ? analytics.totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : analytics.withdrawalsCurrentPeriod.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-white/30 font-inter tracking-[-0.5px] mt-1">
            vs ${analytics.withdrawalsPreviousPeriod.toFixed(2)} previous
          </p>
        </div>

        <div className="bg-white/[0.03] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 font-inter tracking-[-0.5px]">Accounts</p>
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-semibold font-inter",
              accountsChange.isPositive ? "text-green-400" : "text-red-400"
            )}>
              {accountsChange.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {accountsChange.change.toFixed(0)}%
            </div>
          </div>
          <div className="text-2xl font-bold font-inter tracking-[-0.5px] text-white">
            {timePeriod === 'ALL' ? analytics.totalAccounts.toLocaleString() : analytics.accountsCurrentPeriod.toLocaleString()}
          </div>
          <p className="text-[10px] text-white/30 font-inter tracking-[-0.5px] mt-1">
            vs {analytics.accountsPreviousPeriod} previous
          </p>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="text-lg font-bold font-inter tracking-[-0.5px] text-green-400">{analytics.activeMembers}</div>
          <p className="text-[10px] text-white/40 font-inter tracking-[-0.5px]">Active Members (30d)</p>
        </div>

        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="text-lg font-bold font-inter tracking-[-0.5px] text-white">{analytics.totalCampaigns}</div>
          <p className="text-[10px] text-white/40 font-inter tracking-[-0.5px]">Campaigns ({analytics.activeCampaigns} active)</p>
        </div>

        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="text-lg font-bold font-inter tracking-[-0.5px] text-cyan-400">{analytics.registrationToJoinRate.toFixed(1)}%</div>
          <p className="text-[10px] text-white/40 font-inter tracking-[-0.5px]">Reg → Campaign Join</p>
        </div>

        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="text-lg font-bold font-inter tracking-[-0.5px] text-purple-400">{analytics.registrationToPayoutRate.toFixed(1)}%</div>
          <p className="text-[10px] text-white/40 font-inter tracking-[-0.5px]">Reg → First Payout</p>
        </div>
      </div>

      {/* Tertiary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="text-lg font-bold font-inter tracking-[-0.5px] text-white">{analytics.pendingApplications}</div>
          <p className="text-[10px] text-white/40 font-inter tracking-[-0.5px]">Pending Apps</p>
        </div>

        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="text-lg font-bold font-inter tracking-[-0.5px] text-white">{analytics.pendingDemographicReviews}</div>
          <p className="text-[10px] text-white/40 font-inter tracking-[-0.5px]">Demographics Review</p>
        </div>

        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="text-lg font-bold font-inter tracking-[-0.5px] text-orange-400">{analytics.pendingPayouts}</div>
          <p className="text-[10px] text-white/40 font-inter tracking-[-0.5px]">Pending Payouts</p>
        </div>

        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="text-lg font-bold font-inter tracking-[-0.5px] text-green-400">{analytics.completedPayouts}</div>
          <p className="text-[10px] text-white/40 font-inter tracking-[-0.5px]">Completed Payouts</p>
        </div>
      </div>

      {/* Creator Funnel Chart */}
      <Card className="bg-card/50 border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">Creator Economy Funnel</CardTitle>
          <p className="text-xs text-white/40 font-inter tracking-[-0.5px]">Distribution of creators by number of payouts received</p>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            {creatorFunnelData.length > 0 && creatorFunnelData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={creatorFunnelData} layout="vertical">
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} style={{ opacity: 0.6 }} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} style={{ opacity: 0.6 }} width={90} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-[#0C0C0C] rounded-xl px-4 py-3 shadow-xl border border-white/5">
                          <p className="text-xs text-white font-inter font-semibold">{payload[0].payload.name}</p>
                          <p className="text-sm text-white/70 font-inter">{payload[0].value} creators</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {creatorFunnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/30 text-sm font-inter">
                No payout data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                <Tooltip content={<CustomTooltip type="withdrawal" />} />
                <Area 
                  yAxisId="left"
                  type="linear" 
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
                  <Tooltip content={<CustomTooltip type="earnings" />} />
                  <Area 
                    type="linear" 
                    dataKey="earnings" 
                    stroke={CHART_COLORS.blue}
                    strokeWidth={2} 
                    fill="url(#earningsGradient)" 
                  />
                  <Area 
                    type="linear" 
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
                    stroke="none"
                  >
                    {payoutStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
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
              {userGrowthData.length > 0 ? (
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
                    <Tooltip content={<CustomTooltip type="users" />} />
                    <Area 
                      type="linear" 
                      dataKey="users" 
                      stroke={CHART_COLORS.purple} 
                      strokeWidth={2} 
                      fill="url(#userGrowthGradient)" 
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-white/30 text-sm font-inter">
                  No user data for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
