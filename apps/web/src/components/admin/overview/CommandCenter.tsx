"use client";

import { MetricsGrid } from "./MetricsGrid";
import { InsightsMetricsGrid } from "./InsightsMetricsGrid";
import { QuickActions } from "./QuickActions";
import { SendAnnouncementDialog } from "../SendAnnouncementDialog";
import { FraudAnalyticsCard } from "../FraudAnalyticsCard";

export function CommandCenter() {
  return (
    <div className="w-full p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Primary Metrics Grid */}
        <MetricsGrid />

        {/* Platform Insights - Additional Metrics */}
        <InsightsMetricsGrid />

        {/* Quick Actions + Fraud Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickActions />
          <FraudAnalyticsCard />
        </div>
      </div>
    </div>
  );
}
