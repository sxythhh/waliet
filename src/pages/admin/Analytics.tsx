import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Users, DollarSign, TrendingUp, Wallet, ArrowUp, ArrowDown } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

interface AnalyticsData {
  totalUsers: number;
  newUsersLast30Days: number;
  totalPayouts: number;
  pendingPayouts: number;
  totalEarnings: number;
  userGrowth: number;
  payoutGrowth: number;
}

interface ChartData {
  date: string;
  users: number;
  payouts: number;
  earnings: number;
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    newUsersLast30Days: 0,
    totalPayouts: 0,
    pendingPayouts: 0,
    totalEarnings: 0,
    userGrowth: 0,
    payoutGrowth: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sixtyDaysAgo = subDays(new Date(), 60);

      // Fetch user data
      const { data: allUsers, error: usersError } = await supabase
        .from("profiles")
        .select("created_at");

      if (usersError) throw usersError;

      const totalUsers = allUsers?.length || 0;
      const newUsersLast30Days = allUsers?.filter(
        (u) => new Date(u.created_at) >= thirtyDaysAgo
      ).length || 0;
      const newUsersLast60Days = allUsers?.filter(
        (u) => new Date(u.created_at) >= sixtyDaysAgo && new Date(u.created_at) < thirtyDaysAgo
      ).length || 0;

      const userGrowth = newUsersLast60Days > 0
        ? ((newUsersLast30Days - newUsersLast60Days) / newUsersLast60Days) * 100
        : 0;

      // Fetch payout data
      const { data: payouts, error: payoutsError } = await supabase
        .from("payout_requests")
        .select("amount, status, requested_at");

      if (payoutsError) throw payoutsError;

      const completedPayouts = payouts?.filter((p) => p.status === "completed") || [];
      const totalPayouts = completedPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
      const pendingPayouts = payouts?.filter((p) => p.status === "pending").length || 0;

      const payoutsLast30Days = completedPayouts.filter(
        (p) => new Date(p.requested_at) >= thirtyDaysAgo
      ).reduce((sum, p) => sum + Number(p.amount), 0);
      const payoutsLast60Days = completedPayouts.filter(
        (p) => new Date(p.requested_at) >= sixtyDaysAgo && new Date(p.requested_at) < thirtyDaysAgo
      ).reduce((sum, p) => sum + Number(p.amount), 0);

      const payoutGrowth = payoutsLast60Days > 0
        ? ((payoutsLast30Days - payoutsLast60Days) / payoutsLast60Days) * 100
        : 0;

      // Fetch wallet data
      const { data: wallets, error: walletsError } = await supabase
        .from("wallets")
        .select("total_earned");

      if (walletsError) throw walletsError;

      const totalEarnings = wallets?.reduce((sum, w) => sum + Number(w.total_earned), 0) || 0;

      setAnalytics({
        totalUsers,
        newUsersLast30Days,
        totalPayouts,
        pendingPayouts,
        totalEarnings,
        userGrowth,
        payoutGrowth,
      });

      // Generate chart data for last 30 days
      const chartDataArray: ChartData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = startOfDay(subDays(new Date(), i));
        const dateStr = format(date, "MMM dd");
        const nextDate = startOfDay(subDays(new Date(), i - 1));

        const usersOnDay = allUsers?.filter((u) => {
          const createdAt = startOfDay(new Date(u.created_at));
          return createdAt >= date && createdAt < nextDate;
        }).length || 0;

        const payoutsOnDay = completedPayouts
          .filter((p) => {
            const requestedAt = startOfDay(new Date(p.requested_at));
            return requestedAt >= date && requestedAt < nextDate;
          })
          .reduce((sum, p) => sum + Number(p.amount), 0);

        chartDataArray.push({
          date: dateStr,
          users: usersOnDay,
          payouts: payoutsOnDay,
          earnings: payoutsOnDay, // For now, using same as payouts
        });
      }

      setChartData(chartDataArray);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch analytics data",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 px-[27px] py-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track platform performance and growth</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card className="bg-card border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <div className={`flex items-center gap-1 text-xs font-medium ${analytics.userGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {analytics.userGrowth >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(analytics.userGrowth).toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold font-chakra">{analytics.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-xs text-muted-foreground">+{analytics.newUsersLast30Days} this month</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Payouts */}
        <Card className="bg-card border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-success" />
              <div className={`flex items-center gap-1 text-xs font-medium ${analytics.payoutGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {analytics.payoutGrowth >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(analytics.payoutGrowth).toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold font-chakra">${analytics.totalPayouts.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Paid Out</p>
              <p className="text-xs text-muted-foreground">{analytics.pendingPayouts} pending</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card className="bg-card border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold font-chakra">${analytics.totalEarnings.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Balance */}
        <Card className="bg-card border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="h-5 w-5 text-warning" />
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold font-chakra">${(analytics.totalEarnings - analytics.totalPayouts).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Pending Balance</p>
              <p className="text-xs text-muted-foreground">Not yet paid out</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Signups Chart */}
        <Card className="bg-card border-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Signups (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#userGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payouts Chart */}
        <Card className="bg-card border-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              Payouts Over Time (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Bar 
                  dataKey="payouts" 
                  fill="hsl(var(--success))" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Combined Growth Chart */}
      <Card className="bg-card border-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Platform Growth Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="users"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                name="New Users"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="payouts"
                stroke="hsl(var(--success))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--success))", r: 4 }}
                name="Payouts ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
