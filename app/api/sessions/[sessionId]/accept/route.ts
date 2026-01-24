import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { getOrCreateUser } from "@/lib/auth";
import { acceptSessionSchema } from "@/lib/validations";

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
    const { scheduledAt } = acceptSessionSchema.parse(body);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only seller can accept
    if (session.sellerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only accept REQUESTED sessions
    if (session.status !== "REQUESTED") {
      return NextResponse.json(
        { error: "Session cannot be accepted in current state" },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledAt);
    const scheduledEndDate = new Date(
      scheduledDate.getTime() + session.units * 30 * 60 * 1000
    );

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "ACCEPTED",
        scheduledAt: scheduledDate,
        scheduledEndAt: scheduledEndDate,
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

    // TODO: Send notification to buyer about accepted session

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error("Error accepting session:", error);
    return NextResponse.json(
      { error: "Failed to accept session" },
      { status: 500 }
    );
  }
}
