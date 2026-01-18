import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeLog, safeError, truncateId } from "../_shared/logging.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const CLOSE_API_BASE = "https://api.close.com/api/v1";

/**
 * Close Scheduled Sync Edge Function
 *
 * Handles scheduled synchronization of leads from Close CRM:
 * - full_sync: Import all leads, create brands, fetch logos
 * - incremental_sync: Only leads modified since last sync
 *
 * Should be triggered via cron job (e.g., every hour)
 */

// Make Close API request
async function closeApiRequest(
  method: string,
  endpoint: string,
  apiKey: string,
  body?: Record<string, unknown>
): Promise<{ data: unknown; error: string | null }> {
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

// Extract domain from URL or email
function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;

  try {
    if (input.includes("@") && !input.includes("://")) {
      const domain = input.split("@").pop()?.toLowerCase().trim();
      return domain || null;
    }

    let url = input;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    const cleaned = input
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .split("/")[0]
      .toLowerCase()
      .trim();

    if (cleaned.includes(".") && !cleaned.includes(" ")) {
      return cleaned;
    }
    return null;
  }
}

// Check if URL returns valid image
async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Virality/1.0" },
    });
    if (!response.ok) return false;
    const contentType = response.headers.get("content-type");
    return contentType?.startsWith("image/") ?? false;
  } catch {
    return false;
  }
}

// Fetch logo URL with fallback
async function fetchLogoUrl(domain: string): Promise<string | null> {
  const clearbitUrl = `https://logo.clearbit.com/${domain}`;
  if (await isValidImageUrl(clearbitUrl)) {
    return clearbitUrl;
  }

  const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  if (await isValidImageUrl(googleFaviconUrl)) {
    return googleFaviconUrl;
  }

  return null;
}

// Get logo URL for a lead
async function getLogoForLead(lead: { url?: string; contacts?: Array<{ emails?: Array<{ email: string }> }> }): Promise<string | null> {
  let domain = extractDomain(lead.url);

  if (!domain && lead.contacts && Array.isArray(lead.contacts)) {
    for (const contact of lead.contacts) {
      if (contact.emails && Array.isArray(contact.emails)) {
        for (const emailObj of contact.emails) {
          domain = extractDomain(emailObj.email);
          if (domain) break;
        }
      }
      if (domain) break;
    }
  }

  if (!domain) return null;
  return await fetchLogoUrl(domain);
}

// Generate unique slug
function generateSlug(name: string): string {
  return (name || "brand")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + "-" + Date.now();
}

// Log sync event
async function logSyncEvent(
  supabase: ReturnType<typeof createClient>,
  entityType: string,
  entityId: string,
  localId: string | null,
  eventType: string,
  direction: string,
  source: string,
  payload: unknown,
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

// Update sync settings
async function updateSyncSettings(
  supabase: ReturnType<typeof createClient>,
  syncType: "full" | "incremental"
) {
  const key = syncType === "full" ? "last_full_sync_at" : "last_incremental_sync_at";

  const { data: existing } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "close_sync")
    .single();

  const currentValue = existing?.value || {};
  const updatedValue = {
    ...currentValue,
    [key]: new Date().toISOString(),
  };

  await supabase
    .from("system_settings")
    .upsert({
      key: "close_sync",
      value: updatedValue,
      updated_at: new Date().toISOString(),
    });
}

// Get last sync time
async function getLastSyncTime(
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "close_sync")
    .single();

  // Prefer incremental sync time, fall back to full sync time
  return data?.value?.last_incremental_sync_at || data?.value?.last_full_sync_at || null;
}

