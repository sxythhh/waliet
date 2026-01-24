import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";

/**
 * GET /api/sellers/analytics/purchases
 * Get paginated purchase history for the authenticated seller
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const cursor = searchParams.get("cursor") || undefined;
    const sortBy = (searchParams.get("sortBy") || "createdAt") as "createdAt" | "totalAmount";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const purchases = await prisma.purchase.findMany({
      where: {
        sellerId: user.id,
        status: "COMPLETED",
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
      },
      orderBy: { [sortBy]: "desc" },
      take: limit + 1,
    });

    const hasMore = purchases.length > limit;
    if (hasMore) {
      purchases.pop();
    }

    const formattedPurchases = purchases.map((p) => ({
      id: p.id,
      buyerId: p.buyerId,
      buyerName: p.buyer.name,
      buyerAvatar: p.buyer.avatar,
      buyerEmail: p.buyer.email,
      units: p.units,
      pricePerUnit: p.pricePerUnit,
      totalAmount: p.totalAmount,
      platformFee: p.platformFee,
      communityFee: p.communityFee,
      sellerReceives: p.sellerReceives,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({
      purchases: formattedPurchases,
      nextCursor: hasMore ? purchases[purchases.length - 1].id : null,
      total: await prisma.purchase.count({
        where: { sellerId: user.id, status: "COMPLETED" },
      }),
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}
