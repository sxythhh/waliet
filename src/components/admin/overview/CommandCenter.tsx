"use client";

import { MetricsGrid } from "./MetricsGrid";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { QuickActions } from "./QuickActions";
import { SendAnnouncementDialog } from "../SendAnnouncementDialog";
import { FraudAnalyticsCard } from "../FraudAnalyticsCard";
import { PostHogAnalytics } from "./PostHogAnalytics";

export function CommandCenter() {
  return (
    <div className="w-full p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold font-inter tracking-[-0.5px] text-foreground">
              Overview
            </h1>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
              Platform metrics and activity
            </p>
          </div>
          <SendAnnouncementDialog />
        </div>

        {/* Metrics Grid */}
        <MetricsGrid />

        {/* PostHog Site Analytics */}
        <PostHogAnalytics />

        {/* Two column layout for activity and quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Activity Feed - takes 2 columns */}
          <div className="lg:col-span-2">
            <LiveActivityFeed />
          </div>

          {/* Quick Actions + Fraud Analytics */}
          <div className="space-y-6">
            <QuickActions />
            <FraudAnalyticsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
