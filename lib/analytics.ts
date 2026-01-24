import { prisma } from "@/lib/prisma";

// ============================================
// TYPES
// ============================================

export interface RetentionMetrics {
  repeatBuyerRate: number;
  averageRepurchaseTimeDays: number | null;
  buyerChurnRate: number;
  sessionCompletionRate: number;
  rebookingRate: number;
  cohorts: CohortData[];
  buyerLifetimeValue: {
    average: number;
    median: number;
    top10Percent: number;
  };
}

export interface CohortData {
  month: string;
  totalBuyers: number;
  stillActive: number;
  retention: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  periodComparison: {
    current: number;
    previous: number;
    changePercent: number;
  };
  chartData: ChartDataPoint[];
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  purchases: number;
  sessions: number;
}

export interface TopBuyer {
  buyerId: string;
  buyerName: string | null;
  buyerAvatar: string | null;
  totalSpent: number;
  totalSessions: number;
  lastPurchaseAt: Date;
}

export interface PeakTimeData {
  peakHours: { hour: number; count: number }[];
  peakDays: { day: number; count: number }[];
  heatmap: { day: number; hour: number; count: number }[];
}

export interface BuyerInsight {
  buyerId: string;
  buyerName: string | null;
  buyerAvatar: string | null;
  firstPurchaseAt: Date;
  lastPurchaseAt: Date;
  totalPurchases: number;
  totalSpent: number;
  totalSessions: number;
  completedSessions: number;
  lifetimeValue: number;
  churnRisk: "low" | "medium" | "high" | null;
}

// ============================================
// DAILY STATS COMPUTATION
// ============================================

/**
 * Update or create daily stats for a seller
 */
