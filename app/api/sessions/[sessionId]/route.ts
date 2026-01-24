import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { getOrCreateUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: whopUserId } = await whopsdk.verifyUserToken(
      request.headers
    );

    const user = await getOrCreateUser(whopUserId);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        buyer: {
          select: { id: true, name: true, avatar: true, whopUserId: true },
        },
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            whopUserId: true,
            sellerProfile: { select: { hourlyRate: true, averageRating: true } },
          },
        },
        review: true,
        payout: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only buyer or seller can view session details
    if (session.buyerId !== user.id && session.sellerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
