"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { StatsOverview } from "./analytics/StatsOverview";
import { RevenueChart } from "./analytics/RevenueChart";
import { TopBuyersCard } from "./analytics/TopBuyersCard";
import { RetentionMetricsCard } from "./analytics/RetentionMetricsCard";
import { CohortChart } from "./analytics/CohortChart";
import { BuyerInsightsTable } from "./analytics/BuyerInsightsTable";
import { ChurnAlerts } from "./analytics/ChurnAlerts";
import { PeakTimesHeatmap } from "./analytics/PeakTimesHeatmap";
import { ExportButton } from "./ExportButton";

interface SellerAnalyticsTabProps {
  experienceId: string;
}

interface RevenueData {
  totalRevenue: number;
  periodComparison: {
    current: number;
    previous: number;
    changePercent: number;
  };
  chartData: { date: string; revenue: number; purchases: number; sessions: number }[];
}

interface RetentionData {
  repeatBuyerRate: number;
  averageRepurchaseTimeDays: number | null;
  buyerChurnRate: number;
  sessionCompletionRate: number;
  rebookingRate: number;
  cohorts: { month: string; totalBuyers: number; stillActive: number; retention: number }[];
  buyerLifetimeValue: { average: number; median: number; top10Percent: number };
}

interface TopBuyer {
  buyerId: string;
  buyerName: string | null;
  buyerAvatar: string | null;
  totalSpent: number;
  totalSessions: number;
  lastPurchaseAt: string;
}

interface BuyerInsight {
  buyerId: string;
  buyerName: string | null;
  buyerAvatar: string | null;
  firstPurchaseAt: string;
  lastPurchaseAt: string;
  totalPurchases: number;
  totalSpent: number;
  totalSessions: number;
  completedSessions: number;
  lifetimeValue: number;
  churnRisk: "low" | "medium" | "high" | null;
}

interface PeakTimeData {
  peakHours: { hour: number; count: number }[];
  peakDays: { day: number; count: number }[];
  heatmap: { day: number; hour: number; count: number }[];
}

export function SellerAnalyticsTab({ experienceId }: SellerAnalyticsTabProps) {
  const [activeTab, setActiveTab] = useState("revenue");
  const [isLoading, setIsLoading] = useState(true);

  // Revenue data
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([]);
  const [peakTimes, setPeakTimes] = useState<PeakTimeData | null>(null);

  // Retention data
  const [retention, setRetention] = useState<RetentionData | null>(null);

  // Buyers data
  const [buyers, setBuyers] = useState<BuyerInsight[]>([]);
  const [buyersCursor, setBuyersCursor] = useState<string | null>(null);
  const [hasMoreBuyers, setHasMoreBuyers] = useState(false);

  // Fetch revenue data
  const fetchRevenueData = async (period: "daily" | "weekly" | "monthly" = "daily") => {
    try {
      const [revenueRes, topBuyersRes, peakTimesRes] = await Promise.all([
        fetch(`/api/sellers/analytics/revenue?period=${period}&days=30`),
        fetch("/api/sellers/analytics/top-buyers?limit=5"),
        fetch("/api/sellers/analytics/peak-times"),
      ]);

      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenue(data);
      }

      if (topBuyersRes.ok) {
        const data = await topBuyersRes.json();
        setTopBuyers(data.topBuyers || []);
      }

      if (peakTimesRes.ok) {
        const data = await peakTimesRes.json();
        setPeakTimes(data);
      }
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    }
  };

  // Fetch retention data
  const fetchRetentionData = async () => {
    try {
      const res = await fetch("/api/sellers/analytics/retention");
      if (res.ok) {
        const data = await res.json();
        setRetention(data);
      }
    } catch (error) {
      console.error("Error fetching retention data:", error);
    }
  };

  // Fetch buyers data
  const fetchBuyersData = async (
    sort: "totalSpent" | "lastPurchaseAt" | "totalSessions" = "totalSpent",
    churnRisk: string | null = null,
    cursor?: string
  ) => {
    try {
      const params = new URLSearchParams({ sort, limit: "20" });
      if (churnRisk) params.set("churnRisk", churnRisk);
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/sellers/analytics/buyers?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (cursor) {
          setBuyers((prev) => [...prev, ...data.buyers]);
        } else {
          setBuyers(data.buyers || []);
        }
        setBuyersCursor(data.nextCursor);
        setHasMoreBuyers(!!data.nextCursor);
      }
    } catch (error) {
      console.error("Error fetching buyers data:", error);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchRevenueData(), fetchRetentionData(), fetchBuyersData()]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Handle period change for revenue chart
  const handlePeriodChange = (period: "daily" | "weekly" | "monthly") => {
    fetchRevenueData(period);
  };

  // Handle sort change for buyers
  const handleBuyerSortChange = (sort: "totalSpent" | "lastPurchaseAt" | "totalSessions") => {
    fetchBuyersData(sort, null);
  };

  // Handle churn risk filter
  const handleChurnRiskFilter = (risk: "low" | "medium" | "high" | null) => {
    fetchBuyersData("totalSpent", risk);
  };

  // Handle load more buyers
  const handleLoadMoreBuyers = () => {
    if (buyersCursor) {
      fetchBuyersData("totalSpent", null, buyersCursor);
    }
  };

  if (isLoading) {
    return <AnalyticsLoading />;
  }

  // Calculate stats for overview
  const totalRevenue = revenue?.totalRevenue || 0;
  const revenueChange = revenue?.periodComparison.changePercent || 0;
  const totalSessions = revenue?.chartData.reduce((sum, d) => sum + d.sessions, 0) || 0;
  const totalPurchases = revenue?.chartData.reduce((sum, d) => sum + d.purchases, 0) || 0;
  const averageOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;
  const totalBuyersCount = buyers.length;

  // Get at-risk buyers
  const atRiskBuyers = buyers
    .filter((b) => b.churnRisk === "high")
    .map((b) => ({
      buyerId: b.buyerId,
      buyerName: b.buyerName,
      buyerAvatar: b.buyerAvatar,
      lastPurchaseAt: b.lastPurchaseAt,
      totalSessions: b.totalSessions,
    }));

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your performance and understand your customers
          </p>
        </div>
        <ExportButton />
      </div>

      {/* Stats Overview */}
      <div className="mb-8">
        <StatsOverview
          totalRevenue={totalRevenue}
          revenueChange={revenueChange}
          totalSessions={totalSessions}
          averageOrderValue={averageOrderValue}
          totalBuyers={totalBuyersCount}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="buyers">Buyers</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <RevenueChart data={revenue?.chartData || []} onPeriodChange={handlePeriodChange} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopBuyersCard buyers={topBuyers} />
            {peakTimes && <PeakTimesHeatmap data={peakTimes} />}
          </div>
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {retention && <RetentionMetricsCard metrics={retention} />}
            <ChurnAlerts atRiskBuyers={atRiskBuyers} />
          </div>

          {retention && <CohortChart data={retention.cohorts} />}
        </TabsContent>

        {/* Buyers Tab */}
        <TabsContent value="buyers">
          <BuyerInsightsTable
            buyers={buyers}
            onSortChange={handleBuyerSortChange}
            onChurnRiskFilter={handleChurnRiskFilter}
            onLoadMore={handleLoadMoreBuyers}
            hasMore={hasMoreBuyers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AnalyticsLoading() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Skeleton className="h-10 w-64 mb-6" />

      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
