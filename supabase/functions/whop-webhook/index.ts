import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, whop-signature",
};

// Verify Whop webhook signature
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) {
    console.warn("No signature provided, skipping verification");
    return true; // Allow unsigned webhooks during development
  }
  
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("WHOP_WEBHOOK_SECRET") || "";
    const whopApiKey = Deno.env.get("WHOP_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const signature = req.headers.get("whop-signature");
    
    // Verify signature if secret is configured
    if (webhookSecret && !verifySignature(rawBody, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    console.log("Whop webhook received:", JSON.stringify(payload));

    // Whop uses "type" field in webhook payload
    const { type, data } = payload;
    // Also support legacy "action" field for backwards compatibility
    const action = type || payload.action;

    // Handle setup_intent.succeeded - save payment method and create topup
    if (action === "setup_intent.succeeded") {
      const setupIntent = data;
      const paymentMethodId = setupIntent.payment_method?.id;
      const memberId = setupIntent.member?.id;
      const companyId = setupIntent.company?.id;
      const metadata = setupIntent.metadata || {};
      const brandId = metadata.brand_id;
      const requestedAmount = metadata.amount;
      const userId = metadata.user_id;

      console.log(`Setup intent succeeded - brand_id: ${brandId}, member_id: ${memberId}, payment_method_id: ${paymentMethodId}, amount: ${requestedAmount}`);

      if (!brandId) {
        console.error("No brand_id in setup intent metadata");
        return new Response(JSON.stringify({ error: "Missing brand_id in metadata" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!paymentMethodId) {
        console.error("No payment method in setup intent");
        return new Response(JSON.stringify({ error: "No payment method in setup intent" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save payment method to brand record for future charges
      const { error: updateError } = await supabase
        .from("brands")
        .update({
          whop_member_id: memberId,
          whop_payment_method_id: paymentMethodId,
        })
        .eq("id", brandId);

      if (updateError) {
        console.error("Error saving payment method to brand:", updateError);
        throw updateError;
      }

      console.log(`Saved payment method ${paymentMethodId} to brand ${brandId}`);

      // If an amount was requested, create the topup now
      if (requestedAmount && Number(requestedAmount) > 0) {
        console.log(`Creating topup for $${requestedAmount} using payment method ${paymentMethodId}`);

        const topupResponse = await fetch("https://api.whop.com/api/v1/topups", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${whopApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Number(requestedAmount),
            company_id: companyId,
            currency: "usd",
            payment_method_id: paymentMethodId,
          }),
        });

        const topupText = await topupResponse.text();
        console.log("Topup response status:", topupResponse.status);
        console.log("Topup response:", topupText);

        if (!topupResponse.ok) {
          console.error("Failed to create topup:", topupText);
          // Still return success for webhook - payment method was saved
          return new Response(JSON.stringify({ 
            success: true, 
            type: "setup_intent.succeeded",
            payment_method_saved: true,
            topup_error: topupText,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const topupData = JSON.parse(topupText);
        console.log("Topup created:", topupData);

        // Record the transaction
        const { error: txError } = await supabase
          .from("brand_wallet_transactions")
          .insert({
            brand_id: brandId,
            type: "topup",
            amount: Number(requestedAmount),
            status: topupData.status === "paid" ? "completed" : "pending",
            description: `Wallet top-up: $${requestedAmount}`,
            whop_payment_id: topupData.id,
            metadata: {
              user_id: userId,
              payment_id: topupData.id,
              initiated_via: "webhook",
              initiated_at: new Date().toISOString(),
            },
            created_by: userId,
          });

        if (txError) {
          console.error("Error recording transaction:", txError);
        }

        console.log(`Brand ${brandId} wallet topped up with $${requestedAmount}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        type: "setup_intent.succeeded",
        payment_method_saved: true,
        topup_created: !!requestedAmount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle payment.succeeded events
    if (action === "payment.succeeded") {
      const payment = data;
      const metadata = payment.metadata || {};
      const paymentType = metadata.type;
      const brandId = metadata.brand_id;

      console.log(`Payment succeeded - type: ${paymentType}, brand_id: ${brandId}, plan: ${payment.plan?.id}`);

      // Handle brand wallet top-up
      if (paymentType === "brand_wallet_topup") {
        const amount = metadata.amount;

        console.log(`Processing brand wallet top-up: ${brandId} for $${amount}`);

        // Update pending transaction to completed
        const { error: txError } = await supabase
          .from("brand_wallet_transactions")
          .update({
            status: "completed",
            whop_payment_id: payment.id,
          })
          .eq("brand_id", brandId)
          .eq("type", "topup")
          .eq("status", "pending")
          .eq("amount", amount);

        if (txError) {
          console.error("Error updating transaction:", txError);
        }

        console.log(`Brand ${brandId} wallet top-up of $${amount} completed`);

        return new Response(JSON.stringify({ success: true, type: "brand_wallet_topup" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle subscription payment (brand plan purchase)
      if (paymentType === "subscription" && brandId) {
        const planId = payment.plan?.id;
        const productId = payment.product?.id;
        const productTitle = payment.product?.title;
        const membershipId = payment.membership?.id;
        const amount = payment.total || payment.usd_total;

        console.log(`Processing subscription payment for brand ${brandId}: plan=${planId}, product=${productTitle}, amount=${amount}`);

        // Determine subscription plan name from plan_id or product title
        // You can customize this mapping based on your Whop plan IDs
        let subscriptionPlan = planId || productTitle || "active";

        // Update brand subscription
        const { error: updateError } = await supabase
          .from("brands")
          .update({
            subscription_plan: subscriptionPlan,
            subscription_status: "active",
            whop_membership_id: membershipId,
            whop_manage_url: payment.membership?.manage_url || null,
            subscription_started_at: new Date().toISOString(),
          })
          .eq("id", brandId);

        if (updateError) {
          console.error("Error updating brand subscription:", updateError);
          throw updateError;
        }

        console.log(`Brand ${brandId} subscription updated to plan: ${subscriptionPlan}`);

        return new Response(JSON.stringify({ success: true, type: "subscription", plan: subscriptionPlan }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle generic payment with brand_id (fallback)
      if (brandId && payment.plan?.id) {
        console.log(`Processing generic payment for brand ${brandId}`);

        const { error: updateError } = await supabase
          .from("brands")
          .update({
            subscription_plan: payment.plan.id,
            subscription_status: "active",
            whop_membership_id: payment.membership?.id,
            whop_manage_url: payment.membership?.manage_url || null,
            subscription_started_at: new Date().toISOString(),
          })
          .eq("id", brandId);

        if (updateError) {
          console.error("Error updating brand:", updateError);
        }

        return new Response(JSON.stringify({ success: true, type: "payment" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle membership events
    if (action === "membership.went_valid" || action === "membership.created") {
      const membership = data;
      const metadata = membership.metadata || {};
      const brandId = metadata.brand_id;
      const boostId = metadata.boost_id;
      const topupAmount = metadata.topup_amount;
      const type = metadata.type;

      // Handle boost top-up payments
      if (type === "boost_topup" && boostId && topupAmount) {
        console.log(`Processing boost top-up: ${boostId} for $${topupAmount}`);
        
        // Get current boost budget
        const { data: boost, error: boostError } = await supabase
          .from("bounty_campaigns")
          .select("budget")
          .eq("id", boostId)
          .single();

        if (boostError) {
          console.error("Error fetching boost:", boostError);
          throw boostError;
        }

        const currentBudget = boost?.budget || 0;
        const newBudget = currentBudget + Number(topupAmount);

        // Update boost budget
        const { error: updateError } = await supabase
          .from("bounty_campaigns")
          .update({
            budget: newBudget,
          })
          .eq("id", boostId);

        if (updateError) {
          console.error("Error updating boost budget:", updateError);
          throw updateError;
        }

        console.log(`Boost ${boostId} budget updated: $${currentBudget} -> $${newBudget}`);
        
        return new Response(JSON.stringify({ success: true, type: "boost_topup" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle brand subscription
      if (!brandId) {
        console.error("No brand_id in membership metadata:", metadata);
        return new Response(JSON.stringify({ error: "Missing brand_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update brand subscription status
      const { error: updateError } = await supabase
        .from("brands")
        .update({
          subscription_plan: membership.plan_id,
          subscription_status: "active",
          whop_membership_id: membership.id,
          whop_manage_url: membership.manage_url || null,
          subscription_started_at: new Date().toISOString(),
          subscription_expires_at: membership.renewal_period_end || null,
        })
        .eq("id", brandId);

      if (updateError) {
        console.error("Error updating brand subscription:", updateError);
        throw updateError;
      }

      console.log(`Brand ${brandId} subscription activated`);
    }

    // Handle cancellation/expiration/deactivation
    if (action === "membership.went_invalid" || action === "membership.cancelled" || action === "membership.deactivated") {
      const membership = data;
      const metadata = membership.metadata || {};
      const brandId = metadata.brand_id;

      console.log(`Processing membership deactivation - action: ${action}, brand_id: ${brandId}, membership_id: ${membership.id}`);

      if (brandId) {
        const { error: updateError } = await supabase
          .from("brands")
          .update({
            subscription_status: "inactive",
            subscription_plan: null,
            subscription_expires_at: new Date().toISOString(),
          })
          .eq("id", brandId);

        if (updateError) {
          console.error("Error deactivating brand subscription:", updateError);
        } else {
          console.log(`Brand ${brandId} subscription deactivated and plan removed`);
        }
      } else {
        // Try to find brand by whop_membership_id if no metadata
        const membershipId = membership.id;
        if (membershipId) {
          console.log(`No brand_id in metadata, searching by whop_membership_id: ${membershipId}`);
          
          const { data: brand, error: findError } = await supabase
            .from("brands")
            .select("id")
            .eq("whop_membership_id", membershipId)
            .single();

          if (!findError && brand) {
            const { error: updateError } = await supabase
              .from("brands")
              .update({
                subscription_status: "inactive",
                subscription_plan: null,
                subscription_expires_at: new Date().toISOString(),
              })
              .eq("id", brand.id);

            if (updateError) {
              console.error("Error deactivating brand subscription:", updateError);
            } else {
              console.log(`Brand ${brand.id} subscription deactivated via membership_id lookup`);
            }
          } else {
            console.warn(`Could not find brand for membership ${membershipId}`);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, type: "membership_deactivated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle account onboarding completion
    if (action === "account.updated") {
      const account = data;
      
      // Check if onboarding is complete
      if (account.payouts_enabled) {
        // Find brand by whop_company_id
        const { data: brand, error: brandError } = await supabase
          .from("brands")
          .select("id")
          .eq("whop_company_id", account.id)
          .single();

        if (!brandError && brand) {
          await supabase
            .from("brands")
            .update({ whop_onboarding_complete: true })
            .eq("id", brand.id);

          console.log(`Brand ${brand.id} onboarding marked complete`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
