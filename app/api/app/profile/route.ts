import { NextRequest, NextResponse } from "next/server";
import { getDualAuthUser } from "@/lib/dual-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user with createdAt field
    const user = await prisma.user.findUnique({
      where: { id: auth.dbUser.id },
      select: {
        id: true,
        name: true,
        avatar: true,
        email: true,
        bio: true,
        createdAt: true,
        sellerProfile: {
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
            timezone: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate additional stats for sellers
    let totalEarnings = 0;
    let totalClients = 0;

    if (user.sellerProfile) {
      // Get total earnings from completed sessions
      const completedSessions = await prisma.session.findMany({
        where: {
          sellerId: auth.dbUser.id,
          status: { in: ["COMPLETED", "RATED", "PAID_OUT"] },
        },
        select: {
          pricePerUnit: true,
          units: true,
          buyerId: true,
        },
      });

      totalEarnings = completedSessions.reduce(
        (sum, s) => sum + (s.pricePerUnit || 0) * s.units,
        0
      ) / 100; // Convert cents to dollars

      // Count unique clients
      const uniqueBuyers = new Set(completedSessions.map((s) => s.buyerId));
      totalClients = uniqueBuyers.size;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        bannerUrl: null, // TODO: Add to schema
        email: user.email,
        bio: user.bio,
        location: null, // TODO: Add to schema
        createdAt: user.createdAt.toISOString(),
        sellerProfile: user.sellerProfile
          ? {
              ...user.sellerProfile,
              hourlyRate: user.sellerProfile.hourlyRate / 100, // Convert cents to dollars
              totalEarnings,
              totalClients,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio } = body;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: auth.dbUser.id },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        email: true,
        bio: true,
        createdAt: true,
        sellerProfile: {
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
            timezone: true,
          },
        },
      },
    });

    // Calculate additional stats for sellers
    let totalEarnings = 0;
    let totalClients = 0;

    if (updatedUser.sellerProfile) {
      const completedSessions = await prisma.session.findMany({
        where: {
          sellerId: auth.dbUser.id,
          status: { in: ["COMPLETED", "RATED", "PAID_OUT"] },
        },
        select: {
          pricePerUnit: true,
          units: true,
          buyerId: true,
        },
      });

      totalEarnings = completedSessions.reduce(
        (sum, s) => sum + (s.pricePerUnit || 0) * s.units,
        0
      ) / 100;

      const uniqueBuyers = new Set(completedSessions.map((s) => s.buyerId));
      totalClients = uniqueBuyers.size;
    }

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        bannerUrl: null,
        email: updatedUser.email,
        bio: updatedUser.bio,
        location: null,
        createdAt: updatedUser.createdAt.toISOString(),
        sellerProfile: updatedUser.sellerProfile
          ? {
              ...updatedUser.sellerProfile,
              hourlyRate: updatedUser.sellerProfile.hourlyRate / 100,
              totalEarnings,
              totalClients,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
