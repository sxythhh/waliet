import { prisma } from "@/lib/prisma";
import { DEFAULT_PLATFORM_FEE_BPS, DEFAULT_COMMUNITY_FEE_BPS, MAX_TOTAL_FEE_BPS } from "@/lib/utils";

export interface EffectiveCommissionRates {
  platformFeeBps: number;
  communityFeeBps: number;
  totalFeeBps: number;
  source: {
    platform: "seller" | "community" | "default";
    community: "seller" | "community" | "default";
  };
}

/**
 * Get effective commission rates for a seller in a community context
 * Priority: Seller-specific > Community-specific > Platform default
 */
export async function getEffectiveCommissionRates(
  sellerId: string,
  companyId?: string | null
): Promise<EffectiveCommissionRates> {
  // Fetch seller profile and community config in parallel
  const [sellerProfile, communityConfig] = await Promise.all([
    prisma.sellerProfile.findFirst({
      where: { userId: sellerId },
      select: {
        customPlatformFeeBps: true,
        customCommunityFeeBps: true,
      },
    }),
    companyId
      ? prisma.communityConfig.findUnique({
          where: { whopCompanyId: companyId },
          select: {
            customPlatformFeeBps: true,
            communityFeeBps: true,
          },
        })
      : null,
  ]);

  // Determine platform fee (seller override > community override > default)
  let platformFeeBps = DEFAULT_PLATFORM_FEE_BPS;
  let platformSource: "seller" | "community" | "default" = "default";

  if (sellerProfile?.customPlatformFeeBps !== null && sellerProfile?.customPlatformFeeBps !== undefined) {
    platformFeeBps = sellerProfile.customPlatformFeeBps;
    platformSource = "seller";
  } else if (communityConfig?.customPlatformFeeBps !== null && communityConfig?.customPlatformFeeBps !== undefined) {
    platformFeeBps = communityConfig.customPlatformFeeBps;
    platformSource = "community";
  }

  // Determine community fee (seller override > community config > default)
  let communityFeeBps = DEFAULT_COMMUNITY_FEE_BPS;
  let communitySource: "seller" | "community" | "default" = "default";

  if (sellerProfile?.customCommunityFeeBps !== null && sellerProfile?.customCommunityFeeBps !== undefined) {
    communityFeeBps = sellerProfile.customCommunityFeeBps;
    communitySource = "seller";
  } else if (communityConfig?.communityFeeBps !== null && communityConfig?.communityFeeBps !== undefined) {
    communityFeeBps = communityConfig.communityFeeBps;
    communitySource = "community";
  }

  return {
    platformFeeBps,
    communityFeeBps,
    totalFeeBps: platformFeeBps + communityFeeBps,
    source: {
      platform: platformSource,
      community: communitySource,
    },
  };
}

/**
 * Validate that total fees don't exceed maximum
 */
export function validateCommissionRates(platformBps: number, communityBps: number): { valid: boolean; error?: string } {
  if (platformBps < 0 || communityBps < 0) {
    return { valid: false, error: "Commission rates cannot be negative" };
  }

  if (platformBps > MAX_TOTAL_FEE_BPS) {
    return { valid: false, error: `Platform fee cannot exceed ${MAX_TOTAL_FEE_BPS / 100}%` };
  }

  if (communityBps > MAX_TOTAL_FEE_BPS) {
    return { valid: false, error: `Community fee cannot exceed ${MAX_TOTAL_FEE_BPS / 100}%` };
  }

  const total = platformBps + communityBps;
  if (total > MAX_TOTAL_FEE_BPS) {
    return { valid: false, error: `Total fees (${total / 100}%) cannot exceed ${MAX_TOTAL_FEE_BPS / 100}%` };
  }

  return { valid: true };
}

/**
 * Set custom commission rate for a seller
 */
export async function setSellerCommissionRate(
  sellerProfileId: string,
  feeType: "platform" | "community",
  newBps: number | null,
  changedBy: string,
  reason?: string
): Promise<void> {
  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
    select: {
      customPlatformFeeBps: true,
      customCommunityFeeBps: true,
    },
  });

  if (!sellerProfile) {
    throw new Error("Seller profile not found");
  }

  const previousBps = feeType === "platform"
    ? sellerProfile.customPlatformFeeBps
    : sellerProfile.customCommunityFeeBps;

  // Validate the new rate if setting (not clearing)
  if (newBps !== null) {
    const otherBps = feeType === "platform"
      ? (sellerProfile.customCommunityFeeBps ?? DEFAULT_COMMUNITY_FEE_BPS)
      : (sellerProfile.customPlatformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS);

    const validation = validateCommissionRates(
      feeType === "platform" ? newBps : otherBps,
      feeType === "community" ? newBps : otherBps
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  await prisma.$transaction([
    // Update the seller profile
    prisma.sellerProfile.update({
      where: { id: sellerProfileId },
      data: {
        ...(feeType === "platform"
          ? { customPlatformFeeBps: newBps }
          : { customCommunityFeeBps: newBps }
        ),
        commissionUpdatedAt: new Date(),
        commissionUpdatedBy: changedBy,
      },
    }),
    // Create audit log
    prisma.commissionChange.create({
      data: {
        sellerProfileId,
        feeType,
        previousBps,
        newBps,
        reason,
        changedBy,
      },
    }),
  ]);
}

/**
 * Set custom commission rate for a community
 */
export async function setCommunityCommissionRate(
  communityConfigId: string,
  feeType: "platform" | "community",
  newBps: number | null,
  changedBy: string,
  reason?: string
): Promise<void> {
  const communityConfig = await prisma.communityConfig.findUnique({
    where: { id: communityConfigId },
    select: {
      customPlatformFeeBps: true,
      communityFeeBps: true,
    },
  });

  if (!communityConfig) {
    throw new Error("Community config not found");
  }

  const previousBps = feeType === "platform"
    ? communityConfig.customPlatformFeeBps
    : communityConfig.communityFeeBps;

  // Validate the new rate
  if (newBps !== null) {
    const otherBps = feeType === "platform"
      ? communityConfig.communityFeeBps
      : (communityConfig.customPlatformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS);

    const validation = validateCommissionRates(
      feeType === "platform" ? newBps : otherBps,
      feeType === "community" ? newBps : otherBps
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  await prisma.$transaction([
    // Update the community config
    prisma.communityConfig.update({
      where: { id: communityConfigId },
      data: feeType === "platform"
        ? { customPlatformFeeBps: newBps }
        : { communityFeeBps: newBps ?? DEFAULT_COMMUNITY_FEE_BPS },
    }),
    // Create audit log
    prisma.commissionChange.create({
      data: {
        communityConfigId,
        feeType,
        previousBps,
        newBps,
        reason,
        changedBy,
      },
    }),
  ]);
}
