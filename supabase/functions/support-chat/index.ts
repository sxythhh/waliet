import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4000;

// RAG configuration
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const RAG_ENABLED = !!OPENAI_API_KEY;
const RAG_TIMEOUT_MS = 2000; // Timeout for RAG retrieval
const RAG_SIMILARITY_THRESHOLD = 0.65;
const RAG_MAX_EXAMPLES = 3;

// Training data import configuration
const EMBEDDING_MODEL = "text-embedding-3-small";
const IMPORT_BATCH_SIZE = 100;

interface SimilarConversation {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  similarity: number;
}

interface QAPair {
  question: string;
  answer: string;
  category?: string;
}

interface EmbeddingResult {
  id: string;
  question: string;
  success: boolean;
  error?: string;
}

interface ImportResponse {
  success: boolean;
  imported: number;
  errors: number;
  results: EmbeddingResult[];
}

/**
 * Generate embedding for a query using OpenAI API
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    console.warn("RAG: OPENAI_API_KEY not configured");
    return [];
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: query,
      }),
    });

    if (!response.ok) {
      console.error("RAG: Embedding API error:", response.status);
      return [];
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (err) {
    console.error("RAG: Failed to generate embedding:", err);
    return [];
  }
}

/**
 * Generate embeddings for an array of texts using OpenAI API (batch)
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

/**
 * Verify user is an admin
 */
async function verifyAdmin(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    console.error("Error checking admin role:", error);
    return false;
  }

  return !!data;
}

/**
 * Handle training data import action
 */
