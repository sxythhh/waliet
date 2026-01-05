import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { safeLog, safeError, truncateId } from "../_shared/logging.ts";

// Webhook headers - no CORS needed for server-to-server
const webhookHeaders = {
  "Content-Type": "application/json",
};

// Verify Close webhook signature
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!secret) {
    safeError("CLOSE_WEBHOOK_SECRET not configured - webhook signature verification disabled");
    return true; // Allow during development
  }

  if (!signature) {
    safeError("No signature provided in webhook request");
    return false;
  }

  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    // Support both raw and prefixed signature formats
    const isValid = signature === expectedSignature || signature === `sha256=${expectedSignature}`;

    if (!isValid) {
      safeError("Invalid webhook signature");
    }

    return isValid;
  } catch (err) {
    safeError("Signature verification error", err);
    return false;
  }
}

// Map Close Lead to Brand fields
function mapLeadToBrand(lead: any) {
  const primaryContact = lead.contacts?.[0] || {};
  const primaryEmail = primaryContact.emails?.[0]?.email;
  const primaryPhone = primaryContact.phones?.[0]?.phone;

  return {
    close_lead_id: lead.id,
    close_status_id: lead.status_id,
    close_status_label: lead.status_label,
    close_custom_fields: lead.custom || {},
    close_contacts: lead.contacts || [],
    close_synced_at: new Date().toISOString(),
    // Map to brand fields if they're empty
    name: lead.name || lead.display_name,
    description: lead.description,
    website_url: lead.url,
  };
}