export async function updateDailyStats(sellerId: string, date: Date): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get stats for the day
  const [purchaseStats, sessionStats, newBuyersCount] = await Promise.all([
    // Purchase stats
    prisma.purchase.aggregate({
      where: {
        sellerId,
        status: "COMPLETED",
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: { sellerReceives: true },
      _count: true,
    }),
    // Session stats
    prisma.session.aggregate({
      where: {
        sellerId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _count: true,
    }),
    // New buyers (first purchase with this seller)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT p."buyerId") as count
      FROM "Purchase" p
      WHERE p."sellerId" = ${sellerId}
        AND p.status = 'COMPLETED'
        AND p."createdAt" >= ${startOfDay}
        AND p."createdAt" <= ${endOfDay}
        AND NOT EXISTS (
          SELECT 1 FROM "Purchase" p2
          WHERE p2."buyerId" = p."buyerId"
            AND p2."sellerId" = ${sellerId}
            AND p2.status = 'COMPLETED'
            AND p2."createdAt" < ${startOfDay}
        )
    `,
  ]);

  // Count completed sessions
  const completedSessionsCount = await prisma.session.count({
    where: {
      sellerId,
      status: { in: ["COMPLETED", "AWAITING_CONFIRMATION", "PAID_OUT", "RATED"] },
      completedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Upsert daily stats
  await prisma.sellerDailyStats.upsert({
    where: {
      sellerId_date: {
        sellerId,
        date: startOfDay,
      },
    },
    update: {
      revenue: purchaseStats._sum.sellerReceives || 0,
      purchases: purchaseStats._count,
      sessions: sessionStats._count,
      completedSessions: completedSessionsCount,
      newBuyers: Number(newBuyersCount[0]?.count || 0),
    },
    create: {
      sellerId,
      date: startOfDay,
      revenue: purchaseStats._sum.sellerReceives || 0,
      purchases: purchaseStats._count,
      sessions: sessionStats._count,
      completedSessions: completedSessionsCount,
      newBuyers: Number(newBuyersCount[0]?.count || 0),
    },
  });
}

/**
 * Backfill daily stats for a seller
 */
export async function backfillDailyStats(sellerId: string, days: number = 90): Promise<void> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);

  // Process each day
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    await updateDailyStats(sellerId, new Date(d));
  }
}

// ============================================
// BUYER ANALYTICS COMPUTATION
// ============================================

/**
 * Refresh buyer analytics for a buyer-seller relationship
 */
export async function refreshBuyerAnalytics(buyerId: string, sellerId: string): Promise<void> {
  // Get all purchase and session data
  const [purchaseData, sessionData, firstPurchase] = await Promise.all([
    prisma.purchase.aggregate({
      where: {
        buyerId,
        sellerId,
        status: "COMPLETED",
      },
      _sum: { totalAmount: true, sellerReceives: true },
      _count: true,
      _max: { createdAt: true },
    }),
    prisma.session.aggregate({
      where: {
        buyerId,
        sellerId,
      },
      _count: true,
    }),
    prisma.purchase.findFirst({
      where: {
        buyerId,
        sellerId,
        status: "COMPLETED",
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  if (!firstPurchase || !purchaseData._max.createdAt) {
    return; // No completed purchases
  }

  // Count completed sessions
  const completedSessionsCount = await prisma.session.count({
    where: {
      buyerId,
      sellerId,
      status: { in: ["COMPLETED", "AWAITING_CONFIRMATION", "PAID_OUT", "RATED"] },
    },
  });

  // Calculate churn risk
  const daysSinceLastPurchase = Math.floor(
    (Date.now() - purchaseData._max.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  let churnRisk: "low" | "medium" | "high" = "low";
  if (daysSinceLastPurchase > 90) {
    churnRisk = "high";
  } else if (daysSinceLastPurchase > 30) {
    churnRisk = "medium";
  }

  // Upsert buyer analytics
  await prisma.buyerAnalytics.upsert({
    where: {
      buyerId_sellerId: {
        buyerId,
        sellerId,
      },
    },
    update: {
      lastPurchaseAt: purchaseData._max.createdAt,
      totalPurchases: purchaseData._count,
      totalSpent: purchaseData._sum.totalAmount || 0,
      totalSessions: sessionData._count,
      completedSessions: completedSessionsCount,
      lifetimeValue: purchaseData._sum.sellerReceives || 0,
      churnRisk,
    },
    create: {
      buyerId,
      sellerId,
      firstPurchaseAt: firstPurchase.createdAt,
      lastPurchaseAt: purchaseData._max.createdAt,
      totalPurchases: purchaseData._count,
      totalSpent: purchaseData._sum.totalAmount || 0,
      totalSessions: sessionData._count,
      completedSessions: completedSessionsCount,
      lifetimeValue: purchaseData._sum.sellerReceives || 0,
      churnRisk,
    },
  });
}

/**
 * Assess churn risk for all buyers of a seller
 */
export async function assessChurnRiskForSeller(sellerId: string): Promise<void> {
  const analytics = await prisma.buyerAnalytics.findMany({
    where: { sellerId },
  });

  const now = Date.now();

  for (const record of analytics) {
    const daysSinceLastPurchase = Math.floor(
      (now - record.lastPurchaseAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    let churnRisk: "low" | "medium" | "high" = "low";
    if (daysSinceLastPurchase > 90) {
      churnRisk = "high";
    } else if (daysSinceLastPurchase > 30) {
      churnRisk = "medium";
    }

    if (record.churnRisk !== churnRisk) {
      await prisma.buyerAnalytics.update({
        where: { id: record.id },
        data: { churnRisk },
      });
    }
  }
}

// ============================================
// RETENTION METRICS
// ============================================

/**
 * Compute retention metrics for a seller
 */
export async function computeRetentionMetrics(sellerId: string): Promise<RetentionMetrics> {
  // Get all buyer analytics
  const buyerAnalytics = await prisma.buyerAnalytics.findMany({
    where: { sellerId },
  });

  // Calculate repeat buyer rate
  const totalBuyers = buyerAnalytics.length;
  const repeatBuyers = buyerAnalytics.filter((b) => b.totalPurchases > 1).length;
  const repeatBuyerRate = totalBuyers > 0 ? repeatBuyers / totalBuyers : 0;

  // Calculate average repurchase time
  const repurchaseTimes: number[] = [];
  for (const buyer of buyerAnalytics) {
    if (buyer.totalPurchases > 1) {
      const daysBetween = Math.floor(
        (buyer.lastPurchaseAt.getTime() - buyer.firstPurchaseAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      repurchaseTimes.push(daysBetween / (buyer.totalPurchases - 1));
    }
  }
  const averageRepurchaseTimeDays =
    repurchaseTimes.length > 0
      ? repurchaseTimes.reduce((a, b) => a + b, 0) / repurchaseTimes.length
      : null;

  // Calculate churn rate (buyers with high churn risk / total)
  const churnedBuyers = buyerAnalytics.filter((b) => b.churnRisk === "high").length;
  const buyerChurnRate = totalBuyers > 0 ? churnedBuyers / totalBuyers : 0;

  // Calculate session completion rate
  const totalSessions = buyerAnalytics.reduce((sum, b) => sum + b.totalSessions, 0);
  const completedSessions = buyerAnalytics.reduce((sum, b) => sum + b.completedSessions, 0);
  const sessionCompletionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;

  // Calculate rebooking rate (buyers who had more than one session)
  const rebookers = buyerAnalytics.filter((b) => b.totalSessions > 1).length;
  const rebookingRate = totalBuyers > 0 ? rebookers / totalBuyers : 0;

  // Calculate cohorts (last 6 months)
  const cohorts: CohortData[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const cohortBuyers = buyerAnalytics.filter(
      (b) => b.firstPurchaseAt >= cohortStart && b.firstPurchaseAt <= cohortEnd
    );

    // Still active = purchased in last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const stillActive = cohortBuyers.filter((b) => b.lastPurchaseAt >= thirtyDaysAgo).length;

    cohorts.push({
      month: cohortStart.toISOString().slice(0, 7),
      totalBuyers: cohortBuyers.length,
      stillActive,
      retention: cohortBuyers.length > 0 ? stillActive / cohortBuyers.length : 0,
    });
  }

  // Calculate lifetime value stats
  const lifetimeValues = buyerAnalytics.map((b) => b.lifetimeValue).sort((a, b) => a - b);
  const averageLTV = lifetimeValues.length > 0
    ? lifetimeValues.reduce((a, b) => a + b, 0) / lifetimeValues.length
    : 0;
  const medianLTV = lifetimeValues.length > 0
    ? lifetimeValues[Math.floor(lifetimeValues.length / 2)]
    : 0;
  const top10PercentIndex = Math.floor(lifetimeValues.length * 0.9);
  const top10PercentLTV = lifetimeValues.length > 0 ? lifetimeValues[top10PercentIndex] || 0 : 0;

  return {
    repeatBuyerRate,
    averageRepurchaseTimeDays,
    buyerChurnRate,
    sessionCompletionRate,
    rebookingRate,
    cohorts,
    buyerLifetimeValue: {
      average: averageLTV,
      median: medianLTV,
      top10Percent: top10PercentLTV,
    },
  };
}

// ============================================
// REVENUE ANALYTICS
// ============================================

/**
 * Fetch revenue analytics for a seller
 */
export async function fetchRevenueAnalytics(
  sellerId: string,
  period: "daily" | "weekly" | "monthly" = "daily",
  days: number = 30
): Promise<RevenueAnalytics> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get daily stats
  const dailyStats = await prisma.sellerDailyStats.findMany({
    where: {
      sellerId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  // Calculate totals
  const totalRevenue = dailyStats.reduce((sum, d) => sum + d.revenue, 0);

  // Get previous period for comparison
  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - days);

  const prevDailyStats = await prisma.sellerDailyStats.findMany({
    where: {
      sellerId,
      date: {
        gte: prevStartDate,
        lte: prevEndDate,
      },
    },
  });

  const prevRevenue = prevDailyStats.reduce((sum, d) => sum + d.revenue, 0);
  const changePercent = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  // Aggregate chart data based on period
  const chartData: ChartDataPoint[] = [];

  if (period === "daily") {
    for (const stat of dailyStats) {
      chartData.push({
        date: stat.date.toISOString().slice(0, 10),
        revenue: stat.revenue,
        purchases: stat.purchases,
        sessions: stat.sessions,
      });
    }
  } else if (period === "weekly") {
    // Group by week
    const weeks = new Map<string, ChartDataPoint>();
    for (const stat of dailyStats) {
      const weekStart = getWeekStart(stat.date).toISOString().slice(0, 10);
      if (!weeks.has(weekStart)) {
        weeks.set(weekStart, { date: weekStart, revenue: 0, purchases: 0, sessions: 0 });
      }
      const week = weeks.get(weekStart)!;
      week.revenue += stat.revenue;
      week.purchases += stat.purchases;
      week.sessions += stat.sessions;
    }
    chartData.push(...Array.from(weeks.values()));
  } else {
    // Group by month
    const months = new Map<string, ChartDataPoint>();
    for (const stat of dailyStats) {
      const monthKey = stat.date.toISOString().slice(0, 7);
      if (!months.has(monthKey)) {
        months.set(monthKey, { date: monthKey, revenue: 0, purchases: 0, sessions: 0 });
      }
      const month = months.get(monthKey)!;
      month.revenue += stat.revenue;
      month.purchases += stat.purchases;
      month.sessions += stat.sessions;
    }
    chartData.push(...Array.from(months.values()));
  }

  return {
    totalRevenue,
    periodComparison: {
      current: totalRevenue,
      previous: prevRevenue,
      changePercent,
    },
    chartData,
  };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ============================================
// TOP BUYERS
// ============================================

/**
 * Get top buyers for a seller
 */
export async function fetchTopBuyers(
  sellerId: string,
  limit: number = 10,
  period: "all" | "year" | "month" = "all"
): Promise<TopBuyer[]> {
  let dateFilter: Date | undefined;

  if (period === "year") {
    dateFilter = new Date();
    dateFilter.setFullYear(dateFilter.getFullYear() - 1);
  } else if (period === "month") {
    dateFilter = new Date();
    dateFilter.setMonth(dateFilter.getMonth() - 1);
  }

  const buyerAnalytics = await prisma.buyerAnalytics.findMany({
    where: {
      sellerId,
      ...(dateFilter ? { lastPurchaseAt: { gte: dateFilter } } : {}),
    },
    orderBy: { totalSpent: "desc" },
    take: limit,
  });

  // Fetch buyer details
  const buyerIds = buyerAnalytics.map((b) => b.buyerId);
  const buyers = await prisma.user.findMany({
    where: { id: { in: buyerIds } },
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  });

  const buyerMap = new Map(buyers.map((b) => [b.id, b]));

  return buyerAnalytics.map((a) => {
    const buyer = buyerMap.get(a.buyerId);
    return {
      buyerId: a.buyerId,
      buyerName: buyer?.name || null,
      buyerAvatar: buyer?.avatar || null,
      totalSpent: a.totalSpent,
      totalSessions: a.totalSessions,
      lastPurchaseAt: a.lastPurchaseAt,
    };
  });
}

// ============================================
// PEAK TIMES
// ============================================

/**
 * Get peak booking times for a seller
 */
export async function fetchPeakTimes(sellerId: string): Promise<PeakTimeData> {
  // Get all sessions with scheduled times
  const sessions = await prisma.session.findMany({
    where: {
      sellerId,
      scheduledAt: { not: null },
    },
    select: {
      scheduledAt: true,
    },
  });

  const hourCounts = new Map<number, number>();
  const dayCounts = new Map<number, number>();
  const heatmapCounts = new Map<string, number>();

  for (const session of sessions) {
    if (!session.scheduledAt) continue;

    const hour = session.scheduledAt.getHours();
    const day = session.scheduledAt.getDay();

    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    heatmapCounts.set(`${day}-${hour}`, (heatmapCounts.get(`${day}-${hour}`) || 0) + 1);
  }

  // Convert to arrays sorted by count
  const peakHours = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count);

  const peakDays = Array.from(dayCounts.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.count - a.count);

  const heatmap = Array.from(heatmapCounts.entries()).map(([key, count]) => {
    const [day, hour] = key.split("-").map(Number);
    return { day, hour, count };
  });

  return { peakHours, peakDays, heatmap };
}

// ============================================
// BUYER INSIGHTS
// ============================================

/**
 * Get buyer insights for a seller with pagination
 */
export async function fetchBuyerInsights(
  sellerId: string,
  options: {
    sort?: "totalSpent" | "lastPurchaseAt" | "totalSessions";
    churnRisk?: "low" | "medium" | "high";
    minSpent?: number;
    limit?: number;
    cursor?: string;
  } = {}
): Promise<{ buyers: BuyerInsight[]; nextCursor: string | null }> {
  const { sort = "totalSpent", churnRisk, minSpent, limit = 20, cursor } = options;

  const analytics = await prisma.buyerAnalytics.findMany({
    where: {
      sellerId,
      ...(churnRisk ? { churnRisk } : {}),
      ...(minSpent ? { totalSpent: { gte: minSpent } } : {}),
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    orderBy: { [sort]: "desc" },
    take: limit + 1,
  });

  const hasMore = analytics.length > limit;
  if (hasMore) {
    analytics.pop();
  }

  // Fetch buyer details
  const buyerIds = analytics.map((a) => a.buyerId);
  const buyers = await prisma.user.findMany({
    where: { id: { in: buyerIds } },
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  });

  const buyerMap = new Map(buyers.map((b) => [b.id, b]));

  const buyerInsights: BuyerInsight[] = analytics.map((a) => {
    const buyer = buyerMap.get(a.buyerId);
    return {
      buyerId: a.buyerId,
      buyerName: buyer?.name || null,
      buyerAvatar: buyer?.avatar || null,
      firstPurchaseAt: a.firstPurchaseAt,
      lastPurchaseAt: a.lastPurchaseAt,
      totalPurchases: a.totalPurchases,
      totalSpent: a.totalSpent,
      totalSessions: a.totalSessions,
      completedSessions: a.completedSessions,
      lifetimeValue: a.lifetimeValue,
      churnRisk: a.churnRisk as "low" | "medium" | "high" | null,
    };
  });

  return {
    buyers: buyerInsights,
    nextCursor: hasMore ? analytics[analytics.length - 1].id : null,
  };
}
