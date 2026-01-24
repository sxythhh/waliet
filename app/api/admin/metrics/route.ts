import { NextResponse } from "next/server";
import { getDualAuthUser } from "@/lib/dual-auth";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET() {
  try {
    // Verify admin access
    const auth = await getDualAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add proper admin role check here
    // For now, allow any authenticated user

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    // Total revenue from completed purchases
    const purchases = await prisma.purchase.findMany({
      where: { status: "COMPLETED" },
      select: { totalAmount: true, createdAt: true },
    });
    const totalRevenue = purchases.reduce((sum, p) => sum + p.totalAmount, 0) / 100; // Convert cents to dollars

    // Revenue for last 7 days
    const recentPurchases = purchases.filter(
      (p) => p.createdAt >= sevenDaysAgo
    );
    const currentPeriodRevenue = recentPurchases.reduce(
      (sum, p) => sum + p.totalAmount,
      0
    ) / 100;

    // Revenue for previous 7 days
    const prevPurchases = purchases.filter(
      (p) => p.createdAt >= fourteenDaysAgo && p.createdAt < sevenDaysAgo
    );
    const prevPeriodRevenue = prevPurchases.reduce(
      (sum, p) => sum + p.totalAmount,
      0
    ) / 100;

    const revenueChange =
      prevPeriodRevenue > 0
        ? ((currentPeriodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
        : currentPeriodRevenue > 0
        ? 100
        : 0;

    // Total users
    const totalUsers = await prisma.user.count();

    // Users created in last 30 days
    const newUsersThisMonth = await prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // Users created in previous 30 days
    const newUsersPrevMonth = await prisma.user.count({
      where: {
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    });

    const usersChange =
      newUsersPrevMonth > 0
        ? ((newUsersThisMonth - newUsersPrevMonth) / newUsersPrevMonth) * 100
        : newUsersThisMonth > 0
        ? 100
        : 0;

    // Active sellers (with active profile)
    const activeSellers = await prisma.sellerProfile.count({
      where: { isActive: true },
    });

    // Sellers change (compare last 30 days vs previous 30 days)
    const newSellersThisMonth = await prisma.sellerProfile.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const newSellersPrevMonth = await prisma.sellerProfile.count({
      where: {
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    });

    const sellersChange =
      newSellersPrevMonth > 0
        ? ((newSellersThisMonth - newSellersPrevMonth) / newSellersPrevMonth) * 100
        : newSellersThisMonth > 0
        ? 100
        : 0;

    // Pending payouts
    const pendingPayouts = await prisma.payout.findMany({
      where: { status: "PENDING" },
      select: { amount: true },
    });
    const pendingPayoutsCount = pendingPayouts.length;
    const pendingPayoutsAmount = pendingPayouts.reduce(
      (sum, p) => sum + p.amount,
      0
    ) / 100;

    // Session stats
    const totalSessions = await prisma.session.count();
    const completedSessions = await prisma.session.count({
      where: { status: "COMPLETED" },
    });
    const activeSessions = await prisma.session.count({
      where: { status: "IN_PROGRESS" },
    });
    const cancelledSessions = await prisma.session.count({
      where: { status: "CANCELLED" },
    });

    // Total purchases
    const totalPurchases = await prisma.purchase.count();

    // Average session value
    const avgSessionValue =
      purchases.length > 0
        ? purchases.reduce((sum, p) => sum + p.totalAmount, 0) /
          purchases.length /
          100
        : 0;

    // Average seller rating
    const sellersWithRatings = await prisma.sellerProfile.findMany({
      where: { averageRating: { not: null } },
      select: { averageRating: true },
    });
    const avgSellerRating =
      sellersWithRatings.length > 0
        ? sellersWithRatings.reduce((sum, s) => sum + (s.averageRating || 0), 0) /
          sellersWithRatings.length
        : 0;

    // New users today
    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: today } },
    });

    return NextResponse.json({
      metrics: {
        totalRevenue,
        revenueChange,
        totalUsers,
        usersChange,
        activeSellers,
        sellersChange,
        pendingPayouts: pendingPayoutsCount,
        pendingPayoutsAmount,
        totalSessions,
        completedSessions,
        activeSessions,
        cancelledSessions,
        totalPurchases,
        avgSessionValue,
        avgSellerRating,
        newUsersToday,
      },
    });
  } catch (error) {
    console.error("Error fetching admin metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
