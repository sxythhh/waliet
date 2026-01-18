import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeLog, safeError } from "../_shared/logging.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Fetch Brand Logo Edge Function
 *
 * Attempts to fetch a logo for a brand using:
 * 1. Clearbit Logo API (https://logo.clearbit.com/{domain})
 * 2. Google Favicon API fallback (https://www.google.com/s2/favicons?domain={domain}&sz=128)
 */

// Extract domain from URL or email
function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;

  try {
    // If it's an email, extract domain from after @
    if (input.includes("@") && !input.includes("://")) {
      const domain = input.split("@").pop()?.toLowerCase().trim();
      return domain || null;
    }

    // If it's a URL, parse it
    let url = input;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    // If parsing fails, try to clean up the input
    const cleaned = input
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .split("/")[0]
      .toLowerCase()
      .trim();

    // Basic domain validation
    if (cleaned.includes(".") && !cleaned.includes(" ")) {
      return cleaned;
    }

    return null;
  }
}

// Check if a URL returns a valid image
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

// Fetch logo URL with fallback strategy
async function fetchLogoUrl(domain: string): Promise<{ url: string | null; source: string | null }> {
  // Try Clearbit first (higher quality logos)
  const clearbitUrl = `https://logo.clearbit.com/${domain}`;
  if (await isValidImageUrl(clearbitUrl)) {
    return { url: clearbitUrl, source: "clearbit" };
  }

  // Fallback to Google Favicon (always works but lower quality)
  const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  if (await isValidImageUrl(googleFaviconUrl)) {
    return { url: googleFaviconUrl, source: "google_favicon" };
  }

  return { url: null, source: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, domain, website_url, email, brand_id } = await req.json();

    // =====================
    // FETCH LOGO URL ONLY
    // =====================
    if (action === "fetch_logo_url") {
      const targetDomain = domain || extractDomain(website_url) || extractDomain(email);

      if (!targetDomain) {
        return new Response(JSON.stringify({ error: "No domain provided or extractable" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await fetchLogoUrl(targetDomain);

      return new Response(JSON.stringify({
        success: true,
        domain: targetDomain,
        logo_url: result.url,
        source: result.source,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // FETCH AND UPDATE BRAND LOGO
    // =====================
    if (action === "fetch_and_update") {
      if (!brand_id) {
        return new Response(JSON.stringify({ error: "brand_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch brand
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("id, name, website_url, logo_url, close_contacts")
        .eq("id", brand_id)
        .single();

      if (brandError || !brand) {
        return new Response(JSON.stringify({ error: "Brand not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If brand already has a logo that's not from Google, skip
      if (brand.logo_url && !brand.logo_url.includes("google.com/s2/favicons")) {
        return new Response(JSON.stringify({
          success: true,
          skipped: true,
          message: "Brand already has a logo",
          logo_url: brand.logo_url,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try to get domain from various sources
      let targetDomain = extractDomain(website_url) || extractDomain(brand.website_url);

      // Try contacts if no domain yet
      if (!targetDomain && brand.close_contacts && Array.isArray(brand.close_contacts)) {
        for (const contact of brand.close_contacts) {
          if (contact.emails && Array.isArray(contact.emails)) {
            for (const emailObj of contact.emails) {
              targetDomain = extractDomain(emailObj.email);
              if (targetDomain) break;
            }
          }
          if (targetDomain) break;
        }
      }

      if (!targetDomain) {
        return new Response(JSON.stringify({
          success: false,
          error: "Could not extract domain from brand data",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch logo
      const result = await fetchLogoUrl(targetDomain);

      if (!result.url) {
        return new Response(JSON.stringify({
          success: false,
          error: "Could not fetch logo for domain",
          domain: targetDomain,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update brand with logo
      const { error: updateError } = await supabase
        .from("brands")
        .update({ logo_url: result.url })
        .eq("id", brand_id);

      if (updateError) {
        safeError("Failed to update brand logo", updateError);
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to update brand",
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      safeLog("Brand logo updated", { brandId: brand_id, domain: targetDomain, source: result.source });

      return new Response(JSON.stringify({
        success: true,
        brand_id,
        domain: targetDomain,
        logo_url: result.url,
        source: result.source,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================
    // BATCH FETCH LOGOS
    // =====================
    if (action === "batch_fetch") {
      const { brand_ids, limit = 50 } = await req.json();

      // Get brands without logos or with Google favicon
      let query = supabase
        .from("brands")
        .select("id, name, website_url, logo_url, close_contacts")
        .limit(limit);

      if (brand_ids && Array.isArray(brand_ids) && brand_ids.length > 0) {
        query = query.in("id", brand_ids);
      } else {
        // Only brands missing logo or with Google favicon
        query = query.or("logo_url.is.null,logo_url.ilike.%google.com/s2/favicons%");
      }

      const { data: brands, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let updated = 0;
      let failed = 0;
      const results: Array<{ id: string; name: string; success: boolean; logo_url?: string }> = [];

      for (const brand of brands || []) {
        let targetDomain = extractDomain(brand.website_url);

        if (!targetDomain && brand.close_contacts && Array.isArray(brand.close_contacts)) {
          for (const contact of brand.close_contacts) {
            if (contact.emails && Array.isArray(contact.emails)) {
              for (const emailObj of contact.emails) {
                targetDomain = extractDomain(emailObj.email);
                if (targetDomain) break;
              }
            }
            if (targetDomain) break;
          }
        }

        if (!targetDomain) {
          failed++;
          results.push({ id: brand.id, name: brand.name, success: false });
          continue;
        }

        const logoResult = await fetchLogoUrl(targetDomain);

        if (logoResult.url) {
          await supabase
            .from("brands")
            .update({ logo_url: logoResult.url })
            .eq("id", brand.id);
          updated++;
          results.push({ id: brand.id, name: brand.name, success: true, logo_url: logoResult.url });
        } else {
          failed++;
          results.push({ id: brand.id, name: brand.name, success: false });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        updated,
        failed,
        total: brands?.length || 0,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    safeError("fetch-brand-logo error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
