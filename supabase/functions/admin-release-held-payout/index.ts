// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReleaseHeldPayoutRequest {
  payment_ledger_id?: string;
  user_id?: string;
  boost_id?: string;
  release_all?: boolean;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header and verify user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: ReleaseHeldPayoutRequest = await req.json();
    const { payment_ledger_id, user_id, boost_id, release_all, reason } = body;

    if (!payment_ledger_id && !user_id && !boost_id && !release_all) {
      return new Response(
        JSON.stringify({
          error: "Must provide payment_ledger_id, user_id, boost_id, or release_all",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build query for held payments
    let query = supabase
      .from("payment_ledger")
      .update({
        status: "locked",
        release_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("status", "held");

    // Apply filters based on request
    if (payment_ledger_id) {
      query = query.eq("id", payment_ledger_id);
    } else if (user_id) {
      query = query.eq("user_id", user_id);
    } else if (boost_id) {
      query = query.eq("source_id", boost_id).eq("source_type", "boost");
    }
    // release_all will release all held payments

    const { data: releasedPayments, error: releaseError } = await query.select();

    if (releaseError) {
      console.error("Error releasing held payouts:", releaseError);
      return new Response(
        JSON.stringify({ error: "Failed to release held payouts" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the admin action for audit
    if (releasedPayments && releasedPayments.length > 0) {
      const auditEntries = releasedPayments.map((payment: any) => ({
        entity_type: "payment_ledger",
        entity_id: payment.id,
        action: "admin_release_held",
        changed_by: user.id,
        metadata: {
          previous_status: "held",
          new_status: "locked",
          reason: reason || "Admin force release",
          user_id: payment.user_id,
          amount: payment.pending_cents,
          source_type: payment.source_type,
          source_id: payment.source_id,
        },
      }));

      await supabase.from("payout_settings_history").insert(auditEntries);
    }

    // Calculate totals
    const totalAmount = releasedPayments?.reduce(
      (sum: number, p: any) => sum + (p.pending_cents || 0),
      0
    ) || 0;

    return new Response(
      JSON.stringify({
        success: true,
        released_count: releasedPayments?.length || 0,
        total_amount_cents: totalAmount,
        released_payments: releasedPayments?.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          amount_cents: p.pending_cents,
          source_type: p.source_type,
          source_id: p.source_id,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in admin-release-held-payout:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
