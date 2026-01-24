import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayoutTransfer, PLATFORM_COMPANY_ID } from "@/lib/whop-sdk";
import { calculatePlatformFee, calculateCommunityFee } from "@/lib/utils";

// This endpoint should be called by a cron job to process pending payouts
// It finds sessions that are ready for payout and processes them

const DEFAULT_COMMUNITY_FEE_BPS = 500; // 5%

export async function POST(request: NextRequest) {
  try {
    // Verify this is called from a trusted source (cron job or admin)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow if either:
    // 1. Cron secret matches
    // 2. In development mode
    const isDev = process.env.NODE_ENV === "development";
    const validCronAuth =
      cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isDev && !validCronAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!PLATFORM_COMPANY_ID) {
      return NextResponse.json(
        { error: "PLATFORM_COMPANY_ID not configured" },
        { status: 500 }
      );
    }

    const now = new Date();

    // Find sessions ready for payout:
    // 1. COMPLETED with confirmedAt set (buyer confirmed)
    // 2. AWAITING_CONFIRMATION with autoReleaseAt in the past (auto-release)
    // AND not already paid out (no payoutId)
    const readySessions = await prisma.session.findMany({
      where: {
        payoutId: null,
        status: {
          in: ["COMPLETED", "AWAITING_CONFIRMATION"],
        },
        OR: [
          // Buyer confirmed
          {
            status: "COMPLETED",
            confirmedAt: { not: null },
          },
          // Auto-release time passed
          {
            status: "AWAITING_CONFIRMATION",
            autoReleaseAt: { lte: now },
          },
        ],
      },
      include: {
        seller: {
          select: {
            id: true,
            whopUserId: true,
            name: true,
          },
        },
        buyer: {
          select: {
            id: true,
          },
        },
      },
    });

    if (readySessions.length === 0) {
      return NextResponse.json({
        message: "No sessions ready for payout",
        processed: 0,
      });
    }

    const results: Array<{
      sessionId: string;
      status: "success" | "failed";
      payoutId?: string;
      error?: string;
    }> = [];

    for (const session of readySessions) {
      try {
        // Skip if seller doesn't have whopUserId (can't receive payouts)
        if (!session.seller.whopUserId) {
          results.push({
            sessionId: session.id,
            status: "failed",
            error: "Seller has no Whop account",
          });
          continue;
        }

        // Calculate payout amount
        const sessionValue = session.pricePerUnit
          ? session.units * session.pricePerUnit
          : 0;

        if (sessionValue === 0) {
          results.push({
            sessionId: session.id,
            status: "failed",
            error: "Session has no value",
          });
          continue;
        }

        // Get community fee if applicable
        // For now, use default - in production, look up from original purchase
        const communityFeeBps = DEFAULT_COMMUNITY_FEE_BPS;

        const platformFee = calculatePlatformFee(sessionValue);
        const communityFee = calculateCommunityFee(sessionValue, communityFeeBps);
        const sellerReceives = sessionValue - platformFee - communityFee;

        // Create idempotency key from session ID
        const idempotencyKey = `payout-${session.id}`;

        // Process within transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create payout record first
          const payout = await tx.payout.create({
            data: {
              sellerId: session.seller.id,
              amount: sellerReceives,
              currency: "USD",
              status: "PROCESSING",
            },
          });

          // Call Whop to create transfer
          const transfer = await createPayoutTransfer({
            recipientUserId: session.seller.whopUserId!,
            amountCents: sellerReceives,
            description: `Waliet session payout - ${session.units / 2} hour${session.units > 2 ? "s" : ""}`,
            idempotencyKey,
            metadata: {
              sessionId: session.id,
              payoutId: payout.id,
            },
          });

          // Update payout with transfer ID
          await tx.payout.update({
            where: { id: payout.id },
            data: {
              whopTransferId: transfer.transferId,
              status: transfer.status === "completed" ? "COMPLETED" : "PROCESSING",
              processedAt: transfer.status === "completed" ? new Date() : null,
            },
          });

          // Update session to PAID_OUT and link payout
          await tx.session.update({
            where: { id: session.id },
            data: {
              status: "PAID_OUT",
              payoutId: payout.id,
              // If auto-released, set confirmedAt now
              confirmedAt: session.confirmedAt || new Date(),
            },
          });

          // Update seller stats
          await tx.sellerProfile.update({
            where: { userId: session.seller.id },
            data: {
              totalSessionsCompleted: { increment: 1 },
              totalHoursDelivered: { increment: session.units / 2 },
            },
          });

          return { payout, transfer };
        });

        results.push({
          sessionId: session.id,
          status: "success",
          payoutId: result.payout.id,
        });
      } catch (error) {
        console.error(`Error processing payout for session ${session.id}:`, error);
        results.push({
          sessionId: session.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successful = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      message: `Processed ${successful} payouts, ${failed} failed`,
      processed: successful,
      failed,
      results,
    });
  } catch (error) {
    console.error("Error in payout processing:", error);
    return NextResponse.json(
      { error: "Payout processing failed" },
      { status: 500 }
    );
  }
}
