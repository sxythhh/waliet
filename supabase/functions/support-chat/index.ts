import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Support chat: Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user with Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Support chat: Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Support chat: Invalid authentication", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Support chat: Authenticated user ${user.id}`);

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = body;

    // Validate messages array
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages must be an array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: `Too many messages. Maximum allowed: ${MAX_MESSAGES}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each message structure and content length
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (!msg || typeof msg !== "object") {
        return new Response(
          JSON.stringify({ error: `Invalid message at index ${i}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!msg.role || !["user", "assistant", "system"].includes(msg.role)) {
        return new Response(
          JSON.stringify({ error: `Invalid role in message at index ${i}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!msg.content || typeof msg.content !== "string") {
        return new Response(
          JSON.stringify({ error: `Invalid content in message at index ${i}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (msg.content.length > MAX_MESSAGE_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Message at index ${i} exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("Support chat: LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a friendly and helpful AI support assistant for Virality, a platform that connects creators with brands for UGC campaigns. 

Your role is to help users with:
- Account setup and profile questions
- Campaign applications and participation
- Payout and earnings inquiries
- Platform features and how to use them
- Technical issues and troubleshooting
- General questions about how Virality works

Be concise, friendly, and helpful. If you cannot solve an issue, let the user know they can reach out to the human support team at support@virality.gg.

Keep responses brief and to the point. Use bullet points when listing multiple items. Don't use excessive emojis.`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`Support chat: Rate limit exceeded for user ${user.id}`);
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error("Support chat: Service payment required (402)");
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Failed to get response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
