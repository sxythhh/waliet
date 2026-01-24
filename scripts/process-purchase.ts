import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const purchaseId = process.argv[2];

  if (!purchaseId) {
    // List purchases
    const purchases = await prisma.purchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        buyer: { select: { id: true, name: true, email: true } },
      },
    });
    console.log("\nRecent purchases:");
    for (const p of purchases) {
      const seller = await prisma.user.findUnique({
        where: { id: p.sellerId },
        select: { id: true, name: true, email: true },
      });
      console.log(`  ${p.id} | ${p.status} | ${p.units} units | $${p.totalAmount / 100}`);
      console.log(`    Buyer: ${p.buyer.name || p.buyer.email || p.buyer.id}`);
      console.log(`    Seller: ${seller?.name || seller?.email || p.sellerId}`);
    }
    return;
  }

  // Process specific purchase
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
  });

  if (!purchase) {
    console.error("Purchase not found:", purchaseId);
    return;
  }

  console.log("Processing purchase:", purchaseId);
  console.log("  Status:", purchase.status);
  console.log("  Units:", purchase.units);
  console.log("  Total:", purchase.totalAmount / 100);

  if (purchase.status === "COMPLETED") {
    console.log("\nPurchase already completed!");
    return;
  }

  // Process the purchase
  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        status: "COMPLETED",
        whopPaymentId: `dev_${Date.now()}`,
      },
    });

    const existingBalance = await tx.walletBalance.findUnique({
      where: {
        holderId_sellerId: {
          holderId: purchase.buyerId,
          sellerId: purchase.sellerId,
        },
      },
    });

    if (existingBalance) {
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
      console.log(`\nUpdated wallet balance: ${totalUnits} units`);
    } else {
      await tx.walletBalance.create({
        data: {
          holderId: purchase.buyerId,
          sellerId: purchase.sellerId,
          balanceUnits: purchase.units,
          avgPurchasePricePerUnit: purchase.pricePerUnit,
          totalPaid: purchase.totalAmount,
        },
      });
      console.log(`\nCreated wallet balance: ${purchase.units} units`);
    }
  });

  console.log("Purchase processed successfully!");
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
