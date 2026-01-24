import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { getOrCreateUser, checkCompanyAdmin } from "@/lib/auth";
import { z } from "zod";

const resolveDisputeSchema = z.object({
  action: z.enum(["approve", "deny"]),
  amountApproved: z.number().int().min(0).optional(),
  reviewNotes: z.string().max(1000).optional(),
});

interface RouteParams {
  params: Promise<{ disputeId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: whopUserId } = await whopsdk.verifyUserToken(
      request.headers
    );

    const user = await getOrCreateUser(whopUserId);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { disputeId } = await params;

    const dispute = await prisma.refundRequest.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    // Only requester or admin can view
    if (dispute.requesterId !== user.id) {
      // Check if admin (for now, just check if user owns a company)
      // In production, you'd have a proper admin check
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ dispute });
  } catch (error) {
    console.error("Error fetching dispute:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispute" },
      { status: 500 }
    );
  }
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

    const { disputeId } = await params;
    const body = await request.json();
    const { action, amountApproved, reviewNotes } =
      resolveDisputeSchema.parse(body);

    const dispute = await prisma.refundRequest.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    // Only pending disputes can be resolved
    if (dispute.status !== "PENDING") {
      return NextResponse.json(
        { error: "Dispute already resolved" },
        { status: 400 }
      );
    }

    // Verify admin permissions
    // For now, check against PLATFORM_COMPANY_ID
    const platformCompanyId = process.env.PLATFORM_COMPANY_ID;
    if (!platformCompanyId) {
      return NextResponse.json(
        { error: "Platform not configured" },
        { status: 500 }
      );
    }

    const isAdmin = await checkCompanyAdmin(platformCompanyId, whopUserId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (action === "approve") {
      // Approve dispute - refund hours to buyer
      const result = await prisma.$transaction(async (tx) => {
        // Update dispute status
        const updatedDispute = await tx.refundRequest.update({
          where: { id: disputeId },
          data: {
            status: "APPROVED",
            amountApproved: amountApproved || dispute.amountRequested,
            reviewedBy: user.id,
            reviewNotes,
          },
        });

        // If there's a session, get session details to refund hours
        if (dispute.sessionId) {
          const session = await tx.session.findUnique({
            where: { id: dispute.sessionId },
          });

          if (session) {
            // Return hours to buyer's wallet
            await tx.walletBalance.upsert({
              where: {
                holderId_sellerId: {
                  holderId: session.buyerId,
                  sellerId: session.sellerId,
                },
              },
              create: {
                holderId: session.buyerId,
                sellerId: session.sellerId,
                balanceUnits: session.units,
                avgPurchasePricePerUnit: session.pricePerUnit || 0,
                totalPaid: 0,
              },
              update: {
                balanceUnits: { increment: session.units },
              },
            });

            // Update session status
            await tx.session.update({
              where: { id: dispute.sessionId },
              data: { status: "CANCELLED" },
            });
          }
        }

        return updatedDispute;
      });

      // TODO: Send notifications to both parties

      return NextResponse.json({
        dispute: result,
        message: "Dispute approved. Hours refunded to buyer.",
      });
    } else {
      // Deny dispute - proceed with payout to seller
      const result = await prisma.$transaction(async (tx) => {
        // Update dispute status
        const updatedDispute = await tx.refundRequest.update({
          where: { id: disputeId },
          data: {
            status: "DENIED",
            amountApproved: 0,
            reviewedBy: user.id,
            reviewNotes,
          },
        });

        // If there's a session, mark it as completed so payout can proceed
        if (dispute.sessionId) {
          await tx.session.update({
            where: { id: dispute.sessionId },
            data: {
              status: "COMPLETED",
              confirmedAt: new Date(),
            },
          });
        }

        return updatedDispute;
      });

      // TODO: Send notifications to both parties

      return NextResponse.json({
        dispute: result,
        message: "Dispute denied. Payout will proceed to seller.",
      });
    }
  } catch (error) {
    console.error("Error resolving dispute:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to resolve dispute" },
      { status: 500 }
    );
  }
}
