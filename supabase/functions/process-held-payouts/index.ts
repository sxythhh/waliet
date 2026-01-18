// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Daily cron job to process held payouts.
 * Runs at midnight UTC to release eligible held funds.
 *
 * Release conditions:
 * 1. release_at timestamp has passed
 * 2. For minimum thresholds: Combined held amount meets the minimum
 * 3. Auto-release when boost ends (regardless of minimum)
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    const processedPayments: any[] = [];
    const notifications: any[] = [];

    // 1. Get all held payments where release_at has passed
    const { data: eligiblePayments, error: queryError } = await supabase
      .from("payment_ledger")
      .select(`
        id,
        user_id,
        pending_cents,
        source_type,
        source_id,
        release_at,
        video_submission_id,
        boost_submission_id
      `)
      .eq("status", "held")
      .lte("release_at", now);

    if (queryError) {
      console.error("Error querying held payments:", queryError);
      return new Response(
        JSON.stringify({ error: "Failed to query held payments" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!eligiblePayments || eligiblePayments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No eligible payments to release",
          released_count: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Group payments by user and boost to check minimums
    const paymentsByUserBoost = new Map<string, any[]>();

    for (const payment of eligiblePayments) {
      const key = `${payment.user_id}:${payment.source_id}`;
      if (!paymentsByUserBoost.has(key)) {
        paymentsByUserBoost.set(key, []);
      }
      paymentsByUserBoost.get(key)!.push(payment);
    }

    // Process each group
    for (const [key, payments] of paymentsByUserBoost) {
      const [userId, boostId] = key.split(":");
      const totalAmount = payments.reduce((sum, p) => sum + (p.pending_cents || 0), 0);

      // Get boost settings to check minimum
      const { data: boost, error: boostError } = await supabase
        .from("bounty_campaigns")
        .select(`
          id,
          status,
          payout_minimum_amount,
          brand_id,
          profiles!bounty_campaigns_brand_id_fkey (
            payout_minimum_amount
          )
        `)
        .eq("id", boostId)
        .single();

      if (boostError) {
        console.error(`Error fetching boost ${boostId}:`, boostError);
        continue;
      }

      // Determine minimum (boost override or brand default)
      const minimumAmountCents =
        (boost?.payout_minimum_amount ?? boost?.profiles?.payout_minimum_amount ?? 0) * 100;

      // Check if boost has ended (auto-release regardless of minimum)
      const boostEnded = boost?.status === "completed" || boost?.status === "cancelled";

      // Release if minimum met OR boost has ended
      const shouldRelease = totalAmount >= minimumAmountCents || boostEnded;

      if (shouldRelease) {
        // Update all payments in this group to 'locked' status
        const paymentIds = payments.map((p) => p.id);

        const { error: updateError } = await supabase
          .from("payment_ledger")
          .update({
            status: "locked",
            release_at: null,
            updated_at: now,
          })
          .in("id", paymentIds);

        if (updateError) {
          console.error("Error updating payments:", updateError);
          continue;
        }

        processedPayments.push(...payments);

        // Queue notification for this user
        notifications.push({
          user_id: userId,
          amount_cents: totalAmount,
          boost_id: boostId,
          payment_count: payments.length,
        });
      }
    }

    // 2. Also check for payments where boost has ended but minimum not met
    // These should auto-release regardless
    const { data: endedBoostPayments, error: endedError } = await supabase
      .from("payment_ledger")
      .select(`
        id,
        user_id,
        pending_cents,
        source_type,
        source_id,
        bounty_campaigns!payment_ledger_source_id_fkey (
          status
        )
      `)
      .eq("status", "held")
      .in("bounty_campaigns.status", ["completed", "cancelled"]);

    if (!endedError && endedBoostPayments && endedBoostPayments.length > 0) {
      const endedPaymentIds = endedBoostPayments.map((p) => p.id);

      const { error: updateEndedError } = await supabase
        .from("payment_ledger")
        .update({
          status: "locked",
          release_at: null,
          updated_at: now,
        })
        .in("id", endedPaymentIds);

      if (!updateEndedError) {
        processedPayments.push(...endedBoostPayments);
      }
    }

    // Send email notifications for released payments
    for (const notification of notifications) {
      try {
        await supabase.functions.invoke("notify-payout-release", {
          body: {
            user_id: notification.user_id,
            amount_cents: notification.amount_cents,
            boost_id: notification.boost_id,
            payment_count: notification.payment_count,
          },
        });
      } catch (emailError) {
        console.error("Error sending notification:", emailError);
        // Continue processing, don't fail the whole job
      }
    }

    // Calculate totals
    const totalAmountReleased = processedPayments.reduce(
      (sum, p) => sum + (p.pending_cents || 0),
      0
    );

    return new Response(
      JSON.stringify({
        success: true,
        released_count: processedPayments.length,
        total_amount_cents: totalAmountReleased,
        notifications_sent: notifications.length,
        processed_at: now,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-held-payouts:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
