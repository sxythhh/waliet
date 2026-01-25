import { db } from "./db";

/**
 * Merge two user accounts together
 * Transfers all data from sourceUser to targetUser, then deletes sourceUser
 *
 * Use case: User has two accounts (e.g., Whop app view + Google login)
 * and wants to merge them into one.
 *
 * Note: Unlike Prisma, Supabase JS client doesn't support transactions,
 * so these operations are sequential. In case of failure, partial state
 * may exist.
 */
export async function mergeAccounts(sourceUserId: string, targetUserId: string): Promise<void> {
  console.log("[AccountMerge] Starting merge:", { sourceUserId, targetUserId });

  // Validate users exist
  const [sourceUser, targetUser] = await Promise.all([
    db.user.findById(sourceUserId),
    db.user.findById(targetUserId),
  ]);

  if (!sourceUser) {
    throw new Error("Source user not found");
  }
  if (!targetUser) {
    throw new Error("Target user not found");
  }

  // 1. Update WalletBalance (as holder)
  await db.walletBalance.updateManyByHolderId(sourceUserId, { holderId: targetUserId });

  // 2. Update WalletBalance (as seller) - need to handle potential conflicts
  const sourceSellerBalances = await db.walletBalance.findBySellerId(sourceUserId);

  for (const balance of sourceSellerBalances) {
    // Check if target already has a balance with the same holder
    const existingBalance = await db.walletBalance.findByHolderAndSeller(
      balance.holderId,
      targetUserId
    );

    if (existingBalance) {
      // Merge the balances
      await db.walletBalance.update(existingBalance.id, {
        balanceUnits: existingBalance.balanceUnits + balance.balanceUnits,
        reservedUnits: existingBalance.reservedUnits + balance.reservedUnits,
        totalPaid: existingBalance.totalPaid + balance.totalPaid,
      });
      // Delete the source balance
      await db.walletBalance.delete(balance.id);
    } else {
      // Just update the seller ID
      await db.walletBalance.update(balance.id, { sellerId: targetUserId });
    }
  }

  // 3. Update Purchases
  await db.purchase.updateManyByBuyerId(sourceUserId, { buyerId: targetUserId });

  // 4. Update Sessions (as buyer)
  await db.session.updateManyByBuyerId(sourceUserId, { buyerId: targetUserId });

  // 5. Update Sessions (as seller)
  await db.session.updateManyBySellerId(sourceUserId, { sellerId: targetUserId });

  // 6. Update Reviews (as author)
  await db.review.updateManyByAuthorId(sourceUserId, { authorId: targetUserId });

  // 7. Update Reviews (as subject)
  await db.review.updateManyBySubjectId(sourceUserId, { subjectId: targetUserId });

  // 8. Update Payouts
  await db.payout.updateManyBySellerId(sourceUserId, { sellerId: targetUserId });

  // 9. Handle SellerProfile
  const sourceSellerProfile = await db.sellerProfile.findByUserId(sourceUserId);
  const targetSellerProfile = await db.sellerProfile.findByUserId(targetUserId);

  if (sourceSellerProfile) {
    if (targetSellerProfile) {
      // Both have seller profiles - merge stats into target, delete source
      await db.sellerProfile.update(targetSellerProfile.id, {
        totalSessionsCompleted:
          targetSellerProfile.totalSessionsCompleted +
          sourceSellerProfile.totalSessionsCompleted,
        totalHoursDelivered:
          targetSellerProfile.totalHoursDelivered +
          sourceSellerProfile.totalHoursDelivered,
        totalReviews:
          targetSellerProfile.totalReviews + sourceSellerProfile.totalReviews,
        // Use whichever profile has the higher rate or is more complete
        hourlyRate: Math.max(
          targetSellerProfile.hourlyRate,
          sourceSellerProfile.hourlyRate
        ),
        bio: targetSellerProfile.bio || sourceSellerProfile.bio,
        tagline: targetSellerProfile.tagline || sourceSellerProfile.tagline,
      });

      // Delete source seller profile
      await db.sellerProfile.delete(sourceSellerProfile.id);
    } else {
      // Only source has seller profile - transfer it to target
      await db.sellerProfile.updateByUserId(sourceUserId, { userId: targetUserId });
    }
  }

  // 10. Transfer provider IDs from source to target (if target doesn't have them)
  const updateData: { whopUserId?: string; supabaseUserId?: string; email?: string } = {};

  if (sourceUser.whopUserId && !targetUser.whopUserId) {
    updateData.whopUserId = sourceUser.whopUserId;
  }
  if (sourceUser.supabaseUserId && !targetUser.supabaseUserId) {
    updateData.supabaseUserId = sourceUser.supabaseUserId;
  }
  if (sourceUser.email && !targetUser.email) {
    updateData.email = sourceUser.email;
  }

  if (Object.keys(updateData).length > 0) {
    await db.user.update(targetUserId, updateData);
  }

  // 11. Delete the source user (cascade will handle some relations)
  await db.user.delete(sourceUserId);

  console.log("[AccountMerge] Merge completed successfully");
}

/**
 * Link a provider to an existing user (without merge)
 * Used when the provider account doesn't exist yet
 */
export async function linkProviderToUser(
  userId: string,
  provider: "whop" | "supabase",
  providerId: string,
  email?: string | null
): Promise<void> {
  const updateData: { whopUserId?: string; supabaseUserId?: string; email?: string } = {};

  if (provider === "whop") {
    updateData.whopUserId = providerId;
  } else {
    updateData.supabaseUserId = providerId;
  }

  if (email) {
    updateData.email = email;
  }

  await db.user.update(userId, updateData);

  console.log(`[AccountMerge] Linked ${provider} to user ${userId}`);
}
