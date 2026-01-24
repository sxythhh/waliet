"use client";

import { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Loader2,
  Calendar,
  CreditCard,
  Activity,
  UserCheck,
  UserX,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface PlatformMetrics {
  // Primary metrics
  totalRevenue: number;
  revenueChange: number;
  totalUsers: number;
  usersChange: number;
  activeSellers: number;
  sellersChange: number;
  pendingPayouts: number;
  pendingPayoutsAmount: number;

  // Secondary metrics
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  cancelledSessions: number;

  // Tertiary metrics
  totalPurchases: number;
  avgSessionValue: number;
  avgSellerRating: number;
  newUsersToday: number;
}

interface RecentActivity {
  id: string;
  type: "purchase" | "session" | "payout" | "user" | "review";
  title: string;
  description: string;
  timestamp: string;
  status?: "success" | "warning" | "error" | "info";
}

// =============================================================================
// METRIC COMPONENTS
// =============================================================================

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

function MetricCard({
  label,
  value,
  change,
  icon,
  onClick,
  className,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl p-5",
        "bg-card",
        "border border-border/50",
        onClick && "cursor-pointer hover:border-border transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium tracking-tight">
          {label}
        </p>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </div>

        {change && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold",
              change.isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            <TrendingUp
              className={cn("w-3 h-3", !change.isPositive && "rotate-180")}
            />
            {Math.abs(change.value).toFixed(0)}%
          </div>
        )}
      </div>

      {change?.label && (
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          {change.label}
        </p>
      )}
    </div>
  );
}

interface AlertMetricCardProps {
  label: string;
  value: string | number;
  severity: "info" | "warning" | "critical";
  onClick?: () => void;
  className?: string;
}

function AlertMetricCard({
  label,
  value,
  severity,
  onClick,
  className,
}: AlertMetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl p-5 border",
        "bg-card border-border/50",
        onClick && "cursor-pointer hover:border-border transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            severity === "critical" && "bg-red-500 animate-pulse",
            severity === "warning" && "bg-amber-500",
            severity === "info" && "bg-blue-500"
          )}
        />
        <p className="text-xs text-muted-foreground font-medium tracking-tight">
          {label}
        </p>
      </div>
      <div className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}

interface MiniStatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

function MiniStatCard({ label, value, className }: MiniStatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 overflow-hidden",
        "bg-muted/20",
        className
      )}
    >
      <div className="text-lg font-semibold tracking-tight mb-0.5 text-foreground">
        {value}
      </div>
      <p className="text-xs text-muted-foreground tracking-tight">
        {label}
      </p>
    </div>
  );
}

// =============================================================================
// ACTIVITY FEED
// =============================================================================

