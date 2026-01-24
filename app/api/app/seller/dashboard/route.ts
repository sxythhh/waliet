import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDualAuthUser } from "@/lib/dual-auth";

export async function GET() {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sellerProfile = auth.dbUser.sellerProfile;

    if (!sellerProfile) {
      return NextResponse.json(
        { error: "No seller profile" },
        { status: 404 }
      );
    }

    // Get session stats
    const [completedSessions, pendingRequests, allSessions] = await Promise.all([
      prisma.session.count({
        where: {
          sellerId: auth.dbUser.id,
          status: { in: ["COMPLETED", "RATED", "PAID_OUT"] },
        },
      }),
      prisma.session.count({
        where: {
          sellerId: auth.dbUser.id,
          status: "REQUESTED",
        },
      }),
      prisma.session.findMany({
        where: {
          sellerId: auth.dbUser.id,
        },
        include: {
          buyer: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Calculate earnings (simplified - in production, track actual payouts)
    const completedSessionsData = await prisma.session.findMany({
      where: {
        sellerId: auth.dbUser.id,
        status: { in: ["COMPLETED", "RATED", "PAID_OUT"] },
      },
      select: {
        pricePerUnit: true,
        units: true,
      },
    });

    const totalEarnings = completedSessionsData.reduce((sum, s) => {
      return sum + (s.pricePerUnit || 0) * s.units;
    }, 0);

    // Pending earnings (AWAITING_CONFIRMATION sessions)
    const pendingSessionsData = await prisma.session.findMany({
      where: {
        sellerId: auth.dbUser.id,
        status: "AWAITING_CONFIRMATION",
      },
      select: {
        pricePerUnit: true,
        units: true,
      },
    });

    const pendingEarnings = pendingSessionsData.reduce((sum, s) => {
      return sum + (s.pricePerUnit || 0) * s.units;
    }, 0);

    return NextResponse.json({
      stats: {
        totalEarnings,
        pendingEarnings,
        totalSessions: completedSessions,
        pendingRequests,
        averageRating: sellerProfile.averageRating,
        totalReviews: sellerProfile.totalReviews,
        hourlyRate: sellerProfile.hourlyRate,
      },
      recentSessions: allSessions.map((session) => ({
        id: session.id,
        topic: session.topic,
        scheduledAt: session.scheduledAt?.toISOString() || null,
        status: session.status,
        buyer: session.buyer,
      })),
    });
  } catch (error) {
    console.error("Error fetching seller dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch seller dashboard" },
      { status: 500 }
    );
  }
}
