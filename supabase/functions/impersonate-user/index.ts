import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the authorization header to verify admin status
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create client with user's token to verify they are admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !callingUser) {
      throw new Error("Unauthorized");
    }

    // Check if calling user is admin
    const { data: roleData, error: roleError } = await supabaseUser.rpc("has_role", {
      _user_id: callingUser.id,
      _role: "admin"
    });

    if (roleError || !roleData) {
      throw new Error("Only admins can impersonate users");
    }

    // Get target user ID from request body
    const { userId } = await req.json();
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get the target user's email
    const { data: { user: targetUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !targetUser?.email) {
      throw new Error("Target user not found or has no email");
    }

    // Generate a magic link for the target user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://app.virality.gg"}/dashboard`
      }
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Link generation error:", linkError);
      throw new Error("Failed to generate impersonation link");
    }

    return new Response(
      JSON.stringify({ magicLink: linkData.properties.action_link }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Impersonation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
