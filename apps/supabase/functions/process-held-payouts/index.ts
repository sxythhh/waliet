import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

/**
 * Process Held Payouts - Daily cron job (midnight UTC)
 *
 * This function releases held payments when:
 * 1. The holding period has expired (release_at <= now())
 * 2. The minimum payout threshold is met (sum of held amounts >= minimum_amount)
 * OR
 * 3. The boost has ended (auto-release below minimum)
 */

interface HeldPayment {
  id: string;
  user_id: string;
  source_id: string;
  source_type: string;
  accrued_amount: number;
  paid_amount: number;
  release_at: string | null;
}

interface BoostWithSettings {
  id: string;
  brand_id: string;
  end_date: string | null;
  status: string;
  payout_minimum_amount: number | null;
}

interface UserProfile {
  id: string;
  email?: string;
  username?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[process-held-payouts] Starting held payout processing...');

    const now = new Date().toISOString();

    // Find all held payments that are ready to release (release_at <= now)
    const { data: eligiblePayments, error: paymentsError } = await supabase
      .from('payment_ledger')
      .select('id, user_id, source_id, source_type, accrued_amount, paid_amount, release_at')
      .eq('status', 'held')
      .lte('release_at', now);

    if (paymentsError) {
      console.error('[process-held-payouts] Error fetching held payments:', paymentsError);
      throw paymentsError;
    }

