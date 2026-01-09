import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const CLOSE_API_BASE = "https://api.close.com/api/v1";

interface LeadInput {
  name: string;
  email: string;
  phone?: string;
  status?: string;
  created?: string;
  last_contact?: string;
  utm_campaign?: string;
  utm_source?: string;
  utm_medium?: string;
}

interface ImportResult {
  imported: Array<{ email: string; close_lead_id: string; name: string }>;
  skipped: Array<{ email: string; reason: string; name: string }>;
  errors: Array<{ email: string; error: string; name: string }>;
}

// Make Close API request
async function closeApiRequest(
  method: string,
  endpoint: string,
  apiKey: string,
  body?: unknown
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

// Check if a lead with this email already exists in Close
async function checkEmailExists(email: string, apiKey: string): Promise<boolean> {
  const query = encodeURIComponent(`email:${email}`);
  const { data, error } = await closeApiRequest("GET", `/lead/?query=${query}`, apiKey);

  if (error) {
    console.error("Error checking email:", error);
    return false; // Assume doesn't exist if we can't check
  }

  const result = data as { data?: unknown[] };
  return (result.data?.length || 0) > 0;
}

// Create a lead in Close with contact
async function createLead(
  lead: LeadInput,
  statusId: string | undefined,
  apiKey: string
): Promise<{ success: boolean; lead_id?: string; error?: string }> {
  const leadData: Record<string, unknown> = {
    name: lead.name || lead.email.split("@")[0], // Use email prefix if no name
    contacts: [
      {
        name: lead.name || undefined,
        emails: [{ email: lead.email, type: "office" }],
        phones: lead.phone ? [{ phone: lead.phone, type: "office" }] : undefined,
      },
    ],
  };

  // Add status if provided
  if (statusId) {
    leadData.status_id = statusId;
  }

  // Add custom fields
  const customFields: Record<string, string> = {};
  if (lead.created) customFields.original_created_date = lead.created;
  if (lead.last_contact) customFields.last_contact_date = lead.last_contact;
  if (lead.utm_campaign) customFields.utm_campaign = lead.utm_campaign;
  if (lead.utm_source) customFields.utm_source = lead.utm_source;
  if (lead.utm_medium) customFields.utm_medium = lead.utm_medium;

  if (Object.keys(customFields).length > 0) {
    leadData.custom = customFields;
  }

  const { data, error } = await closeApiRequest("POST", "/lead/", apiKey, leadData);

  if (error) {
    return { success: false, error };
  }

  const result = data as { id: string };
  return { success: true, lead_id: result.id };
}

// Process leads in batches
async function processLeads(
  leads: LeadInput[],
  statusMapping: Record<string, string>,
  apiKey: string,
  batchSize: number = 10
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: [],
    skipped: [],
    errors: [],
  };

  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (lead) => {
        try {
          // Check for duplicate
          const exists = await checkEmailExists(lead.email, apiKey);
          if (exists) {
            result.skipped.push({
              email: lead.email,
              name: lead.name,
              reason: "Email already exists in Close",
            });
            return;
          }

          // Get status ID from mapping
          const statusId = lead.status ? statusMapping[lead.status] : undefined;

          // Create lead
          const createResult = await createLead(lead, statusId, apiKey);
          if (createResult.success && createResult.lead_id) {
            result.imported.push({
              email: lead.email,
              name: lead.name,
              close_lead_id: createResult.lead_id,
            });
          } else {
            result.errors.push({
              email: lead.email,
              name: lead.name,
              error: createResult.error || "Unknown error",
            });
          }
        } catch (err) {
          result.errors.push({
            email: lead.email,
            name: lead.name,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      })
    );

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < leads.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const closeApiKey = Deno.env.get("CLOSE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if Close API key is configured
    if (!closeApiKey) {
      return new Response(
        JSON.stringify({
          error: "Close API key not configured",
          message: "Add CLOSE_API_KEY to your Supabase secrets",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action, ...params } = await req.json();

    // =====================
    // GET LEAD STATUSES
    // =====================
    if (action === "get_statuses") {
      const { data, error } = await closeApiRequest("GET", "/status/lead/", closeApiKey);

      if (error) {
        return new Response(JSON.stringify({ error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statuses = data as { data: Array<{ id: string; label: string }> };
      return new Response(JSON.stringify({ statuses: statuses.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // IMPORT LEADS
    // =====================
    if (action === "import") {
      const { leads, status_mapping } = params as {
        leads: LeadInput[];
        status_mapping: Record<string, string>;
      };

      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        return new Response(JSON.stringify({ error: "No leads provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Starting import of ${leads.length} leads`);

      const result = await processLeads(leads, status_mapping || {}, closeApiKey);

      console.log(
        `Import complete: ${result.imported.length} imported, ${result.skipped.length} skipped, ${result.errors.length} errors`
      );

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in import-leads-to-close:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
