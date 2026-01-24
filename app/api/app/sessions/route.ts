import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDualAuthUser } from "@/lib/dual-auth";
import type { SessionStatus, Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role"); // "buyer" | "seller" | null (both)
    const status = searchParams.get("status") as SessionStatus | null;

    const whereClause: Prisma.SessionWhereInput = {};

    if (role === "buyer") {
      whereClause.buyerId = auth.dbUser.id;
    } else if (role === "seller") {
      whereClause.sellerId = auth.dbUser.id;
    } else {
      // Return sessions where user is either buyer or seller
      whereClause.OR = [{ buyerId: auth.dbUser.id }, { sellerId: auth.dbUser.id }];
    }

    if (status) {
      whereClause.status = status;
    }

    const sessions = await prisma.session.findMany({
      where: whereClause,
      include: {
        buyer: {
          select: { id: true, name: true, avatar: true },
        },
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
