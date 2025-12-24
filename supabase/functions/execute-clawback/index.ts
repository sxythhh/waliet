import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { payout_item_id, reason } = await req.json();

    if (!payout_item_id) {
      return new Response(
        JSON.stringify({ error: "payout_item_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the payout item with related data
    const { data: payoutItem, error: itemError } = await supabaseClient
      .from("submission_payout_items")
      .select(`
        *,
        payout_request:submission_payout_requests!payout_request_id (
          id,
          user_id,
          status,
          total_amount
        )
      `)
      .eq("id", payout_item_id)
      .single();

    if (itemError || !payoutItem) {
      return new Response(
        JSON.stringify({ error: "Payout item not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the submission to find the video and source info
    const { data: submission } = await supabaseClient
      .from("video_submissions")
      .select("id, video_url, creator_id, source_type, source_id")
      .eq("id", payoutItem.submission_id)
      .single();

    // Get the brand ID based on source
    let brandId = null;
    if (payoutItem.source_type === "campaign") {
      const { data: campaign } = await supabaseClient
        .from("campaigns")
        .select("brand_id")
        .eq("id", payoutItem.source_id)
        .single();
      brandId = campaign?.brand_id;
    } else if (payoutItem.source_type === "boost") {
      const { data: boost } = await supabaseClient
        .from("bounty_campaigns")
        .select("brand_id")
        .eq("id", payoutItem.source_id)
        .single();
      brandId = boost?.brand_id;
    }

    const creatorId = submission?.creator_id || (payoutItem.payout_request as any)?.user_id;

    // Start transaction-like operations
    // 1. Update the payout item to clawed_back
    const { error: updateItemError } = await supabaseClient
      .from("submission_payout_items")
      .update({
        clawback_status: "clawed_back",
        clawback_reason: reason || "Flagged content violation",
        clawed_back_at: new Date().toISOString(),
        clawed_back_by: user.id,
      })
      .eq("id", payout_item_id);

    if (updateItemError) {
      throw new Error(`Failed to update payout item: ${updateItemError.message}`);
    }

    // 2. Update the video submission status
    if (submission?.id) {
      await supabaseClient
        .from("video_submissions")
        .update({
          payout_status: "clawed_back",
          is_flagged: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);
    }

    // 3. Refund the brand wallet if we have a brand ID
    if (brandId) {
      // Create a clawback refund transaction for the brand
      await supabaseClient
        .from("brand_wallet_transactions")
        .insert({
          brand_id: brandId,
          amount: payoutItem.amount,
          type: "clawback_refund",
          description: `Clawback refund: ${reason || "Flagged content"}`,
          campaign_id: payoutItem.source_type === "campaign" ? payoutItem.source_id : null,
          boost_id: payoutItem.source_type === "boost" ? payoutItem.source_id : null,
          metadata: {
            payout_item_id: payout_item_id,
            submission_id: submission?.id,
            clawed_back_by: user.id,
          },
        });
    }

    // 4. Create an audit transaction for the creator (negative amount for tracking)
    if (creatorId) {
      await supabaseClient
        .from("wallet_transactions")
        .insert({
          user_id: creatorId,
          amount: 0, // Not actually deducting - it was never credited
          type: "clawback",
          description: `Payout cancelled: ${reason || "Flagged content"}`,
          status: "completed",
          metadata: {
            payout_item_id: payout_item_id,
            original_amount: payoutItem.amount,
            submission_id: submission?.id,
          },
        });
    }

    // 5. Update the payout request status if needed
    // Check if all items in this request are now clawed back
    const { data: remainingItems } = await supabaseClient
      .from("submission_payout_items")
      .select("id, clawback_status")
      .eq("payout_request_id", payoutItem.payout_request_id);

    const allClawedBack = remainingItems?.every(
      (item) => item.clawback_status === "clawed_back"
    );

    if (allClawedBack) {
      await supabaseClient
        .from("submission_payout_requests")
        .update({ status: "clawed_back" })
        .eq("id", payoutItem.payout_request_id);
    } else {
      // Some items still pending - mark as partial
      const hasAnyClawback = remainingItems?.some(
        (item) => item.clawback_status === "clawed_back"
      );
      if (hasAnyClawback) {
        await supabaseClient
          .from("submission_payout_requests")
          .update({ status: "partial_clawback" })
          .eq("id", payoutItem.payout_request_id);
      }
    }

    // 6. Send Discord notification to creator
    if (creatorId) {
      try {
        await supabaseClient.functions.invoke("send-discord-dm", {
          body: {
            userId: creatorId,
            message: {
              content: `⚠️ **Payout Cancelled**\n\nAfter review, your submission has been revoked. The $${Number(payoutItem.amount).toFixed(2)} payout has been cancelled.\n\n**Reason:** ${reason || "Flagged content violation"}\n\nIf you believe this is an error, please contact support.`,
            },
          },
        });
      } catch (dmError) {
        console.error("Failed to send Discord DM:", dmError);
        // Don't fail the whole operation if DM fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Clawback executed successfully",
        refunded_amount: payoutItem.amount,
        brand_id: brandId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error executing clawback:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to execute clawback";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
