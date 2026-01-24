import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDualAuthUser } from "@/lib/dual-auth";
import { subDays } from "date-fns";

export async function GET() {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.dbUser.id;
    const sellerProfile = auth.dbUser.sellerProfile;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);

    // Base user data
    const userData = {
      id: auth.dbUser.id,
      name: auth.dbUser.name,
      avatar: auth.dbUser.avatar,
      email: auth.dbUser.email,
    };

    // If user has a seller profile, get seller-specific data
    if (sellerProfile) {
      // Get session stats
      const [
        completedSessions,
        pendingRequests,
        awaitingConfirmation,
        inProgressSessions,
        upcomingSessions,
      ] = await Promise.all([
        prisma.session.count({
          where: {
            sellerId: userId,
            status: { in: ["COMPLETED", "RATED", "PAID_OUT"] },
          },
        }),
        prisma.session.count({
          where: {
            sellerId: userId,
            status: "REQUESTED",
          },
        }),
        prisma.session.count({
          where: {
            sellerId: userId,
            status: "AWAITING_CONFIRMATION",
          },
        }),
        prisma.session.count({
          where: {
            sellerId: userId,
            status: "IN_PROGRESS",
          },
        }),
        prisma.session.findMany({
          where: {
            sellerId: userId,
            status: { in: ["ACCEPTED", "REQUESTED"] },
            scheduledAt: { gte: now },
          },
          include: {
            buyer: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { scheduledAt: "asc" },
          take: 5,
        }),
      ]);

      // Calculate earnings from completed sessions
      const completedSessionsData = await prisma.session.findMany({
        where: {
          sellerId: userId,
          status: { in: ["COMPLETED", "RATED", "PAID_OUT", "AWAITING_CONFIRMATION"] },
        },
        select: {
          pricePerUnit: true,
          units: true,
          status: true,
          completedAt: true,
          createdAt: true,
        },
      });

      const totalEarnings = completedSessionsData
        .filter((s) => ["COMPLETED", "RATED", "PAID_OUT"].includes(s.status))
        .reduce((sum, s) => sum + (s.pricePerUnit || 0) * s.units, 0);

      const pendingEarnings = completedSessionsData
        .filter((s) => s.status === "AWAITING_CONFIRMATION")
        .reduce((sum, s) => sum + (s.pricePerUnit || 0) * s.units, 0);

      // Get pending payouts
      const pendingPayouts = await prisma.payout.findMany({
        where: {
          sellerId: userId,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        select: { amount: true },
      });
      const pendingPayoutAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

      // Get earnings for last 7 days (for sparkline chart)
      const recentEarnings = await prisma.session.findMany({
        where: {
          sellerId: userId,
          status: { in: ["COMPLETED", "RATED", "PAID_OUT"] },
          completedAt: { gte: sevenDaysAgo },
        },
        select: {
          pricePerUnit: true,
          units: true,
          completedAt: true,
        },
      });

      // Group earnings by day for sparkline
      const earningsByDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        const dateKey = date.toISOString().slice(0, 10);
        earningsByDay[dateKey] = 0;
      }

      for (const session of recentEarnings) {
        if (session.completedAt) {
          const dateKey = session.completedAt.toISOString().slice(0, 10);
          if (earningsByDay[dateKey] !== undefined) {
            earningsByDay[dateKey] += (session.pricePerUnit || 0) * session.units;
          }
        }
      }

      const earningsChart = Object.entries(earningsByDay).map(([date, amount]) => ({
        date,
        amount: amount / 100, // Convert cents to dollars
      }));

      // Calculate earnings change (this week vs last week)
      const thisWeekEarnings = recentEarnings.reduce(
        (sum, s) => sum + (s.pricePerUnit || 0) * s.units,
        0
      );

      const lastWeekEarnings = await prisma.session.findMany({
        where: {
          sellerId: userId,
          status: { in: ["COMPLETED", "RATED", "PAID_OUT"] },
          completedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
        select: { pricePerUnit: true, units: true },
      });

      const lastWeekTotal = lastWeekEarnings.reduce(
        (sum, s) => sum + (s.pricePerUnit || 0) * s.units,
        0
      );

      const earningsChange =
        lastWeekTotal > 0
          ? ((thisWeekEarnings - lastWeekTotal) / lastWeekTotal) * 100
          : thisWeekEarnings > 0
          ? 100
          : 0;

      // Get unique buyers count
      const uniqueBuyers = await prisma.session.groupBy({
        by: ["buyerId"],
        where: {
          sellerId: userId,
          status: { in: ["COMPLETED", "RATED", "PAID_OUT"] },
        },
      });

      // Get recent activity
      const recentSessions = await prisma.session.findMany({
        where: { sellerId: userId },
        include: {
          buyer: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      const recentPurchases = await prisma.purchase.findMany({
        where: { sellerId: userId },
        include: {
          buyer: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      return NextResponse.json({
        user: userData,
        isSeller: true,
        stats: {
          totalEarnings: totalEarnings / 100,
          pendingEarnings: pendingEarnings / 100,
          pendingPayoutAmount: pendingPayoutAmount / 100,
          totalSessions: completedSessions,
          uniqueBuyers: uniqueBuyers.length,
          averageRating: sellerProfile.averageRating,
          totalReviews: sellerProfile.totalReviews,
          hourlyRate: sellerProfile.hourlyRate / 100,
        },
        earningsChart,
        earningsChange,
        pendingActions: {
          sessionRequests: pendingRequests,
          awaitingConfirmation,
          inProgress: inProgressSessions,
          pendingPayouts: pendingPayouts.length,
        },
        upcomingSessions: upcomingSessions.map((s) => ({
          id: s.id,
          topic: s.topic,
          scheduledAt: s.scheduledAt?.toISOString() || null,
          status: s.status,
          buyer: s.buyer,
        })),
        recentActivity: [
          ...recentSessions.map((s) => ({
            id: `session-${s.id}`,
            type: "session" as const,
            title:
              s.status === "REQUESTED"
                ? "New session request"
                : s.status === "COMPLETED"
                ? "Session completed"
                : `Session ${s.status.toLowerCase().replace("_", " ")}`,
            description: `${s.buyer?.name || "Someone"} - ${s.topic}`,
            timestamp: s.createdAt.toISOString(),
            status: s.status,
          })),
          ...recentPurchases.map((p) => ({
            id: `purchase-${p.id}`,
            type: "purchase" as const,
            title: "New purchase",
            description: `${p.buyer?.name || "Someone"} bought ${p.units} unit(s)`,
            amount: p.sellerReceives / 100,
            timestamp: p.createdAt.toISOString(),
            status: p.status,
          })),
        ]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10),
      });
    }

    // Non-seller user (buyer only)
    const purchasesMade = await prisma.purchase.count({
      where: { buyerId: userId },
    });

    const sessionsBooked = await prisma.session.count({
      where: { buyerId: userId },
    });

    const totalSpent = await prisma.purchase.aggregate({
      where: { buyerId: userId, status: "COMPLETED" },
      _sum: { totalAmount: true },
    });

    return NextResponse.json({
      user: userData,
      isSeller: false,
      stats: {
        totalSpent: (totalSpent._sum.totalAmount || 0) / 100,
        purchasesMade,
        sessionsBooked,
      },
      pendingActions: {
        sessionRequests: 0,
        awaitingConfirmation: 0,
        inProgress: 0,
        pendingPayouts: 0,
      },
      earningsChart: [],
      earningsChange: 0,
      upcomingSessions: [],
      recentActivity: [],
    });
  } catch (error) {
    console.error("Error fetching home data:", error);
    return NextResponse.json(
      { error: "Failed to fetch home data" },
      { status: 500 }
    );
  }
}
