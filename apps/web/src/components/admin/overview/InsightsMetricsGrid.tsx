"use client";

import { useInsightsMetrics } from "@/hooks/useInsightsMetrics";
import { AdminCard, AdminMiniStatCard } from "../design-system/AdminCard";
import { AdminMetric } from "../design-system/AdminMetric";
import { PageLoading } from "@/components/ui/loading-bar";
import { cn } from "@/lib/utils";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  if (num >= 1000000) {
    return "$" + (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return "$" + (num / 1000).toFixed(1) + "K";
  }
  return "$" + num.toFixed(2);
}

// Progress bar component for distributions
function ProgressBar({
  value,
  max,
  color = "bg-foreground",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

// Stat row component for compact display
function StatRow({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground font-inter">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold font-inter text-foreground">{value}</span>
        {subValue && (
          <span className="text-[10px] text-muted-foreground ml-1">({subValue})</span>
        )}
      </div>
    </div>
  );
}

// Distribution bar component
function DistributionBar({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={cn("h-full transition-all duration-500", item.color)}
            style={{ width: `${(item.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-[10px]">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", item.color)} />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsMetricsGrid() {
  const { metrics, loading, error } = useInsightsMetrics();

  if (loading) {
    return <PageLoading />;
  }

  if (error || !metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Failed to load insights metrics
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-foreground rounded-full" />
        <h2 className="text-sm font-semibold font-inter tracking-[-0.3px] text-foreground">
          Platform Insights
        </h2>
      </div>

      {/* Weekly Trends - Primary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetric
          label="Earnings This Week"
          value={formatCurrency(metrics.weeklyTrends.earningsThisWeek)}
          change={{
            value: metrics.weeklyTrends.earningsChange,
            isPositive: metrics.weeklyTrends.earningsChange >= 0,
            label: "vs last week",
          }}
        />

        <AdminMetric
          label="Signups This Week"
          value={metrics.weeklyTrends.signupsThisWeek.toLocaleString()}
          change={{
            value: metrics.weeklyTrends.signupsChange,
            isPositive: metrics.weeklyTrends.signupsChange >= 0,
            label: "vs last week",
          }}
        />

        <AdminMetric
          label="Approval Rate"
          value={`${metrics.submissionQuality.approvalRate.toFixed(1)}%`}
          change={{
            value: metrics.submissionQuality.approvalRate,
            isPositive: metrics.submissionQuality.approvalRate >= 70,
            label: `${metrics.submissionQuality.approved}/${metrics.submissionQuality.totalSubmissions}`,
          }}
        />

        <AdminMetric
          label="Creator Retention"
          value={`${metrics.retention.retentionRate.toFixed(1)}%`}
          change={{
            value: metrics.retention.active,
            isPositive: metrics.retention.retentionRate >= 50,
            label: `${metrics.retention.active} active`,
          }}
        />
      </div>

      {/* Two Column Layout for Detailed Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Creator Retention Distribution */}
        <AdminCard title="Creator Retention" subtitle="Activity in last 60 days">
          <div className="space-y-4">
            <DistributionBar
              items={[
                { label: "Active", value: metrics.retention.active, color: "bg-emerald-500" },
                { label: "At Risk", value: metrics.retention.atRisk, color: "bg-amber-500" },
                { label: "Dormant", value: metrics.retention.dormant, color: "bg-orange-500" },
                { label: "Churned", value: metrics.retention.churned, color: "bg-muted-foreground/30" },
              ]}
            />
            <div className="grid grid-cols-4 gap-2 pt-2">
              <div className="text-center">
                <div className="text-lg font-semibold text-emerald-500">{metrics.retention.active}</div>
                <div className="text-[10px] text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-amber-500">{metrics.retention.atRisk}</div>
                <div className="text-[10px] text-muted-foreground">At Risk</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-500">{metrics.retention.dormant}</div>
                <div className="text-[10px] text-muted-foreground">Dormant</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-muted-foreground">{metrics.retention.churned}</div>
                <div className="text-[10px] text-muted-foreground">Churned</div>
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Platform Breakdown */}
        <AdminCard title="Platform Distribution" subtitle="Submissions by platform (30d)">
          <div className="space-y-4">
            <DistributionBar
              items={[
                { label: "TikTok", value: metrics.platformBreakdown.tiktok, color: "bg-pink-500" },
                { label: "Instagram", value: metrics.platformBreakdown.instagram, color: "bg-purple-500" },
                { label: "YouTube", value: metrics.platformBreakdown.youtube, color: "bg-red-500" },
                { label: "X", value: metrics.platformBreakdown.x, color: "bg-foreground" },
              ]}
            />
            <div className="grid grid-cols-4 gap-2 pt-2">
              <div className="text-center">
                <div className="text-lg font-semibold text-pink-500">{metrics.platformBreakdown.tiktok}</div>
                <div className="text-[10px] text-muted-foreground">TikTok</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-500">{metrics.platformBreakdown.instagram}</div>
                <div className="text-[10px] text-muted-foreground">Instagram</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-500">{metrics.platformBreakdown.youtube}</div>
                <div className="text-[10px] text-muted-foreground">YouTube</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-foreground">{metrics.platformBreakdown.x}</div>
                <div className="text-[10px] text-muted-foreground">X</div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Video & Submission Performance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <AdminMiniStatCard
          label="Total Views"
          value={formatNumber(metrics.videoPerformance.totalViews)}
        />
        <AdminMiniStatCard
          label="Total Videos"
          value={formatNumber(metrics.videoPerformance.totalVideos)}
        />
        <AdminMiniStatCard
          label="Avg Views/Video"
          value={formatNumber(Math.round(metrics.videoPerformance.avgViewsPerVideo))}
        />
        <AdminMiniStatCard
          label="Engagement Rate"
          value={`${metrics.videoPerformance.avgEngagementRate.toFixed(2)}%`}
        />
        <AdminMiniStatCard
          label="Approved"
          value={metrics.submissionQuality.approved.toLocaleString()}
        />
        <AdminMiniStatCard
          label="Pending"
          value={metrics.submissionQuality.pending.toLocaleString()}
        />
        <AdminMiniStatCard
          label="Rejected"
          value={metrics.submissionQuality.rejected.toLocaleString()}
        />
        <AdminMiniStatCard
          label="Total Submissions"
          value={metrics.submissionQuality.totalSubmissions.toLocaleString()}
        />
      </div>

      {/* Three Column Layout for Secondary Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Payout Efficiency */}
        <AdminCard title="Payout Efficiency" subtitle="Processing performance">
          <div className="space-y-1">
            <StatRow
              label="Avg Processing Time"
              value={`${metrics.payoutEfficiency.avgProcessingDays.toFixed(1)} days`}
            />
            <StatRow
              label="Fastest"
              value={`${metrics.payoutEfficiency.fastestProcessing} days`}
            />
            <StatRow
              label="Slowest"
              value={`${metrics.payoutEfficiency.slowestProcessing} days`}
            />
            <StatRow
              label="Completed This Week"
              value={metrics.payoutEfficiency.completedThisWeek}
              subValue={`${metrics.payoutEfficiency.weekOverWeekChange >= 0 ? "+" : ""}${metrics.payoutEfficiency.weekOverWeekChange.toFixed(0)}%`}
            />
          </div>
        </AdminCard>

        {/* Social Account Coverage */}
        <AdminCard title="Social Coverage" subtitle="Creator account linking">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-foreground">
                {metrics.socialCoverage.coverageRate.toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {metrics.socialCoverage.creatorsWithAccounts}/{metrics.socialCoverage.totalCreators}
              </span>
            </div>
            <ProgressBar
              value={metrics.socialCoverage.creatorsWithAccounts}
              max={metrics.socialCoverage.totalCreators}
            />
            <StatRow
              label="Avg Accounts/Creator"
              value={metrics.socialCoverage.avgAccountsPerCreator.toFixed(1)}
            />
          </div>
        </AdminCard>

        {/* Trust Score Distribution */}
        <AdminCard title="Trust Scores" subtitle="Creator reliability distribution">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-foreground">
                {metrics.trustDistribution.avgScore.toFixed(0)}
              </span>
              <span className="text-xs text-muted-foreground">avg score</span>
            </div>
            <DistributionBar
              items={[
                { label: "Excellent", value: metrics.trustDistribution.excellent, color: "bg-emerald-500" },
                { label: "Good", value: metrics.trustDistribution.good, color: "bg-blue-500" },
                { label: "Fair", value: metrics.trustDistribution.fair, color: "bg-amber-500" },
                { label: "Poor", value: metrics.trustDistribution.poor, color: "bg-red-500" },
              ]}
            />
          </div>
        </AdminCard>
      </div>

      {/* Bounty, Referral, and Budget Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Bounty Campaign Stats */}
        <AdminCard title="Bounty Programs" subtitle="Creator partnerships">
          <div className="space-y-1">
            <StatRow
              label="Active Programs"
              value={metrics.bountyStats.activeBounties}
              subValue={`${metrics.bountyStats.totalBounties} total`}
            />
            <StatRow
              label="Applications"
              value={metrics.bountyStats.totalApplications}
            />
            <StatRow
              label="Accepted"
              value={metrics.bountyStats.acceptedApplications}
              subValue={`${metrics.bountyStats.acceptanceRate.toFixed(0)}%`}
            />
            <StatRow
              label="Waitlisted"
              value={metrics.bountyStats.waitlistedApplications}
            />
          </div>
        </AdminCard>

        {/* Referral Program */}
        <AdminCard title="Referral Program" subtitle="Growth metrics">
          <div className="space-y-1">
            <StatRow
              label="Total Referrals"
              value={metrics.referralStats.totalReferrals}
            />
            <StatRow
              label="Completed"
              value={metrics.referralStats.completedReferrals}
              subValue={`${metrics.referralStats.conversionRate.toFixed(0)}%`}
            />
            <StatRow
              label="Pending"
              value={metrics.referralStats.pendingReferrals}
            />
            <StatRow
              label="Rewards Paid"
              value={formatCurrency(metrics.referralStats.totalRewardsEarned)}
            />
          </div>
        </AdminCard>

        {/* Budget Health */}
        <AdminCard title="Campaign Budgets" subtitle="Utilization overview">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-foreground">
                {metrics.budgetHealth.utilizationRate.toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground">utilized</span>
            </div>
            <ProgressBar
              value={metrics.budgetHealth.totalSpent}
              max={metrics.budgetHealth.totalBudget}
            />
            <div className="grid grid-cols-2 gap-2 text-center pt-2">
              <div>
                <div className="text-lg font-semibold text-amber-500">
                  {metrics.budgetHealth.campaignsNearBudget}
                </div>
                <div className="text-[10px] text-muted-foreground">Near Budget</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-muted-foreground">
                  {metrics.budgetHealth.campaignsUnderutilized}
                </div>
                <div className="text-[10px] text-muted-foreground">Underutilized</div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
