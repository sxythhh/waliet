import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { fetchBuyerInsights } from "@/lib/analytics";

/**
 * GET /api/sellers/analytics/buyers
 * Get buyer insights for the authenticated seller with pagination
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
    const sort = (searchParams.get("sort") || "totalSpent") as "totalSpent" | "lastPurchaseAt" | "totalSessions";
    const churnRisk = searchParams.get("churnRisk") as "low" | "medium" | "high" | null;
    const minSpent = searchParams.get("minSpent") ? parseInt(searchParams.get("minSpent")!, 10) : undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const cursor = searchParams.get("cursor") || undefined;

    const result = await fetchBuyerInsights(user.id, {
      sort,
      churnRisk: churnRisk || undefined,
      minSpent,
      limit,
      cursor,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching buyer insights:", error);
    return NextResponse.json({ error: "Failed to fetch buyer insights" }, { status: 500 });
  }
}