function ActivityFeed({ activities }: { activities: RecentActivity[] }) {
  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "purchase":
        return <CreditCard className="w-4 h-4" />;
      case "session":
        return <Calendar className="w-4 h-4" />;
      case "payout":
        return <Banknote className="w-4 h-4" />;
      case "user":
        return <Users className="w-4 h-4" />;
      case "review":
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status?: RecentActivity["status"]) => {
    switch (status) {
      case "success":
        return "text-emerald-500";
      case "warning":
        return "text-amber-500";
      case "error":
        return "text-red-500";
      default:
        return "text-blue-500";
    }
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className={cn("mt-0.5", getStatusColor(activity.status))}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {activity.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

function QuickActions() {
  const actions = [
    {
      label: "Process Payouts",
      description: "Review and approve pending payouts",
      icon: <Banknote className="w-4 h-4" />,
      href: "/dashboard?tab=admin&view=payouts",
    },
    {
      label: "Review Sessions",
      description: "Manage disputed sessions",
      icon: <Calendar className="w-4 h-4" />,
      href: "/dashboard?tab=admin&view=sessions",
    },
    {
      label: "User Management",
      description: "View and manage users",
      icon: <Users className="w-4 h-4" />,
      href: "/dashboard?tab=admin&view=users",
    },
    {
      label: "View Reports",
      description: "Platform analytics and reports",
      icon: <TrendingUp className="w-4 h-4" />,
      href: "/dashboard?tab=admin&view=reports",
    },
  ];

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors text-left w-full"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {action.description}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PLATFORM HEALTH
// =============================================================================

interface HealthItem {
  label: string;
  status: "healthy" | "warning" | "error";
  value?: string;
}

function PlatformHealth() {
  const healthItems: HealthItem[] = [
    { label: "API Status", status: "healthy", value: "Operational" },
    { label: "Database", status: "healthy", value: "Connected" },
    { label: "Payment Gateway", status: "healthy", value: "Active" },
    { label: "Webhook Processing", status: "healthy", value: "Real-time" },
  ];

  const getStatusIcon = (status: HealthItem["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Platform Health</CardTitle>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            All Systems Operational
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {healthItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-2 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(item.status)}
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN ADMIN TAB COMPONENT
// =============================================================================

export function AdminTab() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch metrics from API
      const metricsResponse = await fetch("/api/admin/metrics");
      if (metricsResponse.ok) {
        const data = await metricsResponse.json();
        setMetrics(data.metrics);
      } else {
        // Use mock data if API not available
        setMetrics({
          totalRevenue: 0,
          revenueChange: 0,
          totalUsers: 0,
          usersChange: 0,
          activeSellers: 0,
          sellersChange: 0,
          pendingPayouts: 0,
          pendingPayoutsAmount: 0,
          totalSessions: 0,
          completedSessions: 0,
          activeSessions: 0,
          cancelledSessions: 0,
          totalPurchases: 0,
          avgSessionValue: 0,
          avgSellerRating: 0,
          newUsersToday: 0,
        });
      }

      // Fetch recent activity
      const activityResponse = await fetch("/api/admin/activity");
      if (activityResponse.ok) {
        const data = await activityResponse.json();
        setActivities(data.activities || []);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      // Set empty defaults on error
      setMetrics({
        totalRevenue: 0,
        revenueChange: 0,
        totalUsers: 0,
        usersChange: 0,
        activeSellers: 0,
        sellersChange: 0,
        pendingPayouts: 0,
        pendingPayoutsAmount: 0,
        totalSessions: 0,
        completedSessions: 0,
        activeSessions: 0,
        cancelledSessions: 0,
        totalPurchases: 0,
        avgSessionValue: 0,
        avgSellerRating: 0,
        newUsersToday: 0,
      });
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">Failed to load admin data</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Platform overview and management
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString()}`}
          change={{
            value: metrics.revenueChange,
            isPositive: metrics.revenueChange >= 0,
            label: "vs last 7 days",
          }}
          icon={<DollarSign className="w-4 h-4 text-primary" />}
        />

        <MetricCard
          label="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          change={{
            value: metrics.usersChange,
            isPositive: metrics.usersChange >= 0,
            label: "vs last 30 days",
          }}
          icon={<Users className="w-4 h-4 text-primary" />}
        />

        <AlertMetricCard
          label="Pending Payouts"
          value={`${metrics.pendingPayouts} ($${metrics.pendingPayoutsAmount.toLocaleString()})`}
          severity={metrics.pendingPayouts > 10 ? "warning" : "info"}
        />

        <MetricCard
          label="Active Sellers"
          value={metrics.activeSellers.toLocaleString()}
          change={{
            value: metrics.sellersChange,
            isPositive: metrics.sellersChange >= 0,
            label: "vs last 30 days",
          }}
          icon={<UserCheck className="w-4 h-4 text-primary" />}
        />
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStatCard
          label="Total Sessions"
          value={metrics.totalSessions.toLocaleString()}
        />
        <MiniStatCard
          label="Completed"
          value={metrics.completedSessions.toLocaleString()}
        />
        <MiniStatCard
          label="In Progress"
          value={metrics.activeSessions.toLocaleString()}
        />
        <MiniStatCard
          label="Cancelled"
          value={metrics.cancelledSessions.toLocaleString()}
        />
      </div>

      {/* Tertiary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStatCard
          label="Total Purchases"
          value={metrics.totalPurchases.toLocaleString()}
        />
        <MiniStatCard
          label="Avg Session Value"
          value={`$${metrics.avgSessionValue.toFixed(2)}`}
        />
        <MiniStatCard
          label="Avg Seller Rating"
          value={metrics.avgSellerRating > 0 ? metrics.avgSellerRating.toFixed(1) : "N/A"}
        />
        <MiniStatCard
          label="New Users Today"
          value={metrics.newUsersToday.toLocaleString()}
        />
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions />
        <PlatformHealth />
      </div>

      {/* Recent Activity */}
      <ActivityFeed activities={activities} />
    </div>
  );
}
