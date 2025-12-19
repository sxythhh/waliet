import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("Whop webhook received:", JSON.stringify(payload));

    const { action, data } = payload;

    // Handle payment events for brand wallet top-ups
    if (action === "payment.succeeded") {
      const payment = data;
      const metadata = payment.metadata || {};
      const type = metadata.type;

      // Handle brand wallet top-up
      if (type === "brand_wallet_topup") {
        const brandId = metadata.brand_id;
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

    // Handle cancellation/expiration
    if (action === "membership.went_invalid" || action === "membership.cancelled") {
      const membership = data;
      const metadata = membership.metadata || {};
      const brandId = metadata.brand_id;

      if (brandId) {
        const { error: updateError } = await supabase
          .from("brands")
          .update({
            subscription_status: "inactive",
          })
          .eq("id", brandId);

        if (updateError) {
          console.error("Error deactivating brand subscription:", updateError);
        }

        console.log(`Brand ${brandId} subscription deactivated`);
      }
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
