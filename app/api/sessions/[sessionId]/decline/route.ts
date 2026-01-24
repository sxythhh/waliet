import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { getOrCreateUser } from "@/lib/auth";
import { cancelSessionSchema } from "@/lib/validations";

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
    const { reason } = cancelSessionSchema.parse(body);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only seller can decline
    if (session.sellerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only decline REQUESTED sessions
    if (session.status !== "REQUESTED") {
      return NextResponse.json(
        { error: "Session cannot be declined in current state" },
        { status: 400 }
      );
    }

    // Use transaction to decline and release reserved units
    const updatedSession = await prisma.$transaction(async (tx) => {
      // Release reserved units back to buyer's available balance
      await tx.walletBalance.update({
        where: {
          holderId_sellerId: {
            holderId: session.buyerId,
            sellerId: session.sellerId,
          },
        },
        data: {
          reservedUnits: { decrement: session.units },
        },
      });

      // Update session status
      return tx.session.update({
        where: { id: sessionId },
        data: {
          status: "DECLINED",
          cancelledAt: new Date(),
          cancelledBy: "seller",
          cancellationReason: reason,
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

    // TODO: Send notification to buyer about declined session

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error("Error declining session:", error);
    return NextResponse.json(
      { error: "Failed to decline session" },
      { status: 500 }
    );
  }
}
