import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDualAuthUser } from "@/lib/dual-auth";

export async function GET() {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all active sellers
    const sellers = await prisma.sellerProfile.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        hourlyRate: true,
        bio: true,
        tagline: true,
        averageRating: true,
        totalSessionsCompleted: true,
        totalReviews: true,
        isVerified: true,
        isActive: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match SellerData format
    const transformedSellers = sellers.map((seller) => ({
      id: seller.id,
      userId: seller.user.id,
      hourlyRate: seller.hourlyRate,
      bio: seller.bio,
      tagline: seller.tagline,
      averageRating: seller.averageRating,
      totalSessionsCompleted: seller.totalSessionsCompleted,
      totalReviews: seller.totalReviews,
      isVerified: seller.isVerified,
      isActive: seller.isActive,
      hasSellerProfile: true,
      user: seller.user,
    }));

    return NextResponse.json({
      sellers: transformedSellers,
      nextCursor: null,
    });
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return NextResponse.json(
      { error: "Failed to fetch sellers" },
      { status: 500 }
    );
  }
}
