import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { getOrCreateUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
        seller: {
          select: { whopUserId: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only buyer can confirm
    if (session.buyerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only confirm AWAITING_CONFIRMATION sessions
    if (session.status !== "AWAITING_CONFIRMATION") {
      return NextResponse.json(
        { error: "Session cannot be confirmed in current state" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update session status to COMPLETED and mark confirmed
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        confirmedAt: now,
      },
      include: {
        buyer: {
          select: { id: true, name: true, avatar: true },
        },
        seller: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // The payout will be processed by the cron job at /api/payouts/process
    // This ensures payouts are batched and processed reliably

    return NextResponse.json({
      session: updatedSession,
      message:
        "Session confirmed. Payout will be processed within the next processing cycle.",
    });
  } catch (error) {
    console.error("Error confirming session:", error);
    return NextResponse.json(
      { error: "Failed to confirm session" },
      { status: 500 }
    );
  }
}
