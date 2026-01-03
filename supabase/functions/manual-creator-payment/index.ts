import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client for user auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { brand_id, creator_id, amount, description } = await req.json();

    if (!brand_id || !creator_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is brand owner
    const { data: brandMember, error: memberError } = await supabaseAdmin
      .from("brand_members")
      .select("role, user_id")
      .eq("brand_id", brand_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !brandMember || brandMember.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only brand owners can make manual payments" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get owner's wallet
    const { data: ownerWallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("id, balance")
      .eq("user_id", user.id)
      .single();

    if (walletError || !ownerWallet) {
      return new Response(
        JSON.stringify({ error: "Owner wallet not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ownerWallet.balance < amount) {
      return new Response(
        JSON.stringify({ error: "Insufficient balance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create creator's wallet
    let { data: creatorWallet, error: creatorWalletError } = await supabaseAdmin
      .from("wallets")
      .select("id, balance")
      .eq("user_id", creator_id)
      .single();

    if (creatorWalletError || !creatorWallet) {
      // Create wallet for creator
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from("wallets")
        .insert({ user_id: creator_id, balance: 0 })
        .select("id, balance")
        .single();

      if (createError) {
        console.error("Error creating creator wallet:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create creator wallet" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      creatorWallet = newWallet;
    }

    // Deduct from owner's wallet
    const { error: deductError } = await supabaseAdmin
      .from("wallets")
      .update({ balance: ownerWallet.balance - amount })
      .eq("id", ownerWallet.id);

    if (deductError) {
      console.error("Error deducting from owner wallet:", deductError);
      return new Response(
        JSON.stringify({ error: "Failed to process payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add to creator's wallet
    const { error: addError } = await supabaseAdmin
      .from("wallets")
      .update({
        balance: (creatorWallet?.balance || 0) + amount,
        total_earned: (creatorWallet as any)?.total_earned
          ? (creatorWallet as any).total_earned + amount
          : amount,
      })
      .eq("id", creatorWallet?.id);

    if (addError) {
      // Rollback owner deduction
      await supabaseAdmin
        .from("wallets")
        .update({ balance: ownerWallet.balance })
        .eq("id", ownerWallet.id);

      console.error("Error adding to creator wallet:", addError);
      return new Response(
        JSON.stringify({ error: "Failed to process payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create transaction record for owner (outgoing)
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: user.id,
      type: "manual_payment",
      amount: -amount,
      status: "completed",
      metadata: {
        recipient_id: creator_id,
        brand_id,
        description: description || "Manual payment to creator",
      },
    });

    // Create transaction record for creator (incoming)
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: creator_id,
      type: "earning",
      amount: amount,
      status: "completed",
      metadata: {
        sender_id: user.id,
        brand_id,
        source: "manual_payment",
        description: description || "Manual payment from brand",
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        new_owner_balance: ownerWallet.balance - amount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in manual-creator-payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
