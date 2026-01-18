// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdatePayoutSettingsRequest {
  entity_type: "brand" | "boost";
  entity_id: string;
  holding_days?: number;
  minimum_amount?: number;
  reset_to_default?: boolean;
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

    // Parse request body
    const body: UpdatePayoutSettingsRequest = await req.json();
    const { entity_type, entity_id, holding_days, minimum_amount, reset_to_default } = body;

    if (!entity_type || !entity_id) {
      return new Response(
        JSON.stringify({ error: "entity_type and entity_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate ranges
    if (holding_days !== undefined && (holding_days < 0 || holding_days > 30)) {
      return new Response(
        JSON.stringify({ error: "holding_days must be between 0 and 30" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (minimum_amount !== undefined && (minimum_amount < 0 || minimum_amount > 50)) {
      return new Response(
        JSON.stringify({ error: "minimum_amount must be between 0 and 50" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let updateResult;

    if (entity_type === "brand") {
      // Update brand payout settings in profiles table
      // First verify user owns the brand
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, payout_settings_updated_at")
        .eq("id", entity_id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "Brand not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check rate limit (once per day)
      if (profile.payout_settings_updated_at) {
        const lastUpdate = new Date(profile.payout_settings_updated_at);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate < 24) {
          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded",
              hours_until_unlock: Math.ceil(24 - hoursSinceUpdate),
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Update brand settings
      const { data, error } = await supabase
        .from("profiles")
        .update({
          payout_holding_days: holding_days ?? 0,
          payout_minimum_amount: minimum_amount ?? 0,
          payout_settings_updated_at: new Date().toISOString(),
        })
        .eq("id", entity_id)
        .select()
        .single();

      if (error) {
        console.error("Error updating brand settings:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update settings" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      updateResult = data;
    } else if (entity_type === "boost") {
      // Update boost payout settings in bounty_campaigns table
      // First verify user has access to the boost
      const { data: boost, error: boostError } = await supabase
        .from("bounty_campaigns")
        .select("id, brand_id, payout_settings_updated_at")
        .eq("id", entity_id)
        .single();

      if (boostError || !boost) {
        return new Response(
          JSON.stringify({ error: "Boost not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check rate limit (once per day)
      if (boost.payout_settings_updated_at) {
        const lastUpdate = new Date(boost.payout_settings_updated_at);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate < 24) {
          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded",
              hours_until_unlock: Math.ceil(24 - hoursSinceUpdate),
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Update boost settings (NULL means inherit from brand)
      const updateData: Record<string, any> = {
        payout_settings_updated_at: new Date().toISOString(),
      };

      if (reset_to_default) {
        updateData.payout_holding_days = null;
        updateData.payout_minimum_amount = null;
      } else {
        if (holding_days !== undefined) {
          updateData.payout_holding_days = holding_days;
        }
        if (minimum_amount !== undefined) {
          updateData.payout_minimum_amount = minimum_amount;
        }
      }

      const { data, error } = await supabase
        .from("bounty_campaigns")
        .update(updateData)
        .eq("id", entity_id)
        .select()
        .single();

      if (error) {
        console.error("Error updating boost settings:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update settings" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      updateResult = data;
    }

    // Log to history for audit
    await supabase.from("payout_settings_history").insert({
      entity_type,
      entity_id,
      holding_days: reset_to_default ? null : holding_days,
      minimum_amount: reset_to_default ? null : minimum_amount,
      changed_by: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: updateResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in update-payout-settings:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
