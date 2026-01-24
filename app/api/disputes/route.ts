import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { getOrCreateUser } from "@/lib/auth";
import type { RefundStatus, Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { userId: whopUserId } = await whopsdk.verifyUserToken(
      request.headers
    );

    const user = await getOrCreateUser(whopUserId);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as RefundStatus | null;
    const sessionId = searchParams.get("sessionId");

    // Build query - users can only see their own disputes
    const whereClause: Prisma.RefundRequestWhereInput = {
      requesterId: user.id,
    };

    if (status) {
      whereClause.status = status;
    }

    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const disputes = await prisma.refundRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ disputes });
  } catch (error) {
    console.error("Error fetching disputes:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}
