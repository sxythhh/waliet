import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4000;

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "create_support_ticket",
      description: "Create a support ticket to escalate the user's issue to the human support team. Use this when: 1) You cannot resolve the issue yourself, 2) The user explicitly asks to speak to a human, 3) The issue requires account-level changes you cannot make, 4) There's a billing dispute or sensitive matter, 5) The user seems frustrated and needs human assistance.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "A brief, clear subject line summarizing the issue (max 100 characters)"
          },
          category: {
            type: "string",
            enum: ["billing", "technical", "account", "campaign", "payout", "other"],
            description: "The category that best fits this issue"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
            description: "Priority level based on urgency: low (general questions), medium (affecting user experience), high (blocking user from using platform), urgent (financial issues or security concerns)"
          },
          summary: {
            type: "string",
            description: "A detailed summary of the conversation and the user's issue to help the support team understand the context"
          }
        },
        required: ["subject", "category", "priority", "summary"]
      }
    }
  }
];

// Function to create a support ticket
async function createSupportTicket(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  userId: string,
  params: {
    subject: string;
    category: string;
    priority: string;
    summary: string;
  }
): Promise<{ id: string; ticket_number: string }> {
  console.log(`Creating support ticket for user ${userId}:`, params);

  // Create the ticket
  const { data: ticket, error: ticketError } = await supabaseClient
    .from("support_tickets")
    .insert({
      user_id: userId,
      subject: params.subject.slice(0, 100),
      category: params.category,
      priority: params.priority,
      status: "open",
    })
    .select("id, ticket_number")
    .single();

  if (ticketError || !ticket) {
    console.error("Failed to create ticket:", ticketError);
    throw new Error(`Failed to create ticket: ${ticketError?.message || "Unknown error"}`);
  }

  console.log(`Ticket created: ${ticket.ticket_number}`);

  // Add the initial message with the conversation summary
  const { error: messageError } = await supabaseClient
    .from("ticket_messages")
    .insert({
      ticket_id: ticket.id,
      sender_id: userId,
      sender_type: "user",
      content: params.summary,
      is_internal: false,
    });

  if (messageError) {
    console.error("Failed to add ticket message:", messageError);
    // Don't throw - ticket was created successfully
  }

  return ticket as { id: string; ticket_number: string };
}

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    // Create service client for ticket creation (bypasses RLS)
    const supabaseService = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey)
      : supabaseClient;

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

    // First, make a non-streaming request to check for tool calls
    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

Be concise, friendly, and helpful. If you cannot solve an issue or the user asks to speak with a human, use the create_support_ticket function to escalate the case to the human support team.

When to create a support ticket:
- You cannot resolve the technical issue
- The user explicitly asks for human support
- The issue involves billing disputes or refunds
- Account verification or identity issues
- The user seems frustrated and needs personal attention
- Complex payout or payment issues
- Any issue requiring account-level changes

Keep responses brief and to the point. Use bullet points when listing multiple items. Don't use excessive emojis.`
          },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
        stream: false,
      }),
    });

    if (!initialResponse.ok) {
      if (initialResponse.status === 429) {
        console.warn(`Support chat: Rate limit exceeded for user ${user.id}`);
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (initialResponse.status === 402) {
        console.error("Support chat: Service payment required (402)");
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await initialResponse.text();
      console.error("AI gateway error:", initialResponse.status, text);
      return new Response(JSON.stringify({ error: "Failed to get response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const initialResult = await initialResponse.json();
    const choice = initialResult.choices?.[0];

    // Check if AI wants to call a tool
    if (choice?.message?.tool_calls?.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      
      if (toolCall.function.name === "create_support_ticket") {
        console.log("AI requested ticket creation");
        
        let ticketParams;
        try {
          ticketParams = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Failed to parse tool arguments:", e);
          return new Response(JSON.stringify({ 
            error: "Failed to process ticket creation" 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        try {
          const ticket = await createSupportTicket(supabaseService, user.id, ticketParams);
          
          // Return a special response indicating ticket was created
          return new Response(JSON.stringify({
            type: "ticket_created",
            ticket_number: ticket.ticket_number,
            ticket_id: ticket.id,
            message: `I've created a support ticket for you (${ticket.ticket_number}). Our support team will review your case and get back to you as soon as possible. You can track the status of your ticket in the Support section.`
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("Failed to create ticket:", e);
          return new Response(JSON.stringify({ 
            error: "Failed to create support ticket. Please try again or contact support@virality.gg directly." 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // No tool call - return the regular response as streaming
    // Make a new streaming request
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

Be concise, friendly, and helpful. If you cannot solve an issue, let the user know they can ask you to create a support ticket to reach the human support team.

Keep responses brief and to the point. Use bullet points when listing multiple items. Don't use excessive emojis.`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const text = await streamResponse.text();
      console.error("AI gateway streaming error:", streamResponse.status, text);
      return new Response(JSON.stringify({ error: "Failed to get response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(streamResponse.body, {
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
