import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { getEffectiveCommissionRates } from "@/lib/commissions";
import { DEFAULT_PLATFORM_FEE_BPS, DEFAULT_COMMUNITY_FEE_BPS } from "@/lib/utils";

/**
 * GET /api/sellers/commissions
 * Get the effective commission rates for the authenticated seller
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

    // Get community context from query params (optional)
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    // Get effective rates
    const rates = await getEffectiveCommissionRates(user.id, companyId);

    // Calculate net percentage the seller receives
    const netPercentage = 100 - (rates.platformFeeBps + rates.communityFeeBps) / 100;

    return NextResponse.json({
      platformFeeBps: rates.platformFeeBps,
      communityFeeBps: rates.communityFeeBps,
      totalFeeBps: rates.totalFeeBps,
      netPercentage,
      source: rates.source,
      defaults: {
        platformFeeBps: DEFAULT_PLATFORM_FEE_BPS,
        communityFeeBps: DEFAULT_COMMUNITY_FEE_BPS,
      },
      hasCustomRate:
        rates.source.platform !== "default" || rates.source.community !== "default",
    });
  } catch (error) {
    console.error("Error fetching commission rates:", error);
    return NextResponse.json({ error: "Failed to fetch commission rates" }, { status: 500 });
  }
}
