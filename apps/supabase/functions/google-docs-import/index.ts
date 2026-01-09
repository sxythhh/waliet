import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface ImportRequest {
  action: 'list_documents' | 'fetch_document' | 'extract_blueprint';
  document_id?: string;
  document_content?: string;
}

interface GoogleDocument {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

interface BlueprintFields {
  title?: string;
  content?: string;
  brand_voice?: string;
  target_personas?: Array<{
    name: string;
    target_audience: string;
    description: string;
  }>;
  hooks?: string[];
  talking_points?: string[];
  dos_and_donts?: {
    dos: string[];
    donts: string[];
  };
  call_to_action?: string;
  hashtags?: string[];
  platforms?: string[];
}

const GOOGLE_DOCS_API = 'https://docs.googleapis.com/v1';
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Refresh Google access token if expired
 */
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh access token');
  }

  return await response.json();
}

/**
 * Get valid access token, refreshing if necessary
 */
async function getValidAccessToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  // Get current tokens
  const { data: tokens, error } = await supabase.rpc('get_google_docs_tokens', {
    p_user_id: userId,
  });

  if (error || !tokens || tokens.length === 0) {
    throw new Error('Google Docs not connected. Please connect your Google account first.');
  }

  const tokenData = tokens[0];
  const expiresAt = new Date(tokenData.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer

  // Check if token is still valid
  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return tokenData.access_token;
  }

  console.log('Access token expired, refreshing...');

  // Refresh the token
  const newTokens = await refreshAccessToken(
    tokenData.refresh_token,
    clientId,
    clientSecret
  );

  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // Update stored tokens
  await supabase.rpc('upsert_google_docs_tokens', {
    p_user_id: userId,
    p_access_token: newTokens.access_token,
    p_refresh_token: tokenData.refresh_token, // Keep existing refresh token
    p_token_expires_at: newExpiresAt,
    p_scope: tokenData.scope,
  });

  return newTokens.access_token;
}

/**
 * Extract text content from Google Docs API response
 */
function extractTextFromDocument(doc: { body?: { content?: unknown[] } }): string {
  if (!doc.body?.content) return '';

  const textParts: string[] = [];

  function extractFromElement(element: unknown): void {
    if (!element || typeof element !== 'object') return;

    const el = element as Record<string, unknown>;

    if (el.paragraph) {
      const para = el.paragraph as { elements?: unknown[] };
      if (para.elements) {
        for (const textEl of para.elements) {
          const textRun = (textEl as Record<string, unknown>).textRun as { content?: string } | undefined;
          if (textRun?.content) {
            textParts.push(textRun.content);
          }
        }
      }
    }

    if (el.table) {
      const table = el.table as { tableRows?: unknown[] };
      if (table.tableRows) {
        for (const row of table.tableRows) {
          const tableRow = row as { tableCells?: unknown[] };
          if (tableRow.tableCells) {
            for (const cell of tableRow.tableCells) {
              const tableCell = cell as { content?: unknown[] };
              if (tableCell.content) {
                for (const item of tableCell.content) {
                  extractFromElement(item);
                }
              }
            }
          }
        }
      }
    }

    if (el.tableOfContents) {
      const toc = el.tableOfContents as { content?: unknown[] };
      if (toc.content) {
        for (const item of toc.content) {
          extractFromElement(item);
        }
      }
    }
  }

  for (const item of doc.body.content) {
    extractFromElement(item);
  }

  return textParts.join('');
}

/**
 * Use AI to extract blueprint fields from document content
 */
async function extractBlueprintFields(content: string): Promise<BlueprintFields> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const systemPrompt = `You are a document analyzer that extracts brand guidelines and content brief information from documents.

Your task is to analyze the provided document and extract relevant information into a structured JSON format for a content blueprint.

Return a JSON object with these fields (only include fields you can confidently extract):
- title: The campaign or brand name (string)
- content: A brief summary/overview of the brand guidelines (string, can include HTML formatting like <p>, <ul>, <li>)
- brand_voice: Description of the brand's tone and voice (string)
- target_personas: Array of target audience personas, each with {name, target_audience, description}
- hooks: Array of attention-grabbing opening lines or hooks (strings)
- talking_points: Array of key messages or content requirements (strings)
- dos_and_donts: Object with {dos: string[], donts: string[]} - guidelines for creators
- call_to_action: What viewers should do after watching (string)
- hashtags: Array of hashtags to use (strings, with # prefix)
- platforms: Array of platforms mentioned (use lowercase: "tiktok", "instagram", "youtube", "twitter", "facebook")

Important:
- Only include fields where you find relevant information
- Be concise but comprehensive
- For hashtags, always include the # prefix
- For platforms, normalize to lowercase standard names
- Return ONLY valid JSON, no markdown formatting or explanation`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please extract blueprint fields from this document:\n\n${content}` },
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI extraction failed:', error);
    throw new Error('Failed to extract content from document');
  }

  const result = await response.json();
  const extractedContent = result.choices?.[0]?.message?.content;

  if (!extractedContent) {
    throw new Error('No content extracted from document');
  }

  try {
    // Parse the JSON response
    const parsed = JSON.parse(extractedContent);
    return parsed as BlueprintFields;
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    console.error('Response was:', extractedContent);
    throw new Error('Failed to parse extracted content');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ImportRequest = await req.json();
    const { action, document_id, document_content } = body;

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials');
      return new Response(JSON.stringify({ error: 'Google OAuth not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List user's recent Google Docs
    if (action === 'list_documents') {
      const accessToken = await getValidAccessToken(
        supabase,
        user.id,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
      );

      // Query for Google Docs only, ordered by last modified
      const params = new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.document'",
        orderBy: 'modifiedTime desc',
        pageSize: '20',
        fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
      });

      const response = await fetch(`${GOOGLE_DRIVE_API}/files?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to list documents:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch documents from Google Drive' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();

      return new Response(JSON.stringify({
        success: true,
        documents: data.files as GoogleDocument[],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch a specific document's content
    if (action === 'fetch_document') {
      if (!document_id) {
        return new Response(JSON.stringify({ error: 'document_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const accessToken = await getValidAccessToken(
        supabase,
        user.id,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
      );

      // Fetch the document content
      const response = await fetch(`${GOOGLE_DOCS_API}/documents/${document_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to fetch document:', error);

        if (response.status === 404) {
          return new Response(JSON.stringify({ error: 'Document not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ error: 'Failed to fetch document from Google Docs' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const doc = await response.json();
      const textContent = extractTextFromDocument(doc);

      return new Response(JSON.stringify({
        success: true,
        document: {
          id: doc.documentId,
          title: doc.title,
          content: textContent,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract blueprint fields from document content using AI
    if (action === 'extract_blueprint') {
      if (!document_content) {
        return new Response(JSON.stringify({ error: 'document_content is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Limit content length to prevent abuse
      const maxLength = 50000;
      const truncatedContent = document_content.slice(0, maxLength);

      if (document_content.length > maxLength) {
        console.warn(`Document content truncated from ${document_content.length} to ${maxLength} characters`);
      }

      const blueprintFields = await extractBlueprintFields(truncatedContent);

      return new Response(JSON.stringify({
        success: true,
        fields: blueprintFields,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in google-docs-import:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
