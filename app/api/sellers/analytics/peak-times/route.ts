import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { fetchPeakTimes } from "@/lib/analytics";

/**
 * GET /api/sellers/analytics/peak-times
 * Get peak booking times for the authenticated seller
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

    const peakTimes = await fetchPeakTimes(user.id);

    return NextResponse.json(peakTimes);
  } catch (error) {
    console.error("Error fetching peak times:", error);
    return NextResponse.json({ error: "Failed to fetch peak times" }, { status: 500 });
  }
}
