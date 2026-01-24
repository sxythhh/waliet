import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";

/**
 * GET /api/sellers/earnings
 * Get earnings summary and history for the authenticated seller
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
    const period = searchParams.get("period") || "all";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const cursor = searchParams.get("cursor") || undefined;

    // Calculate date filter based on period
    let dateFilter: Date | undefined;
    const now = new Date();
    switch (period) {
      case "week":
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "year":
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        dateFilter = undefined;
    }

    // Get earnings summary
    const [completedPayouts, pendingPayouts, purchaseSummary] = await Promise.all([
      prisma.payout.aggregate({
        where: {
          sellerId: user.id,
          status: "COMPLETED",
          ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payout.aggregate({
        where: {
          sellerId: user.id,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.purchase.aggregate({
        where: {
          sellerId: user.id,
          status: "COMPLETED",
          ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
        },
        _sum: { sellerReceives: true, totalAmount: true, platformFee: true, communityFee: true },
        _count: true,
      }),
    ]);

    // Get earnings from completed sessions (awaiting confirmation or paid out)
    const earnedFromSessions = await prisma.session.aggregate({
      where: {
        sellerId: user.id,
        status: { in: ["AWAITING_CONFIRMATION", "PAID_OUT", "RATED"] },
        ...(dateFilter ? { completedAt: { gte: dateFilter } } : {}),
      },
      _count: true,
    });

    // Get payout history
    const payouts = await prisma.payout.findMany({
      where: {
        sellerId: user.id,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      include: {
        sessions: {
          select: {
            id: true,
            topic: true,
            buyer: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = payouts.length > limit;
    if (hasMore) {
      payouts.pop();
    }

    // Get recent purchases for earnings breakdown
    const recentPurchases = await prisma.purchase.findMany({
      where: {
        sellerId: user.id,
        status: "COMPLETED",
      },
      include: {
        buyer: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      summary: {
        totalEarnings: completedPayouts._sum.amount || 0,
        pendingEarnings: pendingPayouts._sum.amount || 0,
        totalSales: purchaseSummary._sum.totalAmount || 0,
        totalFees: (purchaseSummary._sum.platformFee || 0) + (purchaseSummary._sum.communityFee || 0),
        netEarnings: purchaseSummary._sum.sellerReceives || 0,
        completedPayouts: completedPayouts._count,
        pendingPayouts: pendingPayouts._count,
        completedSessions: earnedFromSessions._count,
        totalPurchases: purchaseSummary._count,
      },
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        processedAt: p.processedAt?.toISOString() || null,
        failedAt: p.failedAt?.toISOString() || null,
        failureReason: p.failureReason,
        createdAt: p.createdAt.toISOString(),
        sessions: p.sessions.map((s) => ({
          id: s.id,
          topic: s.topic,
          buyerName: s.buyer.name,
          buyerAvatar: s.buyer.avatar,
        })),
      })),
      recentPurchases: recentPurchases.map((p) => ({
        id: p.id,
        units: p.units,
        totalAmount: p.totalAmount,
        sellerReceives: p.sellerReceives,
        platformFee: p.platformFee,
        communityFee: p.communityFee,
        buyerName: p.buyer.name,
        buyerAvatar: p.buyer.avatar,
        createdAt: p.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? payouts[payouts.length - 1].id : null,
    });
  } catch (error) {
    console.error("Error fetching earnings:", error);
    return NextResponse.json({ error: "Failed to fetch earnings" }, { status: 500 });
  }
}