// Log sync event to close_sync_log
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
    return new Response(null, { status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("CLOSE_WEBHOOK_SECRET") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const signature = req.headers.get("close-signature") || req.headers.get("x-close-signature");

    // Verify signature
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: webhookHeaders,
      });
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    safeLog("Close webhook received", {
      event,
      hasData: !!data,
      leadId: data?.id ? truncateId(data.id) : null,
    });

    // =====================
    // Handle Lead Events
    // =====================

    if (event === "lead.created" || event === "lead.updated") {
      const lead = data;
      const brandFields = mapLeadToBrand(lead);

      // Check if brand exists with this close_lead_id
      const { data: existingBrand } = await supabase
        .from("brands")
        .select("id, name, updated_at")
        .eq("close_lead_id", lead.id)
        .single();

      if (existingBrand) {
        // Update existing brand
        const { error: updateError } = await supabase
          .from("brands")
          .update({
            close_status_id: brandFields.close_status_id,
            close_status_label: brandFields.close_status_label,
            close_custom_fields: brandFields.close_custom_fields,
            close_contacts: brandFields.close_contacts,
            close_synced_at: brandFields.close_synced_at,
            // Only update name/description if empty locally
            ...(existingBrand.name ? {} : { name: brandFields.name }),
          })
          .eq("id", existingBrand.id);

        if (updateError) {
          safeError("Error updating brand from Close lead", updateError);
          await logSyncEvent(supabase, "lead", lead.id, existingBrand.id, event, "inbound", "webhook", lead, "error", updateError.message);
          throw updateError;
        }

        await logSyncEvent(supabase, "lead", lead.id, existingBrand.id, event, "inbound", "webhook", lead);
        safeLog("Brand updated from Close lead", { brandId: truncateId(existingBrand.id), leadId: truncateId(lead.id) });
      } else if (event === "lead.created") {
        // Try to match by name or create new brand
        const { data: matchByName } = await supabase
          .from("brands")
          .select("id")
          .ilike("name", brandFields.name || "")
          .is("close_lead_id", null)
          .single();

        if (matchByName) {
          // Link existing brand to Close lead
          const { error: linkError } = await supabase
            .from("brands")
            .update(brandFields)
            .eq("id", matchByName.id);

          if (linkError) {
            safeError("Error linking brand to Close lead", linkError);
            await logSyncEvent(supabase, "lead", lead.id, matchByName.id, event, "inbound", "webhook", lead, "error", linkError.message);
          } else {
            await logSyncEvent(supabase, "lead", lead.id, matchByName.id, event, "inbound", "webhook", lead);
            safeLog("Existing brand linked to Close lead", { brandId: truncateId(matchByName.id) });
          }
        } else {
          // Create new brand from Close lead
          const slug = (brandFields.name || "brand")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") + "-" + Date.now();

          const { data: newBrand, error: insertError } = await supabase
            .from("brands")
            .insert({
              ...brandFields,
              slug,
              brand_type: "Lead",
              is_active: true,
            })
            .select("id")
            .single();

          if (insertError) {
            safeError("Error creating brand from Close lead", insertError);
            await logSyncEvent(supabase, "lead", lead.id, null, event, "inbound", "webhook", lead, "error", insertError.message);
          } else {
            await logSyncEvent(supabase, "lead", lead.id, newBrand.id, event, "inbound", "webhook", lead);
            safeLog("New brand created from Close lead", { brandId: truncateId(newBrand.id) });
          }
        }
      }

      return new Response(JSON.stringify({ success: true, event }), {
        headers: webhookHeaders,
      });
    }

    if (event === "lead.deleted") {
      const lead = data;

      // Mark brand as unlinked (don't delete)
      const { data: brand } = await supabase
        .from("brands")
        .select("id")
        .eq("close_lead_id", lead.id)
        .single();

      if (brand) {
        await supabase
          .from("brands")
          .update({
            close_lead_id: null,
            close_status_id: null,
            close_status_label: null,
            close_sync_enabled: false,
            close_synced_at: new Date().toISOString(),
          })
          .eq("id", brand.id);

        await logSyncEvent(supabase, "lead", lead.id, brand.id, event, "inbound", "webhook", lead);
        safeLog("Brand unlinked from deleted Close lead", { brandId: truncateId(brand.id) });
      }

      return new Response(JSON.stringify({ success: true, event }), {
        headers: webhookHeaders,
      });
    }

    if (event === "lead.merged") {
      const { source_id, destination_id } = data;

      // Update brand to point to merged lead
      const { data: brand } = await supabase
        .from("brands")
        .select("id")
        .eq("close_lead_id", source_id)
        .single();

      if (brand) {
        await supabase
          .from("brands")
          .update({
            close_lead_id: destination_id,
            close_synced_at: new Date().toISOString(),
          })
          .eq("id", brand.id);

        await logSyncEvent(supabase, "lead", source_id, brand.id, event, "inbound", "webhook", data);
        safeLog("Brand updated after Close lead merge", { brandId: truncateId(brand.id), newLeadId: truncateId(destination_id) });
      }

      return new Response(JSON.stringify({ success: true, event }), {
        headers: webhookHeaders,
      });
    }

    // =====================
    // Handle Opportunity Events
    // =====================

    if (event === "opportunity.created" || event === "opportunity.updated") {
      const opportunity = data;

      // Find the brand for this opportunity's lead
      const { data: brand } = await supabase
        .from("brands")
        .select("id")
        .eq("close_lead_id", opportunity.lead_id)
        .single();

      if (!brand) {
        safeLog("No brand found for opportunity lead", { leadId: truncateId(opportunity.lead_id) });
        await logSyncEvent(supabase, "opportunity", opportunity.id, null, event, "inbound", "webhook", opportunity, "skipped", "No brand found for lead");
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: webhookHeaders,
        });
      }

      // Upsert opportunity
      const opportunityData = {
        brand_id: brand.id,
        close_opportunity_id: opportunity.id,
        close_lead_id: opportunity.lead_id,
        status_id: opportunity.status_id,
        status_type: opportunity.status_type,
        status_label: opportunity.status_label,
        value: opportunity.value ? parseFloat(opportunity.value) : null,
        value_period: opportunity.value_period,
        confidence: opportunity.confidence,
        date_won: opportunity.date_won,
        note: opportunity.note,
        custom_fields: opportunity.custom || {},
        close_created_at: opportunity.date_created,
        close_updated_at: opportunity.date_updated,
        synced_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("close_opportunities")
        .upsert(opportunityData, { onConflict: "close_opportunity_id" });

      if (upsertError) {
        safeError("Error upserting opportunity", upsertError);
        await logSyncEvent(supabase, "opportunity", opportunity.id, brand.id, event, "inbound", "webhook", opportunity, "error", upsertError.message);
        throw upsertError;
      }

      await logSyncEvent(supabase, "opportunity", opportunity.id, brand.id, event, "inbound", "webhook", opportunity);
      safeLog("Opportunity synced", { opportunityId: truncateId(opportunity.id), brandId: truncateId(brand.id) });

      return new Response(JSON.stringify({ success: true, event }), {
        headers: webhookHeaders,
      });
    }

    if (event === "opportunity.deleted") {
      const opportunity = data;

      const { error: deleteError } = await supabase
        .from("close_opportunities")
        .delete()
        .eq("close_opportunity_id", opportunity.id);

      if (deleteError) {
        safeError("Error deleting opportunity", deleteError);
      } else {
        await logSyncEvent(supabase, "opportunity", opportunity.id, null, event, "inbound", "webhook", opportunity);
        safeLog("Opportunity deleted", { opportunityId: truncateId(opportunity.id) });
      }

      return new Response(JSON.stringify({ success: true, event }), {
        headers: webhookHeaders,
      });
    }

    // =====================
    // Handle Activity Events
    // =====================

    if (event?.startsWith("activity.")) {
      const activity = data;

      // Find brand for this activity's lead
      const { data: brand } = await supabase
        .from("brands")
        .select("id")
        .eq("close_lead_id", activity.lead_id)
        .single();

      if (!brand) {
        safeLog("No brand found for activity lead", { leadId: truncateId(activity.lead_id) });
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: webhookHeaders,
        });
      }

      // Determine activity type from event
      let activityType = "note";
      if (event.includes("call")) activityType = "call";
      else if (event.includes("email")) activityType = "email";
      else if (event.includes("sms")) activityType = "sms";
      else if (event.includes("meeting")) activityType = "meeting";

      const activityData = {
        brand_id: brand.id,
        close_activity_id: activity.id,
        close_lead_id: activity.lead_id,
        activity_type: activityType,
        direction: activity.direction,
        user_name: activity.user_name || activity.created_by_name,
        subject: activity.subject,
        body: activity.note || activity.body_text || activity.body,
        duration_seconds: activity.duration,
        activity_at: activity.date_created || new Date().toISOString(),
        custom_fields: activity.custom || {},
        synced_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("close_activities")
        .upsert(activityData, { onConflict: "close_activity_id" });

      if (insertError) {
        safeError("Error inserting activity", insertError);
      } else {
        safeLog("Activity synced", { activityId: truncateId(activity.id), brandId: truncateId(brand.id) });
      }

      return new Response(JSON.stringify({ success: true, event }), {
        headers: webhookHeaders,
      });
    }

    // Default response for unhandled events
    safeLog("Unhandled Close webhook event", { event });
    return new Response(JSON.stringify({ success: true, unhandled: true }), {
      headers: webhookHeaders,
    });
  } catch (error: unknown) {
    safeError("Close webhook error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: webhookHeaders }
    );
  }
});
