import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Whop company and product IDs for Virality
const WHOP_COMPANY_ID = "biz_bGWMYQMvhFMsn7";
const WHOP_PRODUCT_ID = "prod_GW1QvNtTpJFyGq";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const whopApiKey = Deno.env.get("WHOP_API_KEY");
    if (!whopApiKey) {
      throw new Error("WHOP_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { boostId, amount } = await req.json();
    
    if (!boostId) {
      throw new Error("Boost ID is required");
    }
    
    if (!amount || amount < 100) {
      throw new Error("Amount must be at least $100");
    }

    // Get boost details
    const { data: boost, error: boostError } = await supabase
      .from("bounty_campaigns")
      .select("id, title, brand_id")
      .eq("id", boostId)
      .single();

    if (boostError || !boost) {
      throw new Error("Boost not found");
    }

    // Verify user is a brand member
    const { data: membership, error: memberError } = await supabase
      .from("brand_members")
      .select("role")
      .eq("brand_id", boost.brand_id)
      .eq("user_id", user.id)
      .maybeSingle();

    // Also check admin role
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!membership && adminRole?.role !== "admin") {
      throw new Error("You must be a brand member to top up this boost");
    }

    // Get brand info
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("name, slug")
      .eq("id", boost.brand_id)
      .single();

    if (brandError || !brand) {
      throw new Error("Brand not found");
    }

    console.log(`Creating dynamic plan for boost ${boostId} with amount $${amount}`);

    // Create a dynamic one-time plan using Whop API v5
    const planResponse = await fetch("https://api.whop.com/v5/plans", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${whopApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: WHOP_COMPANY_ID,
        product_id: WHOP_PRODUCT_ID,
        plan_type: "one_time",
        title: `Boost Top-Up: ${boost.title} - $${amount}`,
        description: `Add $${amount} to your boost campaign "${boost.title}"`,
        initial_price: amount,
        visibility: "hidden",
        currency: "usd",
        unlimited_stock: true,
      }),
    });

    const planResponseText = await planResponse.text();
    console.log("Whop create plan response status:", planResponse.status);
    console.log("Whop create plan response:", planResponseText);

    if (!planResponse.ok) {
      console.error("Whop API error:", planResponseText);
      throw new Error(`Failed to create plan: ${planResponse.status}`);
    }

    const planData = JSON.parse(planResponseText);
    console.log("Created Whop plan:", planData.id);

    // Create checkout session with the dynamic plan
    const checkoutResponse = await fetch("https://api.whop.com/v2/checkout_sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${whopApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planData.id,
        redirect_url: `https://app.virality.gg/dashboard?workspace=${brand.slug}&tab=campaigns&topup=success&boostId=${boostId}`,
        metadata: {
          boost_id: boostId,
          brand_id: boost.brand_id,
          brand_slug: brand.slug,
          user_id: user.id,
          topup_amount: amount,
          type: "boost_topup",
        },
      }),
    });

    const checkoutText = await checkoutResponse.text();
    console.log("Whop checkout response status:", checkoutResponse.status);
    console.log("Whop checkout response:", checkoutText);

    if (!checkoutResponse.ok) {
      console.error("Whop checkout error:", checkoutText);
      throw new Error(`Failed to create checkout: ${checkoutResponse.status}`);
    }

    const checkoutData = JSON.parse(checkoutText);
    console.log("Whop checkout created:", checkoutData);

    return new Response(
      JSON.stringify({ 
        checkoutUrl: checkoutData.purchase_url || checkoutData.url,
        sessionId: checkoutData.id,
        planId: planData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating boost top-up:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
