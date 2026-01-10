import { useState, useCallback } from "react";
import { subDays } from "date-fns";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { AdminMetric } from "@/components/admin/design-system/AdminMetric";
import { PageLoading } from "@/components/ui/loading-bar";
import { RevenueForecast } from "@/components/admin/analytics/RevenueForecast";
import { CreatorRankings } from "@/components/admin/analytics/CreatorRankings";
import { CampaignROI } from "@/components/admin/analytics/CampaignROI";
import { CohortAnalysis } from "@/components/admin/analytics/CohortAnalysis";
import { useAnalyticsDashboard } from "@/hooks/useAnalyticsDashboard";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const handleDateRangeChange = useCallback((range: { from: Date; to: Date }) => {
    setDateRange(range);
  }, []);

  const analytics = useAnalyticsDashboard(dateRange);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <AdminPermissionGuard resource="dashboard">
      <div className="flex flex-col">
        {/* Content */}
        {analytics.loading ? (
          <PageLoading text="Loading analytics..." />
        ) : (
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* Virality Data Charts - with unified date picker */}
              <AnalyticsTab onDateRangeChange={handleDateRangeChange} />

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AdminMetric
                  label="Total Revenue"
                  value={formatCurrency(analytics.revenue.current)}
                  change={{
                    value: analytics.revenue.change,
                    isPositive: analytics.revenue.change >= 0,
                  }}
                />
                <AdminMetric
                  label="Active Creators"
                  value={analytics.creators.active.toLocaleString()}
                  change={{
                    value: 0,
                    isPositive: true,
                    label: `${analytics.creators.new} new this period`,
                  }}
                />
                <AdminMetric
                  label="Active Campaigns"
                  value={analytics.campaigns.active.toString()}
                  change={{
                    value: 0,
                    isPositive: true,
                    label: `${analytics.campaigns.total} total`,
                  }}
                />
                <AdminMetric
                  label="Pending Payouts"
                  value={formatCurrency(analytics.payouts.pending)}
                  change={{
                    value: 0,
                    isPositive: true,
                    label: `${formatCurrency(analytics.payouts.completed)} completed`,
                  }}
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
        )}
      </div>
    </AdminPermissionGuard>
  );
}
