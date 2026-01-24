import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { computeRetentionMetrics, assessChurnRiskForSeller } from "@/lib/analytics";

/**
 * GET /api/sellers/analytics/retention
 * Get retention metrics for the authenticated seller
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

    // Update churn risk assessments first
    await assessChurnRiskForSeller(user.id);

    // Compute retention metrics
    const metrics = await computeRetentionMetrics(user.id);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching retention metrics:", error);
    return NextResponse.json({ error: "Failed to fetch retention metrics" }, { status: 500 });
  }
}
