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

    if (body && method !== "GET" && method !== "DELETE") {
      options.body = JSON.stringify(body);
    }

    const url = endpoint.startsWith("http") ? endpoint : `${CLOSE_API_BASE}${endpoint}`;
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: `Close API error ${response.status}: ${errorText}` };
    }

    if (method === "DELETE") {
      return { data: { deleted: true }, error: null };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
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

    // Verify admin role
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
    safeLog("Close CRUD action", { action });

    // =====================
    // CREATE OPPORTUNITY
    // =====================
    if (action === "create_opportunity") {
      const { brand_id, status_id, value, value_period, confidence, note } = params;

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

      const oppData = {
        lead_id: brand.close_lead_id,
        status_id,
        value: value ? parseFloat(value) : undefined,
        value_period,
        confidence: confidence ? parseInt(confidence) : undefined,
        note,
      };

      const { data: newOpp, error } = await closeApiRequest("POST", "/opportunity/", closeApiKey, oppData);

      if (error) {
        safeError("Failed to create opportunity", error);
        await logSyncEvent(supabase, "opportunity", "", brand_id, "created", "outbound", "admin_ui", oppData, "error", error);
        return new Response(JSON.stringify({ error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save to local DB
      await supabase.from("close_opportunities").insert({
        brand_id,
        close_opportunity_id: newOpp.id,
        close_lead_id: newOpp.lead_id,
        status_id: newOpp.status_id,
        status_type: newOpp.status_type,
        status_label: newOpp.status_label,
        value: newOpp.value ? parseFloat(newOpp.value) : null,
        value_period: newOpp.value_period,
        confidence: newOpp.confidence,
        date_won: newOpp.date_won,
        note: newOpp.note,
        synced_at: new Date().toISOString(),
      });

      await logSyncEvent(supabase, "opportunity", newOpp.id, brand_id, "created", "outbound", "admin_ui", newOpp);
      safeLog("Opportunity created", { oppId: truncateId(newOpp.id) });

      return new Response(JSON.stringify({ success: true, opportunity: newOpp }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // UPDATE OPPORTUNITY
    // =====================
    if (action === "update_opportunity") {
      const { opportunity_id, close_opportunity_id, status_id, value, value_period, confidence, note } = params;

      const oppId = close_opportunity_id || (await supabase
        .from("close_opportunities")
        .select("close_opportunity_id")
        .eq("id", opportunity_id)
        .single()
        .then(r => r.data?.close_opportunity_id));

      if (!oppId) {
        return new Response(JSON.stringify({ error: "Opportunity not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: any = {};
      if (status_id !== undefined) updateData.status_id = status_id;
      if (value !== undefined) updateData.value = parseFloat(value);
      if (value_period !== undefined) updateData.value_period = value_period;
      if (confidence !== undefined) updateData.confidence = parseInt(confidence);
      if (note !== undefined) updateData.note = note;

      const { data: updatedOpp, error } = await closeApiRequest("PUT", `/opportunity/${oppId}/`, closeApiKey, updateData);

      if (error) {
        safeError("Failed to update opportunity", error);
        return new Response(JSON.stringify({ error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update local DB
      await supabase
        .from("close_opportunities")
        .update({
          status_id: updatedOpp.status_id,
          status_type: updatedOpp.status_type,
          status_label: updatedOpp.status_label,
          value: updatedOpp.value ? parseFloat(updatedOpp.value) : null,
          value_period: updatedOpp.value_period,
          confidence: updatedOpp.confidence,
          date_won: updatedOpp.date_won,
          note: updatedOpp.note,
          synced_at: new Date().toISOString(),
        })
        .eq("close_opportunity_id", oppId);

      await logSyncEvent(supabase, "opportunity", oppId, null, "updated", "outbound", "admin_ui", updatedOpp);
      safeLog("Opportunity updated", { oppId: truncateId(oppId) });

      return new Response(JSON.stringify({ success: true, opportunity: updatedOpp }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // DELETE OPPORTUNITY
    // =====================
    if (action === "delete_opportunity") {
      const { opportunity_id, close_opportunity_id } = params;

      const oppId = close_opportunity_id || (await supabase
        .from("close_opportunities")
        .select("close_opportunity_id")
        .eq("id", opportunity_id)
        .single()
        .then(r => r.data?.close_opportunity_id));

      if (!oppId) {
        return new Response(JSON.stringify({ error: "Opportunity not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await closeApiRequest("DELETE", `/opportunity/${oppId}/`, closeApiKey);

      if (error) {
        safeError("Failed to delete opportunity", error);
        return new Response(JSON.stringify({ error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete from local DB
      await supabase
        .from("close_opportunities")
        .delete()
        .eq("close_opportunity_id", oppId);

      await logSyncEvent(supabase, "opportunity", oppId, null, "deleted", "outbound", "admin_ui", { id: oppId });
      safeLog("Opportunity deleted", { oppId: truncateId(oppId) });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // LOG ACTIVITY (Note)
    // =====================
    if (action === "log_activity") {
      const { brand_id, activity_type, note, subject } = params;

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

      let endpoint = "/activity/note/";
      let activityData: any = {
        lead_id: brand.close_lead_id,
        note,
      };

      if (activity_type === "call") {
        endpoint = "/activity/call/";
        activityData = {
          lead_id: brand.close_lead_id,
          note,
          direction: params.direction || "outbound",
          duration: params.duration_seconds || 0,
        };
      } else if (activity_type === "email") {
        endpoint = "/activity/email/";
        activityData = {
          lead_id: brand.close_lead_id,
          subject: subject || "Email from Admin",
          body_text: note,
          direction: params.direction || "outbound",
        };
      } else if (activity_type === "meeting") {
        endpoint = "/activity/meeting/";
        activityData = {
          lead_id: brand.close_lead_id,
          title: subject || "Meeting",
          note,
          duration: params.duration_seconds || 0,
        };
      }

      const { data: newActivity, error } = await closeApiRequest("POST", endpoint, closeApiKey, activityData);

      if (error) {
        safeError("Failed to log activity", error);
        await logSyncEvent(supabase, "activity", "", brand_id, "created", "outbound", "admin_ui", activityData, "error", error);
        return new Response(JSON.stringify({ error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save to local DB
      await supabase.from("close_activities").insert({
        brand_id,
        close_activity_id: newActivity.id,
        close_lead_id: brand.close_lead_id,
        activity_type: activity_type || "note",
        direction: params.direction,
        user_name: newActivity.user_name || newActivity.created_by_name,
        subject: subject || newActivity.subject,
        body: note,
        duration_seconds: params.duration_seconds,
        activity_at: newActivity.date_created || new Date().toISOString(),
        synced_at: new Date().toISOString(),
      });

      await logSyncEvent(supabase, "activity", newActivity.id, brand_id, "created", "outbound", "admin_ui", newActivity);
      safeLog("Activity logged", { activityId: truncateId(newActivity.id), type: activity_type });

      return new Response(JSON.stringify({ success: true, activity: newActivity }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // UPDATE LEAD STATUS
    // =====================
    if (action === "update_lead_status") {
      const { brand_id, status_id } = params;

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

      const { data: updatedLead, error } = await closeApiRequest(
        "PUT",
        `/lead/${brand.close_lead_id}/`,
        closeApiKey,
        { status_id }
      );

      if (error) {
        safeError("Failed to update lead status", error);
        return new Response(JSON.stringify({ error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update local DB
      await supabase
        .from("brands")
        .update({
          close_status_id: updatedLead.status_id,
          close_status_label: updatedLead.status_label,
          close_synced_at: new Date().toISOString(),
        })
        .eq("id", brand_id);

      await logSyncEvent(supabase, "lead", brand.close_lead_id, brand_id, "status_updated", "outbound", "admin_ui", { status_id });
      safeLog("Lead status updated", { brandId: truncateId(brand_id), status: updatedLead.status_label });

      return new Response(JSON.stringify({ success: true, lead: updatedLead }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    safeError("Close CRUD error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
