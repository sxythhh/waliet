"use client";

import { useState, useMemo } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { SparklineStatCard } from "./SparklineStatCard";
import { PerformanceChart, MetricsData, MetricType } from "./PerformanceChart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Video, Users, Eye, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BrandHomeTabProps {
  workspaceSlug: string;
}

type TimeframeOption = "all_time" | "today" | "this_week" | "last_week" | "this_month" | "last_month";
type StatMetricType = "views" | "spent" | "creators" | "videos";

const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  all_time: "All time",
  today: "Today",
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month"
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const statToChartMetric: Record<StatMetricType, MetricType> = {
  views: "views",
  spent: "spent",
  creators: "creators",
  videos: "videos",
};

const chartTitles: Record<StatMetricType, string> = {
  views: "Performance Over Time",
  spent: "Spend Over Time",
  creators: "New Creators Over Time",
  videos: "Videos Over Time",
};

// Demo campaigns data
interface Campaign {
  id: string;
  title: string;
  status: "active" | "paused" | "draft" | "ended";
  budget: number;
  budgetUsed: number;
  creators: number;
  views: number;
}

export function BrandHomeTab({ workspaceSlug }: BrandHomeTabProps) {
  const [selectedMetric, setSelectedMetric] = useState<StatMetricType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>("all_time");

  // Empty state - no data yet
  const [campaigns] = useState<Campaign[]>([]);

  const stats = {
    totalViews: 0,
    totalSpent: 0,
    activeCreators: 0,
    totalVideos: 0,
  };

  // Generate empty metrics data for chart
  const metricsData = useMemo<MetricsData[]>(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
    return days.map(day => ({
      date: format(day, 'MMM d'),
      datetime: format(day, 'MMM d, yyyy'),
      views: 0,
      likes: 0,
      shares: 0,
      bookmarks: 0,
      videos: 0,
      dailyViews: 0,
      dailyLikes: 0,
      dailyShares: 0,
      dailyBookmarks: 0,
      dailyVideos: 0,
      spent: 0,
      creators: 0,
    }));
  }, []);

  // Sparkline data (last 14 entries)
  const sparklineData = {
    views: metricsData.map(d => d.views),
    spent: metricsData.map(d => d.spent || 0),
    creators: metricsData.map(d => d.creators || 0),
    videos: metricsData.map(d => d.videos),
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const chartMetric = selectedMetric ? statToChartMetric[selectedMetric] : "views";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="rounded-md bg-emerald-600 hover:bg-emerald-600 border-t border-t-emerald-400 gap-1 text-white tracking-[-0.5px]">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Active
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="secondary" className="rounded-md border-t border-t-border/80 tracking-[-0.5px]">Draft</Badge>
        );
      case "paused":
        return (
          <Badge variant="secondary" className="rounded-md border-t border-t-border/80 tracking-[-0.5px]">Paused</Badge>
        );
      case "ended":
        return (
          <Badge className="rounded-md bg-red-600 hover:bg-red-600 border-t border-t-red-400 text-white tracking-[-0.5px]">Ended</Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6 space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-[-0.5px] text-foreground">
          Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 tracking-[-0.5px] bg-muted/50 hover:bg-muted/50 hover:text-current px-3 border border-border dark:border-transparent">
                {TIMEFRAME_LABELS[timeframe]}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border">
              {(Object.keys(TIMEFRAME_LABELS) as TimeframeOption[]).map(option => (
                <DropdownMenuItem key={option} onClick={() => setTimeframe(option)}>
                  {TIMEFRAME_LABELS[option]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-2 h-8 text-white border-t border-t-primary/50 tracking-[-0.5px] rounded-[10px] bg-primary px-3 hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Campaign</span>
          </Button>
        </div>
      </div>

      {/* Stat Cards with Sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SparklineStatCard
          label="Views"
          value={formatNumber(stats.totalViews)}
          sparklineData={sparklineData.views}
          isSelected={selectedMetric === "views"}
          onClick={() => setSelectedMetric(selectedMetric === "views" ? null : "views")}
          color="#3b82f6"
        />
        <SparklineStatCard
          label="Spent"
          value={formatCurrency(stats.totalSpent)}
          sparklineData={sparklineData.spent}
          isSelected={selectedMetric === "spent"}
          onClick={() => setSelectedMetric(selectedMetric === "spent" ? null : "spent")}
          color="#22c55e"
        />
        <SparklineStatCard
          label="Creators"
          value={stats.activeCreators}
          sparklineData={sparklineData.creators}
          isSelected={selectedMetric === "creators"}
          onClick={() => setSelectedMetric(selectedMetric === "creators" ? null : "creators")}
          color="#ec4899"
        />
        <SparklineStatCard
          label="Videos"
          value={stats.totalVideos}
          sparklineData={sparklineData.videos}
          isSelected={selectedMetric === "videos"}
          onClick={() => setSelectedMetric(selectedMetric === "videos" ? null : "videos")}
          color="#a855f7"
        />
      </div>

      {/* Performance Chart */}
      <PerformanceChart
        metricsData={metricsData}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        defaultMetric={chartMetric}
        singleMetricMode={selectedMetric === "spent" || selectedMetric === "creators"}
        title={selectedMetric ? chartTitles[selectedMetric] : "Performance Over Time"}
      />

      {/* Campaigns Table */}
      <Card className="border border-border dark:border-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium tracking-[-0.5px]">Your Campaigns</h3>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            View All
          </Button>
        </div>

        {campaigns.length > 0 ? (
          <div className="divide-y divide-border">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium truncate tracking-[-0.3px]">{campaign.title}</h4>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {campaign.creators} creators
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatNumber(campaign.views)} views
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Budget Progress */}
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium tracking-[-0.3px]">
                      {formatCurrency(campaign.budget - campaign.budgetUsed)} left
                    </div>
                    <div className="w-24 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, (campaign.budgetUsed / campaign.budget) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Fund Campaign</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Video className="w-6 h-6 text-muted-foreground" />
            </div>
            <h4 className="text-sm font-medium mb-1 tracking-[-0.3px]">No campaigns yet</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Create your first campaign to start tracking performance
            </p>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Campaign
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
