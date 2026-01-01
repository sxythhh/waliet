import { useState } from "react";
import { subDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, DollarSign, Users, Briefcase, CreditCard } from "lucide-react";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { DateRangePicker } from "@/components/admin/analytics/DateRangePicker";
import { RevenueForecast } from "@/components/admin/analytics/RevenueForecast";
import { CreatorRankings } from "@/components/admin/analytics/CreatorRankings";
import { CampaignROI } from "@/components/admin/analytics/CampaignROI";
import { CohortAnalysis } from "@/components/admin/analytics/CohortAnalysis";
import { useAnalyticsDashboard } from "@/hooks/useAnalyticsDashboard";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color?: string;
}

function StatCard({ title, value, subtitle, icon, trend, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <p
                className={`text-xs mt-1 ${
                  trend.positive ? "text-green-500" : "text-red-500"
                }`}
              >
                {trend.positive ? "+" : ""}
                {trend.value.toFixed(1)}% vs last period
              </p>
            )}
          </div>
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: color ? `${color}10` : "hsl(var(--muted))" }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const analytics = useAnalyticsDashboard(dateRange);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (analytics.loading) {
    return (
      <AdminPermissionGuard requiredPermission="view_dashboard">
        <div className="flex flex-col h-full">
          <div className="border-b p-6">
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive insights and performance metrics
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </AdminPermissionGuard>
    );
  }

  return (
    <AdminPermissionGuard requiredPermission="view_dashboard">
      <div className="flex flex-col h-full">
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
              <p className="text-muted-foreground">
                Comprehensive insights and performance metrics
              </p>
            </div>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Revenue"
                value={formatCurrency(analytics.revenue.current)}
                icon={<DollarSign className="h-6 w-6 text-green-500" />}
                trend={{
                  value: analytics.revenue.change,
                  positive: analytics.revenue.change >= 0,
                }}
                color="#22c55e"
              />
              <StatCard
                title="Active Creators"
                value={analytics.creators.active.toLocaleString()}
                subtitle={`${analytics.creators.new} new this period`}
                icon={<Users className="h-6 w-6 text-blue-500" />}
                color="#3b82f6"
              />
              <StatCard
                title="Active Campaigns"
                value={analytics.campaigns.active}
                subtitle={`${analytics.campaigns.total} total`}
                icon={<Briefcase className="h-6 w-6 text-purple-500" />}
                color="#8b5cf6"
              />
              <StatCard
                title="Pending Payouts"
                value={formatCurrency(analytics.payouts.pending)}
                subtitle={`${formatCurrency(analytics.payouts.completed)} completed`}
                icon={<CreditCard className="h-6 w-6 text-amber-500" />}
                color="#f59e0b"
              />
            </div>

            {/* Revenue Chart & Creator Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <RevenueForecast data={analytics.revenue} />
              <CreatorRankings creators={analytics.creators.topPerformers} />
            </div>

            {/* Campaign ROI & Cohort Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CampaignROI campaigns={analytics.campaigns.topByROI} />
              <CohortAnalysis data={analytics.cohorts} />
            </div>
          </div>
        </div>
      </div>
    </AdminPermissionGuard>
  );
}
