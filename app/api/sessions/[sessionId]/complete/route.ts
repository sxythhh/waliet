import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { getOrCreateUser } from "@/lib/auth";
import { endSessionSchema } from "@/lib/validations";

// 48 hours in milliseconds for auto-release
const AUTO_RELEASE_HOURS = 48;
const AUTO_RELEASE_MS = AUTO_RELEASE_HOURS * 60 * 60 * 1000;

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
    const body = await request.json().catch(() => ({}));

    // actualMinutes is optional - defaults to booked duration
    const parsed = endSessionSchema.safeParse(body);
    const actualMinutes = parsed.success
      ? parsed.data.actualMinutes
      : undefined;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only seller can mark as complete
    if (session.sellerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only complete ACCEPTED or IN_PROGRESS sessions
    if (session.status !== "ACCEPTED" && session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Session cannot be completed in current state" },
        { status: 400 }
      );
    }

    const now = new Date();
    const autoReleaseAt = new Date(now.getTime() + AUTO_RELEASE_MS);

    // Use transaction to complete session and deduct units from wallet
    const updatedSession = await prisma.$transaction(async (tx) => {
      // Deduct units from wallet (move from reserved to spent)
      // Reserved units were already set when booking was created
      const walletBalance = await tx.walletBalance.findUnique({
        where: {
          holderId_sellerId: {
            holderId: session.buyerId,
            sellerId: session.sellerId,
          },
        },
      });

      if (walletBalance) {
        await tx.walletBalance.update({
          where: {
            holderId_sellerId: {
              holderId: session.buyerId,
              sellerId: session.sellerId,
            },
          },
          data: {
            // Release from reserved and deduct from balance
            reservedUnits: { decrement: session.units },
            balanceUnits: { decrement: session.units },
          },
        });
      }

      // Update session to AWAITING_CONFIRMATION
      return tx.session.update({
        where: { id: sessionId },
        data: {
          status: "AWAITING_CONFIRMATION",
          completedAt: now,
          autoReleaseAt,
          endedAt: now,
          actualMinutes: actualMinutes || session.units * 30,
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
    });

    // TODO: Send notification to buyer to confirm session completion

    return NextResponse.json({
      session: updatedSession,
      autoReleaseAt,
      message: `Session marked complete. Buyer has ${AUTO_RELEASE_HOURS} hours to confirm or dispute.`,
    });
  } catch (error) {
    console.error("Error completing session:", error);
    return NextResponse.json(
      { error: "Failed to complete session" },
      { status: 500 }
    );
  }
}
