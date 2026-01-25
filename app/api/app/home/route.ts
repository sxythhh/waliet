import { NextResponse } from "next/server";
import { getDualAuthUser } from "@/lib/dual-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = auth.dbUser;

    // Return minimal home data structure
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        email: user.email,
      },
      isSeller: false,
      stats: {
        totalEarnings: 0,
        pendingEarnings: 0,
        pendingPayoutAmount: 0,
        totalSessions: 0,
        uniqueBuyers: 0,
        averageRating: null,
        totalReviews: 0,
        hourlyRate: 0,
      },
      earningsChart: [],
      earningsChange: 0,
      pendingActions: {
        sessionRequests: 0,
        awaitingConfirmation: 0,
        inProgress: 0,
        pendingPayouts: 0,
      },
      upcomingSessions: [],
      recentActivity: [],
    });
  } catch (error) {
    console.error("[/api/app/home] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
