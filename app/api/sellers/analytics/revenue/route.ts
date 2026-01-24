import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { fetchRevenueAnalytics, backfillDailyStats } from "@/lib/analytics";

/**
 * GET /api/sellers/analytics/revenue
 * Get revenue analytics for the authenticated seller
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: whopUserId } = await whopsdk.verifyUserToken(request.headers);

    const user = await prisma.user.findUnique({
      where: { whopUserId },
      include: { sellerProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.sellerProfile) {
      return NextResponse.json({ error: "Seller profile not found" }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "daily") as "daily" | "weekly" | "monthly";
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Check if we need to backfill stats
    const statsCount = await prisma.sellerDailyStats.count({
      where: { sellerId: user.id },
    });

    if (statsCount === 0) {
      // Backfill stats for the first time
      await backfillDailyStats(user.id, days);
    }

    const analytics = await fetchRevenueAnalytics(user.id, period, days);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    return NextResponse.json({ error: "Failed to fetch revenue analytics" }, { status: 500 });
  }
}