Deno.serve(async (req) => {
  // Get dynamic CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const closeApiKey = Deno.env.get("CLOSE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    let action = "incremental_sync";
    let skipCount = 0;
    const limitPerPage = 100;

    try {
      const body = await req.json();
      action = body.action || action;
      skipCount = body.skip || 0;
    } catch {
      // Use defaults for cron triggers (no body)
    }

    safeLog("Close scheduled sync started", { action });

    // =====================
    // FULL SYNC
    // =====================
    if (action === "full_sync") {
      let totalImported = 0;
      let totalLinked = 0;
      let totalSkipped = 0;
      let totalLogos = 0;
      let hasMore = true;
      let skip = skipCount;

      while (hasMore) {
        const { data, error } = await closeApiRequest(
          "GET",
          `/lead/?_skip=${skip}&_limit=${limitPerPage}`,
          closeApiKey
        ) as { data: { data?: unknown[]; has_more?: boolean; total_results?: number }; error: string | null };

        if (error) {
          safeError("Failed to fetch leads from Close", error);
          return new Response(JSON.stringify({
            error,
            partial_results: {
              imported: totalImported,
              linked: totalLinked,
              skipped: totalSkipped,
              logos_fetched: totalLogos,
            }
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const leads = (data.data || []) as Array<{
          id: string;
          name?: string;
          description?: string;
          url?: string;
          status_id?: string;
          status_label?: string;
          custom?: Record<string, unknown>;
          contacts?: Array<{ emails?: Array<{ email: string }> }>;
        }>;

        for (const lead of leads) {
          // Check if already linked
          const { data: existingBrand } = await supabase
            .from("brands")
            .select("id")
            .eq("close_lead_id", lead.id)
            .single();

          if (existingBrand) {
            totalSkipped++;
            continue;
          }

          // Try to match by name
          const { data: matchByName } = await supabase
            .from("brands")
            .select("id, logo_url")
            .ilike("name", lead.name || "")
            .is("close_lead_id", null)
            .single();

          // Fetch logo if needed
          let logoUrl: string | null = null;
          if (!matchByName?.logo_url || matchByName.logo_url.includes("google.com/s2/favicons")) {
            logoUrl = await getLogoForLead(lead);
            if (logoUrl) totalLogos++;
          }

          if (matchByName) {
            // Link existing brand
            const updateData: Record<string, unknown> = {
              close_lead_id: lead.id,
              close_status_id: lead.status_id,
              close_status_label: lead.status_label,
              close_custom_fields: lead.custom || {},
              close_contacts: lead.contacts || [],
              close_synced_at: new Date().toISOString(),
              source: "close",
            };

            if (logoUrl) {
              updateData.logo_url = logoUrl;
            }

            await supabase
              .from("brands")
              .update(updateData)
              .eq("id", matchByName.id);

            await logSyncEvent(supabase, "lead", lead.id, matchByName.id, "linked", "inbound", "scheduled", lead);
            totalLinked++;
          } else {
            // Create new brand
            const slug = generateSlug(lead.name || "brand");

            const { data: newBrand, error: insertError } = await supabase
              .from("brands")
              .insert({
                name: lead.name,
                slug,
                description: lead.description,
                website_url: lead.url,
                logo_url: logoUrl,
                brand_type: "Lead",
                is_active: true,
                source: "close",
                close_lead_id: lead.id,
                close_status_id: lead.status_id,
                close_status_label: lead.status_label,
                close_custom_fields: lead.custom || {},
                close_contacts: lead.contacts || [],
                close_synced_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (insertError) {
              safeError("Failed to create brand from lead", { leadId: lead.id, error: insertError });
              await logSyncEvent(supabase, "lead", lead.id, null, "created", "inbound", "scheduled", lead, "error", insertError.message);
            } else {
              await logSyncEvent(supabase, "lead", lead.id, newBrand?.id, "created", "inbound", "scheduled", lead);
              totalImported++;
            }
          }
        }

        hasMore = !!data.has_more;
        skip += limitPerPage;

        // Safety limit to prevent infinite loops
        if (skip > 10000) {
          safeLog("Safety limit reached", { skip });
          break;
        }
      }

      await updateSyncSettings(supabase, "full");

      safeLog("Full sync completed", { totalImported, totalLinked, totalSkipped, totalLogos });

      return new Response(JSON.stringify({
        success: true,
        sync_type: "full",
        imported: totalImported,
        linked: totalLinked,
        skipped: totalSkipped,
        logos_fetched: totalLogos,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // INCREMENTAL SYNC
    // =====================
    if (action === "incremental_sync") {
      const lastSyncTime = await getLastSyncTime(supabase);

      let query = `/lead/?_skip=0&_limit=${limitPerPage}`;
      if (lastSyncTime) {
        // Close API uses date_updated for filtering
        query += `&date_updated__gt=${lastSyncTime}`;
      }

      const { data, error } = await closeApiRequest("GET", query, closeApiKey) as {
        data: { data?: unknown[]; has_more?: boolean };
        error: string | null;
      };

      if (error) {
        safeError("Failed to fetch leads for incremental sync", error);
        return new Response(JSON.stringify({ error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const leads = (data.data || []) as Array<{
        id: string;
        name?: string;
        description?: string;
        url?: string;
        status_id?: string;
        status_label?: string;
        custom?: Record<string, unknown>;
        contacts?: Array<{ emails?: Array<{ email: string }> }>;
      }>;

      let updated = 0;
      let created = 0;
      let logosUpdated = 0;

      for (const lead of leads) {
        // Check if brand exists for this lead
        const { data: existingBrand } = await supabase
          .from("brands")
          .select("id, logo_url")
          .eq("close_lead_id", lead.id)
          .single();

        if (existingBrand) {
          // Update existing brand
          const updateData: Record<string, unknown> = {
            close_status_id: lead.status_id,
            close_status_label: lead.status_label,
            close_custom_fields: lead.custom || {},
            close_contacts: lead.contacts || [],
            close_synced_at: new Date().toISOString(),
          };

          // Update logo if missing or low quality
          if (!existingBrand.logo_url || existingBrand.logo_url.includes("google.com/s2/favicons")) {
            const logoUrl = await getLogoForLead(lead);
            if (logoUrl && !logoUrl.includes("google.com/s2/favicons")) {
              updateData.logo_url = logoUrl;
              logosUpdated++;
            }
          }

          await supabase
            .from("brands")
            .update(updateData)
            .eq("id", existingBrand.id);

          await logSyncEvent(supabase, "lead", lead.id, existingBrand.id, "updated", "inbound", "scheduled", lead);
          updated++;
        } else {
          // Try to match by name first
          const { data: matchByName } = await supabase
            .from("brands")
            .select("id, logo_url")
            .ilike("name", lead.name || "")
            .is("close_lead_id", null)
            .single();

          const logoUrl = await getLogoForLead(lead);
          if (logoUrl) logosUpdated++;

          if (matchByName) {
            // Link existing brand
            const updateData: Record<string, unknown> = {
              close_lead_id: lead.id,
              close_status_id: lead.status_id,
              close_status_label: lead.status_label,
              close_custom_fields: lead.custom || {},
              close_contacts: lead.contacts || [],
              close_synced_at: new Date().toISOString(),
              source: "close",
            };

            if (logoUrl && (!matchByName.logo_url || matchByName.logo_url.includes("google.com/s2/favicons"))) {
              updateData.logo_url = logoUrl;
            }

            await supabase
              .from("brands")
              .update(updateData)
              .eq("id", matchByName.id);

            await logSyncEvent(supabase, "lead", lead.id, matchByName.id, "linked", "inbound", "scheduled", lead);
            updated++;
          } else {
            // Create new brand
            const slug = generateSlug(lead.name || "brand");

            const { data: newBrand } = await supabase
              .from("brands")
              .insert({
                name: lead.name,
                slug,
                description: lead.description,
                website_url: lead.url,
                logo_url: logoUrl,
                brand_type: "Lead",
                is_active: true,
                source: "close",
                close_lead_id: lead.id,
                close_status_id: lead.status_id,
                close_status_label: lead.status_label,
                close_custom_fields: lead.custom || {},
                close_contacts: lead.contacts || [],
                close_synced_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            await logSyncEvent(supabase, "lead", lead.id, newBrand?.id, "created", "inbound", "scheduled", lead);
            created++;
          }
        }
      }

      await updateSyncSettings(supabase, "incremental");

      safeLog("Incremental sync completed", { updated, created, logosUpdated, leadsProcessed: leads.length });

      return new Response(JSON.stringify({
        success: true,
        sync_type: "incremental",
        updated,
        created,
        logos_updated: logosUpdated,
        leads_processed: leads.length,
        has_more: data.has_more,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // SYNC STATUS
    // =====================
    if (action === "status") {
      const { data: settings } = await supabase
        .from("system_settings")
        .select("value, updated_at")
        .eq("key", "close_sync")
        .single();

      return new Response(JSON.stringify({
        success: true,
        last_full_sync_at: settings?.value?.last_full_sync_at,
        last_incremental_sync_at: settings?.value?.last_incremental_sync_at,
        updated_at: settings?.updated_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: full_sync, incremental_sync, or status" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    safeError("Close scheduled sync error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
