import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { safeLog, safeError, truncateId } from "../_shared/logging.ts";

interface WhopUser {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  profile_pic_url?: string;
}

interface WhopTokenResponse {
  user: WhopUser;
  membership_id?: string;
  company_id?: string;
  product_id?: string;
  plan_id?: string;
}

// Verify Whop token by calling Whop API
async function verifyWhopToken(token: string, apiKey: string): Promise<WhopTokenResponse | null> {
  try {
    // Decode the JWT to extract user info (Whop tokens are JWTs)
    // First, try to verify with Whop's me endpoint
    const response = await fetch("https://api.whop.com/api/v5/me", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      safeError("Whop token verification failed", { status: response.status });
      return null;
    }

    const data = await response.json();
    safeLog("Whop user verified", { userId: truncateId(data.id) });

    return {
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        username: data.username,
        profile_pic_url: data.profile_pic_url,
      },
      membership_id: data.membership_id,
      company_id: data.company_id,
      product_id: data.product_id,
      plan_id: data.plan_id,
    };
  } catch (err) {
    safeError("Error verifying Whop token", err);
    return null;
  }
}

// Find or create Supabase user linked to Whop
async function findOrCreateUser(
  supabase: ReturnType<typeof createClient>,
  whopUser: WhopUser,
): Promise<{ userId: string; isNew: boolean } | null> {
  // First, check if user exists by whop_user_id
  const { data: existingByWhop, error: whopLookupError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("whop_user_id", whopUser.id)
    .maybeSingle();

  if (whopLookupError) {
    safeError("Error looking up user by whop_user_id", whopLookupError);
  }

  if (existingByWhop) {
    safeLog("Found existing user by whop_user_id", { userId: truncateId(existingByWhop.id) });
    return { userId: existingByWhop.id, isNew: false };
  }

  // If not found by whop_user_id, try to find by email and link
  if (whopUser.email) {
    const { data: existingByEmail, error: emailLookupError } = await supabase
      .from("profiles")
      .select("id, whop_user_id")
      .eq("email", whopUser.email)
      .maybeSingle();

    if (emailLookupError) {
      safeError("Error looking up user by email", emailLookupError);
    }

    if (existingByEmail) {
      // Link Whop account to existing user
      const { error: linkError } = await supabase
        .from("profiles")
        .update({
          whop_user_id: whopUser.id,
          whop_email: whopUser.email,
          whop_linked_at: new Date().toISOString(),
        })
        .eq("id", existingByEmail.id);

      if (linkError) {
        safeError("Error linking Whop account", linkError);
        return null;
      }

      safeLog("Linked Whop account to existing user", { userId: truncateId(existingByEmail.id) });
      return { userId: existingByEmail.id, isNew: false };
    }
  }

  // No existing user found - create a new one via Supabase Auth
  // Generate a placeholder email if Whop doesn't provide one
  const email = whopUser.email || `whop_${whopUser.id}@whop.placeholder`;

  const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true, // Auto-confirm since we trust Whop
    user_metadata: {
      whop_user_id: whopUser.id,
      full_name: whopUser.name || whopUser.username,
      avatar_url: whopUser.profile_pic_url,
      provider: "whop",
    },
  });

  if (createError) {
    safeError("Error creating auth user", createError);
    return null;
  }

  if (!authUser.user) {
    safeError("No user returned from createUser");
    return null;
  }

  // Update profile with Whop-specific fields (profile auto-created by trigger)
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      whop_user_id: whopUser.id,
      whop_email: whopUser.email,
      whop_linked_at: new Date().toISOString(),
      full_name: whopUser.name || whopUser.username,
      avatar_url: whopUser.profile_pic_url,
    })
    .eq("id", authUser.user.id);

  if (updateError) {
    safeError("Error updating profile with Whop fields", updateError);
    // Continue anyway - user was created
  }

  safeLog("Created new user from Whop", { userId: truncateId(authUser.user.id) });
  return { userId: authUser.user.id, isNew: true };
}

// Generate a Supabase session for the user
async function generateSession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ access_token: string; refresh_token: string; expires_at: number } | null> {
  // Use admin API to generate a session link, then extract tokens
  // Note: This creates a magic link that we can use to generate a session
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: "", // We'll look up the email
  });

  // Alternative approach: use service role to sign in on behalf of user
  // For now, we'll return the user ID and let the frontend use it for authenticated calls
  // The frontend will need to handle session establishment differently

  // Return user info that frontend can use
  return null; // Frontend will handle session differently for Whop auth
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const whopApiKey = Deno.env.get("WHOP_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Whop token from header
    const whopToken = req.headers.get("x-whop-user-token");

    if (!whopToken) {
      return new Response(
        JSON.stringify({ error: "Missing x-whop-user-token header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify token and get user info
    const whopData = await verifyWhopToken(whopToken, whopApiKey || "");

    if (!whopData) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired Whop token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Find or create Supabase user
    const result = await findOrCreateUser(supabase, whopData.user);

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Failed to create or link user" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Get full profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", result.userId)
      .single();

    if (profileError) {
      safeError("Error fetching profile", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Return user data
    // Frontend will use this for authenticated API calls by including whop token
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: profile.id,
          email: profile.email || profile.whop_email,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          whop_user_id: profile.whop_user_id,
          account_type: profile.account_type,
          onboarding_completed: profile.onboarding_completed,
        },
        whop: {
          membership_id: whopData.membership_id,
          company_id: whopData.company_id,
          product_id: whopData.product_id,
          plan_id: whopData.plan_id,
        },
        is_new_user: result.isNew,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    safeError("Whop auth error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: corsHeaders }
    );
  }
});
