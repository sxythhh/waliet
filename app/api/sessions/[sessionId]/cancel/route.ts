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

    // Only buyer or seller can cancel
    const isBuyer = session.buyerId === user.id;
    const isSeller = session.sellerId === user.id;

    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only cancel REQUESTED or ACCEPTED sessions
    if (session.status !== "REQUESTED" && session.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Session cannot be cancelled in current state" },
        { status: 400 }
      );
    }

    // Use transaction to cancel and release reserved units
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
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: isBuyer ? "buyer" : "seller",
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

    // TODO: Send notification to other party about cancelled session

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error("Error cancelling session:", error);
    return NextResponse.json(
      { error: "Failed to cancel session" },
      { status: 500 }
    );
  }
}