    if (!eligiblePayments || eligiblePayments.length === 0) {
      console.log('[process-held-payouts] No eligible held payments found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No held payments ready for release',
        released: 0,
        totalAmount: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-held-payouts] Found ${eligiblePayments.length} eligible held payments`);

    // Get unique boost IDs to fetch their settings
    const boostIds = [...new Set(
      eligiblePayments
        .filter((p: HeldPayment) => p.source_type === 'boost')
        .map((p: HeldPayment) => p.source_id)
    )];

    // Fetch boost settings
    const boostSettings: Record<string, BoostWithSettings> = {};
    if (boostIds.length > 0) {
      const { data: boosts } = await supabase
        .from('bounty_campaigns')
        .select('id, brand_id, end_date, status, payout_minimum_amount')
        .in('id', boostIds);

      for (const boost of boosts || []) {
        boostSettings[boost.id] = boost;
      }

      // Fetch brand defaults for boosts that don't have overrides
      const brandIds = [...new Set((boosts || []).map((b: any) => b.brand_id))];
      if (brandIds.length > 0) {
        const { data: brands } = await supabase
          .from('brands')
          .select('id, owner_id')
          .in('id', brandIds);

        const ownerIds = (brands || []).map((b: any) => b.owner_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, payout_minimum_amount')
          .in('id', ownerIds);

        const brandToOwner: Record<string, string> = {};
        for (const brand of brands || []) {
          brandToOwner[brand.id] = brand.owner_id;
        }

        const ownerSettings: Record<string, number> = {};
        for (const profile of profiles || []) {
          ownerSettings[profile.id] = profile.payout_minimum_amount || 0;
        }

        // Fill in brand defaults for boosts without overrides
        for (const boostId of Object.keys(boostSettings)) {
          const boost = boostSettings[boostId];
          if (boost.payout_minimum_amount === null) {
            const ownerId = brandToOwner[boost.brand_id];
            boost.payout_minimum_amount = ownerSettings[ownerId] || 0;
          }
        }
      }
    }

    // Group payments by user and boost for minimum threshold checking
    const paymentsByUserAndBoost: Record<string, HeldPayment[]> = {};
    for (const payment of eligiblePayments as HeldPayment[]) {
      const key = `${payment.user_id}:${payment.source_id}`;
      if (!paymentsByUserAndBoost[key]) {
        paymentsByUserAndBoost[key] = [];
      }
      paymentsByUserAndBoost[key].push(payment);
    }

    // Track results
    const results = {
      released: 0,
      skippedMinimum: 0,
      totalAmount: 0,
      usersNotified: new Set<string>(),
    };

    // Process each user+boost group
    for (const [key, payments] of Object.entries(paymentsByUserAndBoost)) {
      const [userId, boostId] = key.split(':');
      const boost = boostSettings[boostId];

      // Calculate total pending amount for this user+boost
      const totalAmount = payments.reduce((sum, p) => {
        return sum + Math.max(0, Number(p.accrued_amount) - Number(p.paid_amount));
      }, 0);

      // Check minimum threshold
      const minimumAmount = boost?.payout_minimum_amount || 0;
      const boostEnded = boost?.end_date ? new Date(boost.end_date) < new Date() : false;
      const boostClosed = boost?.status === 'completed' || boost?.status === 'cancelled';

      // Release if:
      // 1. Amount meets minimum, OR
      // 2. Boost has ended (auto-release below minimum), OR
      // 3. No minimum set (0)
      const shouldRelease =
        totalAmount >= minimumAmount ||
        boostEnded ||
        boostClosed ||
        minimumAmount === 0;

      if (!shouldRelease) {
        console.log(`[process-held-payouts] Skipping user ${userId} for boost ${boostId}: $${totalAmount.toFixed(2)} < $${minimumAmount} minimum`);
        results.skippedMinimum += payments.length;
        continue;
      }

      // Release the payments - transition from 'held' to 'pending'
      const paymentIds = payments.map(p => p.id);
      const { error: updateError } = await supabase
        .from('payment_ledger')
        .update({
          status: 'pending',
          // Clear release_at since it's no longer held
        })
        .in('id', paymentIds)
        .eq('status', 'held'); // Optimistic lock

      if (updateError) {
        console.error(`[process-held-payouts] Error releasing payments for user ${userId}:`, updateError);
        continue;
      }

      console.log(`[process-held-payouts] Released ${payments.length} payments for user ${userId}: $${totalAmount.toFixed(2)}`);
      results.released += payments.length;
      results.totalAmount += totalAmount;
      results.usersNotified.add(userId);
    }

    // Send email notifications to users whose payments were released
    if (results.usersNotified.size > 0) {
      const userIds = Array.from(results.usersNotified);

      // Fetch user emails
      const { data: users } = await supabase.auth.admin.listUsers();
      const userEmails: Record<string, string> = {};
      for (const user of users?.users || []) {
        if (userIds.includes(user.id) && user.email) {
          userEmails[user.id] = user.email;
        }
      }

      // Calculate total released per user
      const amountPerUser: Record<string, number> = {};
      for (const [key, payments] of Object.entries(paymentsByUserAndBoost)) {
        const [userId] = key.split(':');
        if (!results.usersNotified.has(userId)) continue;

        const total = payments.reduce((sum, p) => {
          return sum + Math.max(0, Number(p.accrued_amount) - Number(p.paid_amount));
        }, 0);
        amountPerUser[userId] = (amountPerUser[userId] || 0) + total;
      }

      // Queue email notifications (would integrate with email service)
      for (const userId of userIds) {
        const email = userEmails[userId];
        const amount = amountPerUser[userId] || 0;

        if (email && amount > 0) {
          console.log(`[process-held-payouts] Would send email to ${email}: $${amount.toFixed(2)} released`);

          // Insert notification record for the email service to pick up
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              type: 'payout_released',
              title: 'Earnings Released',
              message: `$${amount.toFixed(2)} is now available in your wallet`,
              data: { amount: amount.toFixed(2) },
            })
            .catch(err => console.error('Failed to create notification:', err));
        }
      }
    }

    console.log(`[process-held-payouts] Completed: released ${results.released} payments, total $${results.totalAmount.toFixed(2)}, notified ${results.usersNotified.size} users, skipped ${results.skippedMinimum} below minimum`);

    return new Response(JSON.stringify({
      success: true,
      message: `Released ${results.released} held payments`,
      released: results.released,
      totalAmount: results.totalAmount.toFixed(2),
      usersNotified: results.usersNotified.size,
      skippedMinimum: results.skippedMinimum,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[process-held-payouts] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
