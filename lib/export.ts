import { prisma } from "@/lib/prisma";
import { formatCents, formatDateTime } from "@/lib/utils";

interface DateRange {
  start?: Date;
  end?: Date;
}

/**
 * Generate CSV for purchases
 */
export async function generatePurchasesCsv(
  sellerId: string,
  dateRange?: DateRange
): Promise<string> {
  const purchases = await prisma.purchase.findMany({
    where: {
      sellerId,
      status: "COMPLETED",
      ...(dateRange?.start || dateRange?.end
        ? {
            createdAt: {
              ...(dateRange.start ? { gte: dateRange.start } : {}),
              ...(dateRange.end ? { lte: dateRange.end } : {}),
            },
          }
        : {}),
    },
    include: {
      buyer: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // CSV header
  const headers = [
    "Date",
    "Buyer Name",
    "Buyer Email",
    "Units (30-min)",
    "Hours",
    "Price Per Unit",
    "Total Amount",
    "Platform Fee",
    "Community Fee",
    "Your Earnings",
    "Status",
  ];

  // CSV rows
  const rows = purchases.map((p) => [
    formatDateTime(p.createdAt),
    p.buyer.name || "Anonymous",
    p.buyer.email || "",
    p.units.toString(),
    (p.units / 2).toString(),
    formatCents(p.pricePerUnit),
    formatCents(p.totalAmount),
    formatCents(p.platformFee),
    formatCents(p.communityFee),
    formatCents(p.sellerReceives),
    p.status,
  ]);

  return formatCsv(headers, rows);
}

/**
 * Generate CSV for sessions
 */
export async function generateSessionsCsv(
  sellerId: string,
  dateRange?: DateRange
): Promise<string> {
  const sessions = await prisma.session.findMany({
    where: {
      sellerId,
      ...(dateRange?.start || dateRange?.end
        ? {
            createdAt: {
              ...(dateRange.start ? { gte: dateRange.start } : {}),
              ...(dateRange.end ? { lte: dateRange.end } : {}),
            },
          }
        : {}),
    },
    include: {
      buyer: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // CSV header
  const headers = [
    "Date Created",
    "Buyer Name",
    "Buyer Email",
    "Topic",
    "Units (30-min)",
    "Hours",
    "Scheduled At",
    "Status",
    "Started At",
    "Ended At",
    "Actual Minutes",
  ];

  // CSV rows
  const rows = sessions.map((s) => [
    formatDateTime(s.createdAt),
    s.buyer.name || "Anonymous",
    s.buyer.email || "",
    escapeCsvField(s.topic),
    s.units.toString(),
    (s.units / 2).toString(),
    s.scheduledAt ? formatDateTime(s.scheduledAt) : "",
    s.status,
    s.startedAt ? formatDateTime(s.startedAt) : "",
    s.endedAt ? formatDateTime(s.endedAt) : "",
    s.actualMinutes?.toString() || "",
  ]);

  return formatCsv(headers, rows);
}

/**
 * Generate CSV for analytics summary
 */
export async function generateAnalyticsCsv(
  sellerId: string,
  dateRange?: DateRange
): Promise<string> {
  const dailyStats = await prisma.sellerDailyStats.findMany({
    where: {
      sellerId,
      ...(dateRange?.start || dateRange?.end
        ? {
            date: {
              ...(dateRange.start ? { gte: dateRange.start } : {}),
              ...(dateRange.end ? { lte: dateRange.end } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
  });

  // CSV header
  const headers = [
    "Date",
    "Revenue",
    "Purchases",
    "Sessions",
    "Completed Sessions",
    "New Buyers",
  ];

  // CSV rows
  const rows = dailyStats.map((s) => [
    s.date.toISOString().slice(0, 10),
    formatCents(s.revenue),
    s.purchases.toString(),
    s.sessions.toString(),
    s.completedSessions.toString(),
    s.newBuyers.toString(),
  ]);

  return formatCsv(headers, rows);
}

/**
 * Generate CSV for buyer list
 */
export async function generateBuyersCsv(sellerId: string): Promise<string> {
  const buyerAnalytics = await prisma.buyerAnalytics.findMany({
    where: { sellerId },
    orderBy: { totalSpent: "desc" },
  });

  // Fetch buyer details
  const buyerIds = buyerAnalytics.map((a) => a.buyerId);
  const buyers = await prisma.user.findMany({
    where: { id: { in: buyerIds } },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const buyerMap = new Map(buyers.map((b) => [b.id, b]));

  // CSV header
  const headers = [
    "Buyer Name",
    "Buyer Email",
    "First Purchase",
    "Last Purchase",
    "Total Purchases",
    "Total Spent",
    "Total Sessions",
    "Completed Sessions",
    "Lifetime Value",
    "Churn Risk",
  ];

  // CSV rows
  const rows = buyerAnalytics.map((a) => {
    const buyer = buyerMap.get(a.buyerId);
    return [
      buyer?.name || "Anonymous",
      buyer?.email || "",
      formatDateTime(a.firstPurchaseAt),
      formatDateTime(a.lastPurchaseAt),
      a.totalPurchases.toString(),
      formatCents(a.totalSpent),
      a.totalSessions.toString(),
      a.completedSessions.toString(),
      formatCents(a.lifetimeValue),
      a.churnRisk || "N/A",
    ];
  });

  return formatCsv(headers, rows);
}

/**
 * Format data as CSV string
 */
function formatCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Escape a CSV field value
 */
function escapeCsvField(value: string): string {
  // If value contains comma, newline, or quote, wrap in quotes and escape inner quotes
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export type ExportType = "purchases" | "sessions" | "analytics" | "buyers";

/**
 * Generate export data by type
 */
export async function generateExport(
  sellerId: string,
  type: ExportType,
  dateRange?: DateRange
): Promise<{ data: string; filename: string; contentType: string }> {
  let data: string;
  const timestamp = new Date().toISOString().slice(0, 10);

  switch (type) {
    case "purchases":
      data = await generatePurchasesCsv(sellerId, dateRange);
      return {
        data,
        filename: `purchases_${timestamp}.csv`,
        contentType: "text/csv",
      };

    case "sessions":
      data = await generateSessionsCsv(sellerId, dateRange);
      return {
        data,
        filename: `sessions_${timestamp}.csv`,
        contentType: "text/csv",
      };

    case "analytics":
      data = await generateAnalyticsCsv(sellerId, dateRange);
      return {
        data,
        filename: `analytics_${timestamp}.csv`,
        contentType: "text/csv",
      };

    case "buyers":
      data = await generateBuyersCsv(sellerId);
      return {
        data,
        filename: `buyers_${timestamp}.csv`,
        contentType: "text/csv",
      };

    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}
