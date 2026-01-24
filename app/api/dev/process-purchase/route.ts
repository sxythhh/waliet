import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DEV ONLY: Manually process a pending purchase (simulates webhook)
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const { purchaseId } = await request.json();

    if (!purchaseId) {
      return NextResponse.json({ error: "purchaseId required" }, { status: 400 });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.status === "COMPLETED") {
      return NextResponse.json({ error: "Purchase already completed" }, { status: 400 });
    }

    // Process the purchase (same logic as webhook)
    await prisma.$transaction(async (tx) => {
      // Update purchase status
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: "COMPLETED",
          whopPaymentId: `dev_${Date.now()}`,
        },
      });

      // Get existing wallet balance
      const existingBalance = await tx.walletBalance.findUnique({
        where: {
          holderId_sellerId: {
            holderId: purchase.buyerId,
            sellerId: purchase.sellerId,
          },
        },
      });

      if (existingBalance) {
        // Calculate weighted average price
        const existingValue = existingBalance.balanceUnits * existingBalance.avgPurchasePricePerUnit;
        const newValue = purchase.units * purchase.pricePerUnit;
        const totalUnits = existingBalance.balanceUnits + purchase.units;
        const newAvgPrice = Math.round((existingValue + newValue) / totalUnits);

        await tx.walletBalance.update({
          where: {
            holderId_sellerId: {
              holderId: purchase.buyerId,
              sellerId: purchase.sellerId,
            },
          },
          data: {
            balanceUnits: totalUnits,
            avgPurchasePricePerUnit: newAvgPrice,
            totalPaid: { increment: purchase.totalAmount },
          },
        });
      } else {
        // Create new wallet balance
        await tx.walletBalance.create({
          data: {
            holderId: purchase.buyerId,
            sellerId: purchase.sellerId,
            balanceUnits: purchase.units,
            avgPurchasePricePerUnit: purchase.pricePerUnit,
            totalPaid: purchase.totalAmount,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Purchase ${purchaseId} completed, ${purchase.units} units added to wallet`
    });
  } catch (error) {
    console.error("Error processing purchase:", error);
    return NextResponse.json({ error: "Failed to process purchase" }, { status: 500 });
  }
}

// GET: List pending purchases
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const pendingPurchases = await prisma.purchase.findMany({
    where: { status: "PENDING" },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch seller info separately since Purchase doesn't have a direct seller relation
  const purchasesWithSellers = await Promise.all(
    pendingPurchases.map(async (purchase) => {
      const seller = await prisma.user.findUnique({
        where: { id: purchase.sellerId },
        select: { id: true, name: true, email: true },
      });
      return { ...purchase, seller };
    })
  );

  return NextResponse.json({ purchases: purchasesWithSellers });
}
