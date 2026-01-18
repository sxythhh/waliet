import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { safeLog, safeError, truncateId } from "../_shared/logging.ts";

// Reclaim Protocol credentials - ONLY available server-side
const RECLAIM_APP_ID = Deno.env.get("RECLAIM_APP_ID") || "";
const RECLAIM_APP_SECRET = Deno.env.get("RECLAIM_APP_SECRET") || "";

// Provider IDs
const PROVIDERS: Record<string, string> = {
  tiktok_account: "603b4a67-f8fe-42bf-8154-4c88a2672244",
  tiktok_demographics: "6392b7c7-684e-4a08-814d-f12fe085fd65",
  tiktok_video: "9ec60ce1-e131-428c-b4fc-865f9782a09c",
  instagram_account: "7729ae3e-179c-4ac8-8c5d-4bcd909c864d",
  instagram_post: "04c62f5c-acd6-4ac0-a2f7-4d614a406ab6",
};

interface InitRequest {
  social_account_id: string;
  provider_type: keyof typeof PROVIDERS;
  video_id?: string; // For video/post-specific verification
}

/**
 * Initialize Reclaim verification session server-side
 * This keeps the RECLAIM_APP_SECRET secure on the server
 *
 * Flow:
 * 1. Client calls this endpoint with provider type and optional video_id
 * 2. Server creates signed Reclaim request using secret
 * 3. Returns request URL for QR code/redirect
 * 4. User completes verification on their device
 * 5. Proof is submitted to verify-zktls-proof endpoint
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // Validate credentials are configured
    if (!RECLAIM_APP_ID || !RECLAIM_APP_SECRET) {
      safeError("Reclaim credentials not configured");
      return new Response(
        JSON.stringify({ error: "Verification service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: InitRequest = await req.json();
    const { social_account_id, provider_type, video_id } = body;

    if (!social_account_id || !provider_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: social_account_id, provider_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate provider type
    const providerId = PROVIDERS[provider_type];
    if (!providerId) {
      return new Response(
        JSON.stringify({
          error: "Invalid provider_type",
          valid_types: Object.keys(PROVIDERS)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the social account
    const { data: socialAccount, error: saError } = await supabaseClient
      .from("social_accounts")
      .select("id, user_id, platform, username")
      .eq("id", social_account_id)
      .single();

    if (saError || !socialAccount) {
      return new Response(
        JSON.stringify({ error: "Social account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (socialAccount.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You do not own this social account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check provider/platform match
    const platform = socialAccount.platform.toLowerCase();
    const isValidPlatformProvider =
      (platform === "tiktok" && provider_type.startsWith("tiktok_")) ||
      (platform === "instagram" && provider_type.startsWith("instagram_"));

    if (!isValidPlatformProvider) {
      return new Response(
        JSON.stringify({
          error: `Provider type ${provider_type} is not valid for platform ${platform}`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if video_id is required
    const requiresVideoId = provider_type === "tiktok_video" || provider_type === "instagram_post";
    if (requiresVideoId && !video_id) {
      return new Response(
        JSON.stringify({ error: `video_id is required for ${provider_type} verification` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    safeLog("Initializing Reclaim verification", {
      userId: truncateId(user.id),
      socialAccountId: truncateId(social_account_id),
      providerType: provider_type,
      hasVideoId: !!video_id,
    });

    // Generate session ID for tracking
    const sessionId = `reclaim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Build context for video/post verification
    const context: Record<string, string> = {};
    if (video_id) {
      if (platform === "instagram") {
        context.content_id = video_id;
      } else {
        context.postId = video_id;
      }
    }

    // Build the Reclaim request URL using their API
    // Using the Reclaim Protocol API to create a signed verification request
    const timestamp = Math.floor(Date.now() / 1000);

    // Create a simple signature for the request
    // In production, you'd use proper HMAC signing
    const encoder = new TextEncoder();
    const data = encoder.encode(`${RECLAIM_APP_ID}:${providerId}:${timestamp}:${RECLAIM_APP_SECRET}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Construct request URL params
    const requestParams = new URLSearchParams({
      appId: RECLAIM_APP_ID,
      providerId: providerId,
      sessionId: sessionId,
      timestamp: timestamp.toString(),
      signature: signature.substring(0, 64), // First 64 chars of hash
      ...(video_id && { context: JSON.stringify(context) }),
    });

    // Generate the verification URL
    // This is the URL that users scan with Reclaim app or browser
    const requestUrl = `https://share.reclaimprotocol.org/verify?${requestParams.toString()}`;

    // Store session for later verification tracking (optional)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Optional: Store pending verification session
    await supabaseAdmin
      .from("zktls_pending_sessions")
      .upsert({
        session_id: sessionId,
        user_id: user.id,
        social_account_id,
        provider_id: providerId,
        provider_type,
        video_id: video_id || null,
        status: "pending",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
      }, { onConflict: "session_id" })
      .single();

    safeLog("Reclaim verification initialized", {
      sessionId: truncateId(sessionId),
      providerType: provider_type,
    });

    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionId,
        request_url: requestUrl,
        provider_id: providerId,
        provider_type,
        expires_in_seconds: 1800, // 30 minutes
        instructions: {
          mobile: "Scan the QR code with the Reclaim app to verify your account",
          desktop: "Click the link or scan with your phone camera",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    safeError("Error initializing Reclaim verification", error);
    return new Response(
      JSON.stringify({
        error: "Failed to initialize verification",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
