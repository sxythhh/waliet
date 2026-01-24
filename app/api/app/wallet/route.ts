import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDualAuthUser } from "@/lib/dual-auth";

export async function GET() {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balances = await prisma.walletBalance.findMany({
      where: {
        holderId: auth.dbUser.id,
        balanceUnits: { gt: 0 },
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            sellerProfile: {
              select: {
                hourlyRate: true,
                averageRating: true,
                totalSessionsCompleted: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Calculate totals
    let totalUnits = 0;
    let totalValue = 0;
    for (const balance of balances) {
      totalUnits += balance.balanceUnits;
      const currentRate = balance.seller.sellerProfile?.hourlyRate || 0;
      totalValue += (balance.balanceUnits / 2) * currentRate;
    }

    return NextResponse.json({
      balances,
      summary: {
        totalUnits,
        totalHours: totalUnits / 2,
        totalValueCents: totalValue,
        sellerCount: balances.length,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 }
    );
  }
}