async function handleTrainingImport(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  qaPairs: QAPair[]
): Promise<ImportResponse> {
  const results: EmbeddingResult[] = [];

  console.log(`Processing ${qaPairs.length} Q&A pairs for user ${userId}`);

  // Process in batches
  for (let i = 0; i < qaPairs.length; i += IMPORT_BATCH_SIZE) {
    const batch = qaPairs.slice(i, i + IMPORT_BATCH_SIZE);
    const questions = batch.map((p) => p.question);

    console.log(`Processing batch ${Math.floor(i / IMPORT_BATCH_SIZE) + 1}/${Math.ceil(qaPairs.length / IMPORT_BATCH_SIZE)}`);

    try {
      // Generate embeddings for the batch
      const embeddings = await generateEmbeddings(questions);

      // Prepare insert data
      const insertData = batch.map((pair, idx) => ({
        question: pair.question,
        answer: pair.answer,
        category: pair.category || null,
        question_embedding: `[${embeddings[idx].join(",")}]`,
        source: "import",
        imported_by: userId,
      }));

      // Insert batch into database
      const { data, error } = await supabase
        .from("training_conversations")
        .insert(insertData)
        .select("id, question");

      if (error) {
        console.error("Database insert error:", error);
        batch.forEach((pair) => {
          results.push({
            id: "",
            question: pair.question.slice(0, 50),
            success: false,
            error: error.message,
          });
        });
      } else {
        data?.forEach((row: { id: string; question: string }) => {
          results.push({
            id: row.id,
            question: row.question.slice(0, 50),
            success: true,
          });
        });
      }
    } catch (err) {
      console.error("Batch processing error:", err);
      batch.forEach((pair) => {
        results.push({
          id: "",
          question: pair.question.slice(0, 50),
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  console.log(`Import complete: ${successCount} success, ${errorCount} errors`);

  return {
    success: errorCount === 0,
    imported: successCount,
    errors: errorCount,
    results,
  };
}

/**
 * Retrieve similar conversations from the training data using vector similarity
 */
async function retrieveSimilarConversations(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  query: string,
  limit: number = RAG_MAX_EXAMPLES
): Promise<SimilarConversation[]> {
  try {
    const embedding = await generateQueryEmbedding(query);
    if (embedding.length === 0) return [];

    const { data, error } = await supabaseClient.rpc("match_training_conversations", {
      query_embedding: `[${embedding.join(",")}]`,
      match_count: limit,
      similarity_threshold: RAG_SIMILARITY_THRESHOLD,
    });

    if (error) {
      console.error("RAG: Retrieval error:", error);
      return [];
    }

    // Update retrieval stats (fire and forget)
    if (data?.length > 0) {
      const ids = data.map((d: SimilarConversation) => d.id);
      supabaseClient
        .from("training_conversations")
        .update({
          retrieval_count: supabaseClient.sql`retrieval_count + 1`,
          last_retrieved_at: new Date().toISOString(),
        })
        .in("id", ids)
        .then(() => {
          console.log(`RAG: Updated retrieval stats for ${ids.length} conversations`);
        })
        .catch((err: Error) => {
          console.warn("RAG: Failed to update retrieval stats:", err);
        });
    }

    console.log(`RAG: Retrieved ${data?.length || 0} similar conversations`);
    return data || [];
  } catch (err) {
    console.error("RAG: Retrieval failed:", err);
    return [];
  }
}

/**
 * Build the system prompt with RAG examples if available
 */
function buildSystemPrompt(similarConversations: SimilarConversation[], includeTools: boolean): string {
  const basePrompt = `You are a friendly and helpful AI support assistant for Virality, a platform that connects creators with brands for UGC campaigns.

Your role is to help users with:
- Account setup and profile questions
- Campaign applications and participation
- Payout and earnings inquiries
- Platform features and how to use them
- Technical issues and troubleshooting
- General questions about how Virality works`;

  const toolInstructions = includeTools
    ? `

When to create a support ticket:
- You cannot resolve the technical issue
- The user explicitly asks for human support
- The issue involves billing disputes or refunds
- Account verification or identity issues
- The user seems frustrated and needs personal attention
- Complex payout or payment issues
- Any issue requiring account-level changes`
    : `

If you cannot solve an issue, let the user know they can ask you to create a support ticket to reach the human support team.`;

  // Build RAG context section if we have similar conversations
  let ragContext = "";
  if (similarConversations.length > 0) {
    const examples = similarConversations
      .map(
        (conv, i) =>
          `Example ${i + 1}:
User: ${conv.question}
Assistant: ${conv.answer}`
      )
      .join("\n\n");

    ragContext = `

Here are some relevant examples of how to respond to similar questions:

${examples}

Use these examples as guidance for tone, detail level, and response structure. Adapt your response to the specific question asked.`;
  }

  return `${basePrompt}${ragContext}

Be concise, friendly, and helpful.${toolInstructions}

Keep responses brief and to the point. Use bullet points when listing multiple items. Don't use excessive emojis.`;
}

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

    const { action, messages, qa_pairs } = body;

    // Handle training data import action (admin only)
    if (action === "import") {
      // Verify admin role
      const isAdmin = await verifyAdmin(supabaseService, user.id);
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate input
      if (!qa_pairs || !Array.isArray(qa_pairs) || qa_pairs.length === 0) {
        return new Response(JSON.stringify({ error: "qa_pairs array required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check OPENAI_API_KEY is configured
      if (!OPENAI_API_KEY) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured. Please add it to Supabase secrets." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const result = await handleTrainingImport(supabaseService, user.id, qa_pairs);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Import error:", err);
        return new Response(JSON.stringify({
          error: err instanceof Error ? err.message : "Import failed",
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle test embedding action (admin only)
    if (action === "test") {
      const isAdmin = await verifyAdmin(supabaseService, user.id);
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!OPENAI_API_KEY) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const testText = body.text || "How do I reset my password?";
      try {
        const embeddings = await generateEmbeddings([testText]);
        return new Response(
          JSON.stringify({
            success: true,
            text: testText,
            dimensions: embeddings[0].length,
            sample: embeddings[0].slice(0, 5),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Default: chat action

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

    // Extract the latest user message for RAG retrieval
    const latestUserMessage = messages
      .filter((m: { role: string }) => m.role === "user")
      .pop()?.content || "";

    // Retrieve similar conversations using RAG (with timeout protection)
    let similarConversations: SimilarConversation[] = [];
    if (RAG_ENABLED && latestUserMessage) {
      try {
        const ragPromise = retrieveSimilarConversations(
          supabaseService,
          latestUserMessage,
          RAG_MAX_EXAMPLES
        );
        const timeoutPromise = new Promise<SimilarConversation[]>((_, reject) =>
          setTimeout(() => reject(new Error("RAG timeout")), RAG_TIMEOUT_MS)
        );

        similarConversations = await Promise.race([ragPromise, timeoutPromise]);
        console.log(`Support chat: RAG retrieved ${similarConversations.length} examples`);
      } catch (err) {
        console.warn("Support chat: RAG retrieval skipped:", err instanceof Error ? err.message : err);
        // Continue without RAG context
      }
    }

    // Build system prompt with RAG context
    const systemPromptWithTools = buildSystemPrompt(similarConversations, true);

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
            content: systemPromptWithTools,
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
    // Build system prompt without tool instructions for streaming
    const systemPromptForStreaming = buildSystemPrompt(similarConversations, false);

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
            content: systemPromptForStreaming,
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
