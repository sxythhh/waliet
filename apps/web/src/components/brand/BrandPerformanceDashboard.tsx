import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachHourOfInterval, differenceInDays, setHours, setMinutes, setSeconds, setMilliseconds, getHours } from "date-fns";
import { PerformanceChart, MetricsData, MetricType } from "./PerformanceChart";
import { SparklineStatCard } from "./SparklineStatCard";
import { ProgramsDataTable } from "./ProgramsDataTable";
import { TimeframeOption } from "@/components/dashboard/BrandCampaignDetailView";
import { toast } from "sonner";

interface BrandPerformanceDashboardProps {
  brandId: string;
  timeframe?: TimeframeOption;
}

// Metric type for stat cards (subset that makes sense for cards)
type StatMetricType = "views" | "spent" | "creators" | "videos";

// Convert timeframe option to date range
function getDateRangeFromTimeframe(timeframe: TimeframeOption): { from: Date; to: Date } {
  const now = new Date();
  const to = endOfDay(now);

  switch (timeframe) {
    case "today":
      return { from: startOfDay(now), to };
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to };
    case "last_week": {
      const lastWeekStart = subDays(startOfWeek(now, { weekStartsOn: 1 }), 7);
      return { from: lastWeekStart, to: endOfWeek(lastWeekStart, { weekStartsOn: 1 }) };
    }
    case "this_month":
      return { from: startOfMonth(now), to };
    case "last_month": {
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      return { from: lastMonthStart, to: endOfMonth(lastMonthStart) };
    }
    case "all_time":
    default:
      return { from: subMonths(now, 12), to };
  }
}

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

// Map stat metric to chart metric - now supports all metrics including spent/creators
const statToChartMetric: Record<StatMetricType, MetricType> = {
  views: "views",
  spent: "spent",
  creators: "creators",
  videos: "videos",
};

// Chart titles for each metric
const chartTitles: Record<StatMetricType, string> = {
  views: "Performance Over Time",
  spent: "Spend Over Time",
  creators: "New Creators Over Time",
  videos: "Videos Over Time",
};

