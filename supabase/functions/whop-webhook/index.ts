import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { safeLog, safeError, truncateId } from "../_shared/logging.ts";

// Webhooks don't need browser CORS - they're server-to-server
const webhookHeaders = {
  "Content-Type": "application/json",
};

// Verify Whop webhook signature - REQUIRED in production
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!secret) {
    safeError("WHOP_WEBHOOK_SECRET not configured - webhook signature verification disabled");
    return true; // Allow during development if no secret configured
  }
  
  if (!signature) {
    safeError("No signature provided in webhook request");
    return false; // Reject unsigned webhooks in production
  }
  
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    
    // Support both raw and prefixed signature formats
    const isValid = signature === expectedSignature || signature === `sha256=${expectedSignature}`;
    
    if (!isValid) {
      safeError("Invalid webhook signature");
    }
    
    return isValid;
  } catch (err) {
    safeError("Signature verification error", err);
    return false;
  }
}

Deno.serve(async (req) => {
  // Webhooks don't need CORS preflight handling - but keep for compatibility
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("WHOP_WEBHOOK_SECRET") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const signature = req.headers.get("whop-signature");
    
    // Verify signature - reject invalid signatures
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: webhookHeaders,
      });
    }

    const payload = JSON.parse(rawBody);
    
    // Log without sensitive data
    const { type, data } = payload;
    const action = type || payload.action;
    
    safeLog("Whop webhook received", { 
      action, 
      hasData: !!data,
      membershipId: data?.membership?.id ? truncateId(data.membership.id) : null 
    });

    // Handle payment.succeeded events
    if (action === "payment.succeeded") {
      const payment = data;
      const metadata = payment.metadata || {};
      const paymentType = metadata.type;
      const brandId = metadata.brand_id;

      safeLog("Payment succeeded", { 
        type: paymentType, 
        brandId: truncateId(brandId) 
      });

      // Handle brand wallet top-up
      if (paymentType === "brand_wallet_topup") {
        const amount = metadata.amount;

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
          safeError("Error updating transaction", txError);
        }

        safeLog("Brand wallet top-up completed", { brandId: truncateId(brandId), amount });

        return new Response(JSON.stringify({ success: true, type: "brand_wallet_topup" }), {
          headers: webhookHeaders,
        });
      }

      // Handle subscription payment (brand plan purchase)
      if (paymentType === "subscription" && brandId) {
        const planId = payment.plan?.id;
        const membershipId = payment.membership?.id;

        let subscriptionPlan = planId || payment.product?.title || "active";

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
          safeError("Error updating brand subscription", updateError);
          throw updateError;
        }

        safeLog("Brand subscription updated", { 
          brandId: truncateId(brandId), 
          plan: subscriptionPlan 
        });

        return new Response(JSON.stringify({ success: true, type: "subscription", plan: subscriptionPlan }), {
          headers: webhookHeaders,
        });
      }

      // Handle generic payment with brand_id (fallback)
      if (brandId && payment.plan?.id) {
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
          safeError("Error updating brand", updateError);
        }

        return new Response(JSON.stringify({ success: true, type: "payment" }), {
          headers: webhookHeaders,
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
        safeLog("Processing boost top-up", { boostId: truncateId(boostId), amount: topupAmount });
        
        const { data: boost, error: boostError } = await supabase
          .from("bounty_campaigns")
          .select("budget")
          .eq("id", boostId)
          .single();

        if (boostError) {
          safeError("Error fetching boost", boostError);
          throw boostError;
        }

        const currentBudget = boost?.budget || 0;
        const newBudget = currentBudget + Number(topupAmount);

        const { error: updateError } = await supabase
          .from("bounty_campaigns")
          .update({ budget: newBudget })
          .eq("id", boostId);

        if (updateError) {
          safeError("Error updating boost budget", updateError);
          throw updateError;
        }

        safeLog("Boost budget updated", { boostId: truncateId(boostId), newBudget });
        
        return new Response(JSON.stringify({ success: true, type: "boost_topup" }), {
          headers: webhookHeaders,
        });
      }

      // Handle brand subscription
      if (!brandId) {
        safeError("No brand_id in membership metadata");
        return new Response(JSON.stringify({ error: "Missing brand_id" }), {
          status: 400,
          headers: webhookHeaders,
        });
      }

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
        safeError("Error updating brand subscription", updateError);
        throw updateError;
      }

      safeLog("Brand subscription activated", { brandId: truncateId(brandId) });
    }

    // Handle cancellation/expiration/deactivation
    if (action === "membership.went_invalid" || action === "membership.cancelled" || action === "membership.deactivated") {
      const membership = data;
      const metadata = membership.metadata || {};
      const brandId = metadata.brand_id;

      safeLog("Processing membership deactivation", { 
        action, 
        brandId: truncateId(brandId), 
        membershipId: truncateId(membership.id) 
      });

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
          safeError("Error deactivating brand subscription", updateError);
        } else {
          safeLog("Brand subscription deactivated", { brandId: truncateId(brandId) });
        }
      } else {
        // Try to find brand by whop_membership_id if no metadata
        const membershipId = membership.id;
        if (membershipId) {
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
              safeError("Error deactivating brand subscription", updateError);
            } else {
              safeLog("Brand subscription deactivated via membership lookup", { 
                brandId: truncateId(brand.id) 
              });
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true, type: "membership_deactivated" }), {
        headers: webhookHeaders,
      });
    }

    // Handle account onboarding completion
    if (action === "account.updated") {
      const account = data;
      
      if (account.payouts_enabled) {
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

          safeLog("Brand onboarding marked complete", { brandId: truncateId(brand.id) });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: webhookHeaders,
    });
  } catch (error: unknown) {
    safeError("Webhook error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: webhookHeaders }
    );
  }
});
