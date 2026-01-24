import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { getOrCreateUser } from "@/lib/auth";
import { z } from "zod";

const disputeSchema = z.object({
  reason: z.string().min(20).max(1000),
});

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
    const body = await request.json();
    const { reason } = disputeSchema.parse(body);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only buyer can dispute
    if (session.buyerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only dispute AWAITING_CONFIRMATION or COMPLETED sessions
    if (
      session.status !== "AWAITING_CONFIRMATION" &&
      session.status !== "COMPLETED"
    ) {
      return NextResponse.json(
        { error: "Session cannot be disputed in current state" },
        { status: 400 }
      );
    }

    // Check if within dispute window (48 hours from completion)
    if (session.completedAt) {
      const disputeDeadline = new Date(
        session.completedAt.getTime() + 48 * 60 * 60 * 1000
      );
      if (new Date() > disputeDeadline) {
        return NextResponse.json(
          { error: "Dispute window has expired" },
          { status: 400 }
        );
      }
    }

    // Calculate amount at stake (for refund request)
    const sessionValue = session.pricePerUnit
      ? session.units * session.pricePerUnit
      : 0;

    // Use transaction to create dispute and update session
    const result = await prisma.$transaction(async (tx) => {
      // Create refund request
      const refundRequest = await tx.refundRequest.create({
        data: {
          sessionId,
          requesterId: user.id,
          reason,
          amountRequested: sessionValue,
          status: "PENDING",
        },
      });

      // Update session status to DISPUTED
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: {
          status: "DISPUTED",
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

      return { session: updatedSession, refundRequest };
    });

    // TODO: Send notification to admin and seller about dispute

    return NextResponse.json({
      session: result.session,
      refundRequest: result.refundRequest,
      message:
        "Dispute submitted. Our team will review and respond within 24-48 hours.",
    });
  } catch (error) {
    console.error("Error disputing session:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid dispute reason" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to submit dispute" },
      { status: 500 }
    );
  }
}