export function BrandPerformanceDashboard({ brandId, timeframe = "all_time" }: BrandPerformanceDashboardProps) {
  const queryClient = useQueryClient();
  const [selectedMetric, setSelectedMetric] = useState<StatMetricType>("views");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { from: startDate, to: endDate } = useMemo(
    () => getDateRangeFromTimeframe(timeframe),
    [timeframe]
  );

  // Fetch all analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["brand-analytics", brandId, timeframe],
    queryFn: async () => {
      // Get campaign and boost IDs
      const [campaignsRes, boostsRes] = await Promise.all([
        supabase.from("campaigns").select("id, title, slug, status").eq("brand_id", brandId),
        supabase.from("bounty_campaigns").select("id, title, slug, status").eq("brand_id", brandId),
      ]);

      const campaigns = campaignsRes.data || [];
      const boosts = boostsRes.data || [];
      const campaignIds = campaigns.map((c) => c.id);
      const boostIds = boosts.map((b) => b.id);

      if (campaignIds.length === 0 && boostIds.length === 0) {
        return {
          stats: { totalViews: 0, totalSpent: 0, activeCreators: 0, totalVideos: 0 },
          metricsData: [],
          sparklineData: { views: [], spent: [], creators: [], videos: [] },
          campaigns: [],
          boosts: [],
        };
      }

      // Fetch cached campaign videos
      const { data: cachedVideos } = await supabase
        .from("cached_campaign_videos")
        .select("id, views, likes, shares, bookmarks, user_id, campaign_id, created_at")
        .eq("brand_id", brandId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch campaign submissions for accurate creator count
      const { data: campaignSubmissions } = campaignIds.length > 0
        ? await supabase
            .from("campaign_submissions")
            .select("creator_id, campaign_id, submitted_at")
            .in("campaign_id", campaignIds)
            .gte("submitted_at", startDate.toISOString())
            .lte("submitted_at", endDate.toISOString())
        : { data: [] };

      // Fetch campaign participants for publicly joinable campaigns
      const { data: campaignParticipants } = campaignIds.length > 0
        ? await supabase
            .from("campaign_participants")
            .select("user_id, campaign_id, joined_at")
            .in("campaign_id", campaignIds)
            .gte("joined_at", startDate.toISOString())
            .lte("joined_at", endDate.toISOString())
        : { data: [] };

      // Fetch bounty applications for accurate creator count
      const { data: bountyApplications } = boostIds.length > 0
        ? await supabase
            .from("bounty_applications")
            .select("user_id, bounty_campaign_id, created_at")
            .in("bounty_campaign_id", boostIds)
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString())
        : { data: [] };

      // Fetch wallet transactions for payouts
      const transactionPromises = [];
      for (const campaignId of campaignIds) {
        transactionPromises.push(
          supabase
            .from("wallet_transactions")
            .select("amount, created_at, user_id")
            .eq("type", "earning")
            .eq("metadata->>campaign_id", campaignId)
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString())
        );
      }
      for (const boostId of boostIds) {
        transactionPromises.push(
          supabase
            .from("wallet_transactions")
            .select("amount, created_at, user_id")
            .eq("type", "earning")
            .eq("metadata->>boost_id", boostId)
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString())
        );
      }

      const transactionResults = await Promise.all(transactionPromises);
      const allTransactions = transactionResults.flatMap((r) => r.data || []);

      // Calculate stats
      const videos = cachedVideos || [];
      const submissions = campaignSubmissions || [];
      const participants = campaignParticipants || [];
      const applications = bountyApplications || [];
      const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
      const totalSpent = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      // Count unique creators from participants, submissions and applications (not just videos)
      const uniqueCreators = new Set([
        ...participants.map((p) => p.user_id).filter(Boolean),
        ...submissions.map((s) => s.creator_id).filter(Boolean),
        ...applications.map((a) => a.user_id).filter(Boolean),
      ]);
      const activeCreators = uniqueCreators.size;
      const totalVideos = videos.length;

      // Build metrics by date for chart - smart aggregation based on timeframe
      const metricsByDate = new Map<string, MetricsData>();
      const daysDiff = differenceInDays(endDate, startDate);

      // Determine aggregation level based on date range
      // - today (0-1 days): 3-hour intervals
      // - 2-14 days: daily
      // - 15-60 days: weekly
      // - 60+ days: monthly
      type AggregationLevel = 'hourly' | 'daily' | 'weekly' | 'monthly';
      const isToday = timeframe === 'today';
      const aggregationLevel: AggregationLevel = isToday
        ? 'hourly'
        : daysDiff <= 14
        ? 'daily'
        : daysDiff <= 60
        ? 'weekly'
        : 'monthly';

      // Generate intervals based on aggregation level
      let intervals: Date[];
      if (aggregationLevel === 'hourly') {
        // Generate 3-hour intervals from 00:00 to current time
        const todayStart = startOfDay(new Date());
        const now = new Date();
        const allHours = eachHourOfInterval({ start: todayStart, end: now });
        // Filter to only 3-hour intervals (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00)
        intervals = allHours.filter((h) => getHours(h) % 3 === 0);
        // Always include the last completed 3-hour slot
        if (intervals.length === 0 || getHours(intervals[intervals.length - 1]) < Math.floor(getHours(now) / 3) * 3) {
          const lastSlotHour = Math.floor(getHours(now) / 3) * 3;
          const lastSlot = setMilliseconds(setSeconds(setMinutes(setHours(todayStart, lastSlotHour), 0), 0), 0);
          if (!intervals.some((i) => getHours(i) === lastSlotHour)) {
            intervals.push(lastSlot);
          }
        }
      } else if (aggregationLevel === 'daily') {
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
      } else if (aggregationLevel === 'weekly') {
        intervals = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
      } else {
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
      }

      // Initialize all intervals
      intervals.forEach((interval) => {
        let dateKey: string;
        let dateLabel: string;
        let datetimeLabel: string;

        if (aggregationLevel === 'hourly') {
          const hour = getHours(interval);
          dateKey = format(interval, "yyyy-MM-dd-HH");
          dateLabel = format(interval, "HH:mm");
          datetimeLabel = format(interval, "MMM d, HH:mm");
        } else if (aggregationLevel === 'daily') {
          dateKey = format(interval, "yyyy-MM-dd");
          dateLabel = format(interval, "MMM d");
          datetimeLabel = format(interval, "MMM d, yyyy");
        } else if (aggregationLevel === 'weekly') {
          dateKey = format(interval, "yyyy-'W'ww");
          dateLabel = `Week of ${format(interval, "MMM d")}`;
          datetimeLabel = `Week of ${format(interval, "MMM d, yyyy")}`;
        } else {
          dateKey = format(interval, "yyyy-MM");
          dateLabel = format(interval, "MMM yyyy");
          datetimeLabel = format(interval, "MMMM yyyy");
        }

        metricsByDate.set(dateKey, {
          date: dateLabel,
          datetime: datetimeLabel,
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
        });
      });

      // Helper to get the bucket key for a date
      const getDateKey = (date: Date): string => {
        if (aggregationLevel === 'hourly') {
          // Round down to nearest 3-hour slot
          const hour = Math.floor(getHours(date) / 3) * 3;
          const bucketDate = setMilliseconds(setSeconds(setMinutes(setHours(date, hour), 0), 0), 0);
          return format(bucketDate, "yyyy-MM-dd-HH");
        } else if (aggregationLevel === 'daily') {
          return format(date, "yyyy-MM-dd");
        } else if (aggregationLevel === 'weekly') {
          return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-'W'ww");
        } else {
          return format(startOfMonth(date), "yyyy-MM");
        }
      };

      // Aggregate video data
      videos.forEach((video) => {
        const dateKey = getDateKey(new Date(video.created_at));
        const existing = metricsByDate.get(dateKey);
        if (existing) {
          existing.views += video.views || 0;
          existing.likes += video.likes || 0;
          existing.shares += video.shares || 0;
          existing.bookmarks += video.bookmarks || 0;
          existing.videos += 1;
          existing.dailyViews = existing.views;
          existing.dailyLikes = existing.likes;
          existing.dailyShares = existing.shares;
          existing.dailyBookmarks = existing.bookmarks;
          existing.dailyVideos = existing.videos;
        }
      });

      // Add creators data to the chart
      const creatorsByDate = new Map<string, Set<string>>();

      // Track creators from submissions
      submissions.forEach((s) => {
        const dateKey = getDateKey(new Date(s.submitted_at || new Date()));
        if (!creatorsByDate.has(dateKey)) {
          creatorsByDate.set(dateKey, new Set());
        }
        if (s.creator_id) {
          creatorsByDate.get(dateKey)!.add(s.creator_id);
        }
      });

      // Track creators from campaign participants
      participants.forEach((p) => {
        const dateKey = getDateKey(new Date(p.joined_at || new Date()));
        if (!creatorsByDate.has(dateKey)) {
          creatorsByDate.set(dateKey, new Set());
        }
        if (p.user_id) {
          creatorsByDate.get(dateKey)!.add(p.user_id);
        }
      });

      // Track creators from applications
      applications.forEach((a) => {
        const dateKey = getDateKey(new Date(a.created_at));
        if (!creatorsByDate.has(dateKey)) {
          creatorsByDate.set(dateKey, new Set());
        }
        if (a.user_id) {
          creatorsByDate.get(dateKey)!.add(a.user_id);
        }
      });

      // Track spent by date
      const spentByDate = new Map<string, number>();
      allTransactions.forEach((t) => {
        const dateKey = getDateKey(new Date(t.created_at));
        spentByDate.set(dateKey, (spentByDate.get(dateKey) || 0) + (t.amount || 0));
      });

      // Add spent and creators to metrics data
      metricsByDate.forEach((metrics, dateKey) => {
        metrics.spent = spentByDate.get(dateKey) || 0;
        metrics.creators = creatorsByDate.get(dateKey)?.size || 0;
      });

      const sortedMetrics = Array.from(metricsByDate.values());

      // Build sparkline data (last 14 entries for compact view)
      const last14Entries = sortedMetrics.slice(-14);
      const sparklineData = {
        views: last14Entries.map((d) => d.views),
        spent: last14Entries.map((d) => d.spent || 0),
        creators: last14Entries.map((d) => d.creators || 0),
        videos: last14Entries.map((d) => d.videos),
      };

      // Calculate per-campaign/boost stats
      const campaignStats = await Promise.all(
        campaigns.map(async (c) => {
          const campaignVideos = videos.filter((v) => v.campaign_id === c.id);
          const views = campaignVideos.reduce((sum, v) => sum + (v.views || 0), 0);

          // Count creators from submissions and participants, not just videos
          const campaignSubs = submissions.filter((s) => s.campaign_id === c.id);
          const campaignParts = participants.filter((p) => p.campaign_id === c.id);
          const creators = new Set([
            ...campaignSubs.map((s) => s.creator_id).filter(Boolean),
            ...campaignParts.map((p) => p.user_id).filter(Boolean),
          ]).size;

          // Get spent for this campaign
          const { data: txData } = await supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("type", "earning")
            .eq("metadata->>campaign_id", c.id);
          const spent = (txData || []).reduce((sum, t) => sum + (t.amount || 0), 0);
          const cpm = views > 0 ? (spent / views) * 1000 : 0;

          return {
            id: c.id,
            title: c.title,
            slug: c.slug,
            status: c.status || "active",
            views,
            spent,
            creators,
            cpm,
            type: "campaign" as const,
          };
        })
      );

      const boostStats = await Promise.all(
        boosts.map(async (b) => {
          // Count creators from already fetched applications
          const boostApps = applications.filter((a) => a.bounty_campaign_id === b.id);
          const creators = new Set(boostApps.map((a) => a.user_id).filter(Boolean)).size;

          // Get spent for this boost
          const { data: txData } = await supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("type", "earning")
            .eq("metadata->>boost_id", b.id);
          const spent = (txData || []).reduce((sum, t) => sum + (t.amount || 0), 0);

          return {
            id: b.id,
            title: b.title,
            slug: b.slug,
            status: b.status || "active",
            views: 0, // Boosts don't track views the same way
            spent,
            creators,
            cpm: 0,
            type: "boost" as const,
          };
        })
      );

      return {
        stats: { totalViews, totalSpent, activeCreators, totalVideos },
        metricsData: sortedMetrics,
        sparklineData,
        campaigns: campaignStats,
        boosts: boostStats,
      };
    },
  });

  // Toggle program status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      id,
      type,
      isActive,
    }: {
      id: string;
      type: "campaign" | "boost";
      isActive: boolean;
    }) => {
      const newStatus = isActive ? "active" : "paused";
      if (type === "campaign") {
        const { error } = await supabase.from("campaigns").update({ status: newStatus }).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bounty_campaigns").update({ status: newStatus }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-analytics", brandId] });
      toast.success("Program status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update status", { description: error.message });
    },
  });

  const handleToggleStatus = (id: string, type: "campaign" | "boost", isActive: boolean) => {
    toggleStatusMutation.mutate({ id, type, isActive });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["brand-analytics", brandId] });
    setIsRefreshing(false);
  };

  const stats = analyticsData?.stats || { totalViews: 0, totalSpent: 0, activeCreators: 0, totalVideos: 0 };
  const metricsData = analyticsData?.metricsData || [];
  const sparklineData = analyticsData?.sparklineData || { views: [], spent: [], creators: [], videos: [] };
  const campaigns = analyticsData?.campaigns || [];
  const boosts = analyticsData?.boosts || [];

  // Get chart metric based on selected stat card
  const chartMetric = statToChartMetric[selectedMetric];

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6 space-y-6">
      {/* Stat Cards with Sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SparklineStatCard
          label="Views"
          value={formatNumber(stats.totalViews)}
          sparklineData={sparklineData.views}
          isSelected={selectedMetric === "views"}
          onClick={() => setSelectedMetric("views")}
          color="#3b82f6"
        />
        <SparklineStatCard
          label="Spent"
          value={formatCurrency(stats.totalSpent)}
          sparklineData={sparklineData.spent}
          isSelected={selectedMetric === "spent"}
          onClick={() => setSelectedMetric("spent")}
          color="#22c55e"
        />
        <SparklineStatCard
          label="Creators"
          value={stats.activeCreators}
          sparklineData={sparklineData.creators}
          isSelected={selectedMetric === "creators"}
          onClick={() => setSelectedMetric("creators")}
          color="#ec4899"
        />
        <SparklineStatCard
          label="Videos"
          value={stats.totalVideos}
          sparklineData={sparklineData.videos}
          isSelected={selectedMetric === "videos"}
          onClick={() => setSelectedMetric("videos")}
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
        title={chartTitles[selectedMetric]}
      />

      {/* Programs Data Table */}
      <ProgramsDataTable
        campaigns={campaigns}
        boosts={boosts}
        onToggleStatus={handleToggleStatus}
        isToggling={toggleStatusMutation.isPending}
      />
    </div>
  );
}
