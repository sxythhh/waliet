import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHOP_API_URL = "https://api.whop.com/api/v5";
const PLAN_ID = "plan_DU4ba3ik2UHVZ";

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

    const { brandId } = await req.json();
    if (!brandId) {
      throw new Error("Brand ID is required");
    }

    // Verify user is a brand member
    const { data: membership, error: memberError } = await supabase
      .from("brand_members")
      .select("role")
      .eq("brand_id", brandId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !membership) {
      throw new Error("You must be a brand member to subscribe");
    }

    // Get brand info for metadata
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("name, slug")
      .eq("id", brandId)
      .single();

    if (brandError || !brand) {
      throw new Error("Brand not found");
    }

    // Create Whop checkout session
    const response = await fetch(`${WHOP_API_URL}/checkout_sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${whopApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: PLAN_ID,
        redirect_url: `https://app.virality.gg/dashboard?workspace=${brand.slug}&subscription=success`,
        metadata: {
          brand_id: brandId,
          brand_slug: brand.slug,
          user_id: user.id,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Whop API error:", errorText);
      throw new Error(`Failed to create checkout session: ${response.status}`);
    }

    const checkoutData = await response.json();
    console.log("Whop checkout created:", checkoutData);

    return new Response(
      JSON.stringify({ 
        checkoutUrl: checkoutData.purchase_url || checkoutData.url,
        sessionId: checkoutData.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating Whop checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
