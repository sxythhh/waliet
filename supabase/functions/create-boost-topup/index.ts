import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Whop company ID for Virality
const WHOP_COMPANY_ID = "biz_QjHKs1kOH9Sxrl";

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

    console.log(`Creating checkout configuration for boost ${boostId} with amount $${amount}`);

    // Create checkout configuration with dynamic one-time plan
    const checkoutResponse = await fetch("https://api.whop.com/api/v5/checkout_configurations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${whopApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan: {
          company_id: WHOP_COMPANY_ID,
          currency: "usd",
          plan_type: "one_time",
          initial_price: amount,
          visibility: "hidden",
          product: {
            external_identifier: `boost_topup_${boostId}`,
            title: `Boost Top-Up: ${boost.title}`,
          }
        },
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
        checkoutUrl: checkoutData.url,
        sessionId: checkoutData.id,
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
