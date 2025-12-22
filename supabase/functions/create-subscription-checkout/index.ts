import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price configuration
const PRICES = {
  starter: {
    monthly: "price_1Sh8JMDfOdvNUmh7noyK4Ajr",
    yearly: "price_1Sh8JMDfOdvNUmh7yQGGG0CM",
  },
  growth: {
    monthly: "price_1Sh8JeDfOdvNUmh7MHXY4LC8",
    yearly: "price_1Sh8KGDfOdvNUmh7jJCbNa6Y",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan_key, is_annual, brand_id } = await req.json();
    
    if (!plan_key || !brand_id) {
      throw new Error("plan_key and brand_id are required");
    }

    const planPrices = PRICES[plan_key as keyof typeof PRICES];
    if (!planPrices) {
      throw new Error("Invalid plan_key");
    }

    const priceId = is_annual ? planPrices.yearly : planPrices.monthly;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://virality.gg";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      metadata: {
        brand_id,
        user_id: user.id,
        plan_key,
        is_annual: is_annual ? "true" : "false",
      },
      ui_mode: "embedded",
      return_url: `${origin}/dashboard?workspace=${brand_id}&tab=profile&checkout=complete`,
    });

    return new Response(JSON.stringify({ 
      clientSecret: session.client_secret,
      sessionId: session.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
