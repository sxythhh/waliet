import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { getOrCreateUser } from "@/lib/auth";
import { createSessionSchema } from "@/lib/validations";
import type { SessionStatus, Prisma } from "@prisma/client";

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
    const role = searchParams.get("role"); // "buyer" | "seller" | null (both)
    const status = searchParams.get("status") as SessionStatus | null;

    const whereClause: Prisma.SessionWhereInput = {};

    if (role === "buyer") {
      whereClause.buyerId = user.id;
    } else if (role === "seller") {
      whereClause.sellerId = user.id;
    } else {
      // Return sessions where user is either buyer or seller
      whereClause.OR = [{ buyerId: user.id }, { sellerId: user.id }];
    }

    if (status) {
      whereClause.status = status;
    }

    const sessions = await prisma.session.findMany({
      where: whereClause,
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

export async function POST(request: NextRequest) {
  try {
    const { userId: whopUserId } = await whopsdk.verifyUserToken(
      request.headers
    );

    const body = await request.json();
    const { sellerId, units, topic, proposedTimes, timezone } =
      createSessionSchema.parse(body);

    // Get or create buyer
    const buyer = await getOrCreateUser(whopUserId);
    if (!buyer) {
      return NextResponse.json(
        { error: "Failed to get or create user" },
        { status: 500 }
      );
    }

    // Can't book with yourself
    if (buyer.id === sellerId) {
      return NextResponse.json(
        { error: "Cannot book a session with yourself" },
        { status: 400 }
      );
    }

    // Verify seller exists and has a profile
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      include: { sellerProfile: true },
    });

    if (!seller || !seller.sellerProfile) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    if (!seller.sellerProfile.isActive) {
      return NextResponse.json(
        { error: "Seller is not accepting bookings" },
        { status: 400 }
      );
    }

    // Check buyer has sufficient balance with this seller
    const walletBalance = await prisma.walletBalance.findUnique({
      where: {
        holderId_sellerId: {
          holderId: buyer.id,
          sellerId,
        },
      },
    });

    if (!walletBalance) {
      return NextResponse.json(
        { error: "No hours purchased with this seller" },
        { status: 400 }
      );
    }

    const availableUnits =
      walletBalance.balanceUnits - walletBalance.reservedUnits;

    if (availableUnits < units) {
      return NextResponse.json(
        {
          error: "Insufficient hours",
          available: availableUnits,
          requested: units,
        },
        { status: 400 }
      );
    }

    // Calculate price per unit at booking time (for payout calculation)
    const pricePerUnit = Math.round(seller.sellerProfile.hourlyRate / 2);

    // Use transaction to create session and reserve units
    const session = await prisma.$transaction(async (tx) => {
      // Reserve units from wallet
      await tx.walletBalance.update({
        where: {
          holderId_sellerId: {
            holderId: buyer.id,
            sellerId,
          },
        },
        data: {
          reservedUnits: { increment: units },
        },
      });

      // Create session with REQUESTED status
      const newSession = await tx.session.create({
        data: {
          buyerId: buyer.id,
          sellerId,
          units,
          topic,
          timezone,
          pricePerUnit,
          status: "REQUESTED",
          // Store proposed times as JSON in a note or handle in UI
          // For simplicity, we'll use the first proposed time
          scheduledAt: proposedTimes[0] ? new Date(proposedTimes[0]) : null,
          scheduledEndAt: proposedTimes[0]
            ? new Date(
                new Date(proposedTimes[0]).getTime() + units * 30 * 60 * 1000
              )
            : null,
        },
        include: {
          buyer: {
            select: { id: true, name: true, avatar: true },
          },
          seller: {
            select: {
              id: true,
              name: true,
              avatar: true,
              sellerProfile: { select: { hourlyRate: true } },
            },
          },
        },
      });

      return newSession;
    });

    // TODO: Send notification to seller about new booking request

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Error creating session:", error);

    if (error instanceof Error && error.message.includes("Zod")) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
