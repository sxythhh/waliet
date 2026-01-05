import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeLog, safeError, truncateId } from "../_shared/logging.ts";
import { corsHeaders } from "../_shared/cors.ts";

const CLOSE_API_BASE = "https://api.close.com/api/v1";

// Make Close API request
async function closeApiRequest(
  method: string,
  endpoint: string,
  apiKey: string,
  body?: any
): Promise<{ data: any; error: string | null }> {
  try {
    const auth = btoa(`${apiKey}:`);
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const url = endpoint.startsWith("http") ? endpoint : `${CLOSE_API_BASE}${endpoint}`;
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: `Close API error ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Map Brand to Close Lead fields
function mapBrandToLead(brand: any) {
  return {
    name: brand.name,
    description: brand.description || undefined,
    url: brand.website_url || brand.website || undefined,
    custom: {
      brand_type: brand.brand_type,
      subscription_status: brand.subscription_status,
      subscription_plan: brand.subscription_plan,
      is_verified: brand.is_verified,
      virality_brand_id: brand.id,
    },
  };
}

// Log sync event
async function logSyncEvent(
  supabase: any,
  entityType: string,
  entityId: string,
  localId: string | null,
  eventType: string,
  direction: string,
  source: string,
  payload: any,
  status: string = "success",
  errorMessage: string | null = null
) {
  const idempotencyKey = `${direction}_${entityType}_${entityId}_${eventType}_${Date.now()}`;

  await supabase.from("close_sync_log").insert({
    entity_type: entityType,
    entity_id: entityId,
    local_id: localId,
    event_type: eventType,
    direction: direction,
    source: source,
    payload: payload,
    status: status,
    error_message: errorMessage,
    idempotency_key: idempotencyKey,
    processed_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const closeApiKey = Deno.env.get("CLOSE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role from JWT
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();

        if (!roleData) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const { action, ...params } = await req.json();
    safeLog("Close sync action", { action });

    // =====================
    // CREATE LEAD IN CLOSE
    // =====================
    if (action === "create_close_lead") {
      const { brand_id } = params;

      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", brand_id)
        .single();

      if (brandError || !brand) {
        return new Response(JSON.stringify({ error: "Brand not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (brand.close_lead_id) {
        return new Response(JSON.stringify({ error: "Brand already linked to Close lead" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const leadData = mapBrandToLead(brand);
      const { data: closeLead, error: closeError } = await closeApiRequest("POST", "/lead/", closeApiKey, leadData);

      if (closeError) {
        safeError("Failed to create Close lead", closeError);
        await logSyncEvent(supabase, "lead", "", brand_id, "created", "outbound", "admin_ui", leadData, "error", closeError);
        return new Response(JSON.stringify({ error: closeError }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update brand with Close lead ID
      await supabase
        .from("brands")
        .update({
          close_lead_id: closeLead.id,
          close_status_id: closeLead.status_id,
          close_status_label: closeLead.status_label,
          close_synced_at: new Date().toISOString(),
        })
        .eq("id", brand_id);

      await logSyncEvent(supabase, "lead", closeLead.id, brand_id, "created", "outbound", "admin_ui", closeLead);
      safeLog("Close lead created", { brandId: truncateId(brand_id), closeLeadId: truncateId(closeLead.id) });

      return new Response(JSON.stringify({ success: true, close_lead_id: closeLead.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // UPDATE CLOSE LEAD
    // =====================
    if (action === "update_close_lead") {
      const { brand_id, fields } = params;

      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", brand_id)
        .single();

      if (brandError || !brand) {
        return new Response(JSON.stringify({ error: "Brand not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!brand.close_lead_id) {
        return new Response(JSON.stringify({ error: "Brand not linked to Close lead" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData = fields || mapBrandToLead(brand);
      const { data: updatedLead, error: closeError } = await closeApiRequest(
        "PUT",
        `/lead/${brand.close_lead_id}/`,
        closeApiKey,
        updateData
      );

      if (closeError) {
        safeError("Failed to update Close lead", closeError);
        await logSyncEvent(supabase, "lead", brand.close_lead_id, brand_id, "updated", "outbound", "admin_ui", updateData, "error", closeError);
        return new Response(JSON.stringify({ error: closeError }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update brand sync timestamp
      await supabase
        .from("brands")
        .update({
          close_status_id: updatedLead.status_id,
          close_status_label: updatedLead.status_label,
          close_synced_at: new Date().toISOString(),
        })
        .eq("id", brand_id);

      await logSyncEvent(supabase, "lead", brand.close_lead_id, brand_id, "updated", "outbound", "admin_ui", updatedLead);
      safeLog("Close lead updated", { brandId: truncateId(brand_id) });

      return new Response(JSON.stringify({ success: true, lead: updatedLead }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // FETCH CLOSE LEAD
    // =====================
    if (action === "fetch_close_lead") {
      const { brand_id, close_lead_id } = params;

      const leadId = close_lead_id || (await supabase
        .from("brands")
        .select("close_lead_id")
        .eq("id", brand_id)
        .single()
        .then(r => r.data?.close_lead_id));

      if (!leadId) {
        return new Response(JSON.stringify({ error: "No Close lead ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: lead, error: closeError } = await closeApiRequest("GET", `/lead/${leadId}/`, closeApiKey);

      if (closeError) {
        return new Response(JSON.stringify({ error: closeError }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, lead }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // FETCH OPPORTUNITIES
    // =====================
    if (action === "fetch_opportunities") {
      const { brand_id } = params;

      const { data: brand } = await supabase
        .from("brands")
        .select("close_lead_id")
        .eq("id", brand_id)
        .single();

      if (!brand?.close_lead_id) {
        return new Response(JSON.stringify({ error: "Brand not linked to Close" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error: closeError } = await closeApiRequest(
        "GET",
        `/opportunity/?lead_id=${brand.close_lead_id}`,
        closeApiKey
      );

      if (closeError) {
        return new Response(JSON.stringify({ error: closeError }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Sync opportunities to local DB
      for (const opp of data.data || []) {
        await supabase.from("close_opportunities").upsert({
          brand_id,
          close_opportunity_id: opp.id,
          close_lead_id: opp.lead_id,
          status_id: opp.status_id,
          status_type: opp.status_type,
          status_label: opp.status_label,
          value: opp.value ? parseFloat(opp.value) : null,
          value_period: opp.value_period,
          confidence: opp.confidence,
          date_won: opp.date_won,
          note: opp.note,
          custom_fields: opp.custom || {},
          close_created_at: opp.date_created,
          close_updated_at: opp.date_updated,
          synced_at: new Date().toISOString(),
        }, { onConflict: "close_opportunity_id" });
      }

      return new Response(JSON.stringify({ success: true, opportunities: data.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // FETCH ACTIVITIES
    // =====================
    if (action === "fetch_activities") {
      const { brand_id, limit = 50 } = params;

      const { data: brand } = await supabase
        .from("brands")
        .select("close_lead_id")
        .eq("id", brand_id)
        .single();

      if (!brand?.close_lead_id) {
        return new Response(JSON.stringify({ error: "Brand not linked to Close" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch various activity types
      const activityTypes = ["note", "call", "email", "meeting"];
      const allActivities: any[] = [];

      for (const type of activityTypes) {
        const { data } = await closeApiRequest(
          "GET",
          `/activity/${type}/?lead_id=${brand.close_lead_id}&_limit=${limit}`,
          closeApiKey
        );
        if (data?.data) {
          allActivities.push(...data.data.map((a: any) => ({ ...a, activity_type: type })));
        }
      }

      // Sort by date
      allActivities.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());

      // Sync to local DB
      for (const activity of allActivities.slice(0, limit)) {
        await supabase.from("close_activities").upsert({
          brand_id,
          close_activity_id: activity.id,
          close_lead_id: activity.lead_id,
          activity_type: activity.activity_type,
          direction: activity.direction,
          user_name: activity.user_name || activity.created_by_name,
          subject: activity.subject,
          body: activity.note || activity.body_text || activity.body,
          duration_seconds: activity.duration,
          activity_at: activity.date_created,
          synced_at: new Date().toISOString(),
        }, { onConflict: "close_activity_id" });
      }

      return new Response(JSON.stringify({ success: true, activities: allActivities.slice(0, limit) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // GET LEAD STATUSES
    // =====================
    if (action === "get_lead_statuses") {
      const { data, error } = await closeApiRequest("GET", "/status/lead/", closeApiKey);

      if (error) {
        return new Response(JSON.stringify({ error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, statuses: data.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // GET OPPORTUNITY STATUSES
    // =====================
    if (action === "get_opportunity_statuses") {
      const { data, error } = await closeApiRequest("GET", "/status/opportunity/", closeApiKey);

      if (error) {
        return new Response(JSON.stringify({ error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, statuses: data.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // INITIAL IMPORT
    // =====================
    if (action === "initial_import") {
      const { skip = 0, limit = 100 } = params;

      const { data, error } = await closeApiRequest(
        "GET",
        `/lead/?_skip=${skip}&_limit=${limit}`,
        closeApiKey
      );

      if (error) {
        return new Response(JSON.stringify({ error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let imported = 0;
      let linked = 0;
      let skipped = 0;

      for (const lead of data.data || []) {
        // Check if already linked
        const { data: existingBrand } = await supabase
          .from("brands")
          .select("id")
          .eq("close_lead_id", lead.id)
          .single();

        if (existingBrand) {
          skipped++;
          continue;
        }

        // Try to match by name
        const { data: matchByName } = await supabase
          .from("brands")
          .select("id")
          .ilike("name", lead.name || "")
          .is("close_lead_id", null)
          .single();

        if (matchByName) {
          await supabase
            .from("brands")
            .update({
              close_lead_id: lead.id,
              close_status_id: lead.status_id,
              close_status_label: lead.status_label,
              close_custom_fields: lead.custom || {},
              close_contacts: lead.contacts || [],
              close_synced_at: new Date().toISOString(),
            })
            .eq("id", matchByName.id);
          linked++;
        } else {
          // Create new brand
          const slug = (lead.name || "brand")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") + "-" + Date.now();

          await supabase.from("brands").insert({
            name: lead.name,
            slug,
            description: lead.description,
            website_url: lead.url,
            brand_type: "Lead",
            is_active: true,
            close_lead_id: lead.id,
            close_status_id: lead.status_id,
            close_status_label: lead.status_label,
            close_custom_fields: lead.custom || {},
            close_contacts: lead.contacts || [],
            close_synced_at: new Date().toISOString(),
          });
          imported++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        imported,
        linked,
        skipped,
        hasMore: data.has_more,
        total: data.total_results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    safeError("Close sync error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
