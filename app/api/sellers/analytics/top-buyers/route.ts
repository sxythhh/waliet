import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { fetchTopBuyers } from "@/lib/analytics";

/**
 * GET /api/sellers/analytics/top-buyers
 * Get top buyers for the authenticated seller
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
    const period = (searchParams.get("period") || "all") as "all" | "year" | "month";

    const topBuyers = await fetchTopBuyers(user.id, limit, period);

    return NextResponse.json({ topBuyers });
  } catch (error) {
    console.error("Error fetching top buyers:", error);
    return NextResponse.json({ error: "Failed to fetch top buyers" }, { status: 500 });
  }
}
