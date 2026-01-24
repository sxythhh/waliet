import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import {
  setSellerCommissionRate,
  setCommunityCommissionRate,
  validateCommissionRates,
} from "@/lib/commissions";
import { DEFAULT_PLATFORM_FEE_BPS, DEFAULT_COMMUNITY_FEE_BPS } from "@/lib/utils";
import { z } from "zod";

// Schema for setting commission rates
const setCommissionSchema = z.object({
  targetType: z.enum(["seller", "community"]),
  targetId: z.string().min(1),
  feeType: z.enum(["platform", "community"]),
  newBps: z.number().int().min(0).max(9000).nullable(),
  reason: z.string().max(500).optional(),
});

/**
 * GET /api/admin/commissions
 * List all custom commission rates
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: whopUserId } = await whopsdk.verifyUserToken(request.headers);

    // Get user and verify admin status
    const user = await prisma.user.findUnique({
      where: { whopUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all custom commission rates
    const [sellersWithCustomRates, communitiesWithCustomRates, recentChanges] = await Promise.all([
      // Sellers with custom rates
      prisma.sellerProfile.findMany({
        where: {
          OR: [
            { customPlatformFeeBps: { not: null } },
            { customCommunityFeeBps: { not: null } },
          ],
        },
        select: {
          id: true,
          customPlatformFeeBps: true,
          customCommunityFeeBps: true,
          commissionNotes: true,
          commissionUpdatedAt: true,
          commissionUpdatedBy: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { commissionUpdatedAt: "desc" },
      }),
      // Communities with custom rates
      prisma.communityConfig.findMany({
        where: {
          OR: [
            { customPlatformFeeBps: { not: null } },
            { communityFeeBps: { not: DEFAULT_COMMUNITY_FEE_BPS } },
          ],
        },
        select: {
          id: true,
          whopCompanyId: true,
          customPlatformFeeBps: true,
          communityFeeBps: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      // Recent commission changes
      prisma.commissionChange.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          sellerProfile: {
            select: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
          communityConfig: {
            select: {
              whopCompanyId: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      defaults: {
        platformFeeBps: DEFAULT_PLATFORM_FEE_BPS,
        communityFeeBps: DEFAULT_COMMUNITY_FEE_BPS,
      },
      sellers: sellersWithCustomRates.map((s) => ({
        id: s.id,
        userId: s.user.id,
        userName: s.user.name,
        userEmail: s.user.email,
        customPlatformFeeBps: s.customPlatformFeeBps,
        customCommunityFeeBps: s.customCommunityFeeBps,
        notes: s.commissionNotes,
        updatedAt: s.commissionUpdatedAt,
        updatedBy: s.commissionUpdatedBy,
      })),
      communities: communitiesWithCustomRates.map((c) => ({
        id: c.id,
        whopCompanyId: c.whopCompanyId,
        customPlatformFeeBps: c.customPlatformFeeBps,
        communityFeeBps: c.communityFeeBps,
      })),
      recentChanges: recentChanges.map((c) => ({
        id: c.id,
        targetType: c.sellerProfileId ? "seller" : "community",
        targetId: c.sellerProfileId || c.communityConfigId,
        targetName: c.sellerProfile?.user?.name || c.communityConfig?.whopCompanyId || "Unknown",
        feeType: c.feeType,
        previousBps: c.previousBps,
        newBps: c.newBps,
        reason: c.reason,
        changedBy: c.changedBy,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching commissions:", error);
    return NextResponse.json({ error: "Failed to fetch commissions" }, { status: 500 });
  }
}

/**
 * POST /api/admin/commissions
 * Set commission rate for seller or community
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: whopUserId } = await whopsdk.verifyUserToken(request.headers);

    // Get user and verify admin status
    const user = await prisma.user.findUnique({
      where: { whopUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { targetType, targetId, feeType, newBps, reason } = setCommissionSchema.parse(body);

    // Validate the new rate
    if (newBps !== null) {
      // Get current rates to validate total
      if (targetType === "seller") {
        const sellerProfile = await prisma.sellerProfile.findUnique({
          where: { id: targetId },
          select: {
            customPlatformFeeBps: true,
            customCommunityFeeBps: true,
          },
        });

        if (!sellerProfile) {
          return NextResponse.json({ error: "Seller profile not found" }, { status: 404 });
        }

        const platformBps = feeType === "platform" ? newBps : (sellerProfile.customPlatformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS);
        const communityBps = feeType === "community" ? newBps : (sellerProfile.customCommunityFeeBps ?? DEFAULT_COMMUNITY_FEE_BPS);

        const validation = validateCommissionRates(platformBps, communityBps);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
      } else {
        const communityConfig = await prisma.communityConfig.findUnique({
          where: { id: targetId },
          select: {
            customPlatformFeeBps: true,
            communityFeeBps: true,
          },
        });

        if (!communityConfig) {
          return NextResponse.json({ error: "Community config not found" }, { status: 404 });
        }

        const platformBps = feeType === "platform" ? newBps : (communityConfig.customPlatformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS);
        const communityBps = feeType === "community" ? newBps : communityConfig.communityFeeBps;

        const validation = validateCommissionRates(platformBps, communityBps);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
      }
    }

    // Apply the commission change
    if (targetType === "seller") {
      await setSellerCommissionRate(targetId, feeType, newBps, user.id, reason);
    } else {
      await setCommunityCommissionRate(targetId, feeType, newBps, user.id, reason);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting commission:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.issues }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to set commission" }, { status: 500 });
  }
}
