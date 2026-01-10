import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface ImportRequest {
  action: 'list_pages' | 'fetch_page' | 'extract_blueprint' | 'search_pages';
  page_id?: string;
  page_content?: string;
  query?: string;
}

interface NotionPage {
  id: string;
  title: string;
  icon?: string;
  cover?: string;
  lastEditedTime: string;
  url: string;
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

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * Get valid access token from database
 */
async function getAccessToken(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  const { data: tokens, error } = await supabase.rpc('get_notion_tokens', {
    p_user_id: userId,
  });

  if (error || !tokens || tokens.length === 0) {
    throw new Error('Notion not connected. Please connect your Notion account first.');
  }

  return tokens[0].access_token;
}

/**
 * Extract title from Notion page properties
 */
function extractTitle(page: Record<string, unknown>): string {
  const properties = page.properties as Record<string, unknown> | undefined;
  if (!properties) return 'Untitled';

  // Try to find the title property
  for (const [, prop] of Object.entries(properties)) {
    const propObj = prop as Record<string, unknown>;
    if (propObj.type === 'title') {
      const titleArray = propObj.title as Array<{ plain_text?: string }>;
      if (titleArray && titleArray.length > 0) {
        return titleArray.map(t => t.plain_text || '').join('');
      }
    }
  }

  return 'Untitled';
}

/**
 * Extract icon from Notion page
 */
function extractIcon(page: Record<string, unknown>): string | undefined {
  const icon = page.icon as Record<string, unknown> | undefined;
  if (!icon) return undefined;

  if (icon.type === 'emoji') {
    return icon.emoji as string;
  }
  if (icon.type === 'external') {
    return (icon.external as Record<string, unknown>)?.url as string;
  }
  if (icon.type === 'file') {
    return (icon.file as Record<string, unknown>)?.url as string;
  }

  return undefined;
}

/**
 * Convert Notion blocks to plain text
 */
function blocksToText(blocks: unknown[]): string {
  const textParts: string[] = [];

  function extractTextFromRichText(richText: unknown[]): string {
    if (!Array.isArray(richText)) return '';
    return richText.map((rt: unknown) => {
      const rtObj = rt as Record<string, unknown>;
      return rtObj.plain_text || '';
    }).join('');
  }

  function processBlock(block: unknown): void {
    const blockObj = block as Record<string, unknown>;
    const type = blockObj.type as string;

    switch (type) {
      case 'paragraph': {
        const para = blockObj.paragraph as Record<string, unknown>;
        const text = extractTextFromRichText(para.rich_text as unknown[]);
        if (text) textParts.push(text);
        break;
      }
      case 'heading_1':
      case 'heading_2':
      case 'heading_3': {
        const heading = blockObj[type] as Record<string, unknown>;
        const text = extractTextFromRichText(heading.rich_text as unknown[]);
        if (text) textParts.push(`\n## ${text}\n`);
        break;
      }
      case 'bulleted_list_item':
      case 'numbered_list_item': {
        const listItem = blockObj[type] as Record<string, unknown>;
        const text = extractTextFromRichText(listItem.rich_text as unknown[]);
        if (text) textParts.push(`• ${text}`);
        break;
      }
      case 'to_do': {
        const todo = blockObj.to_do as Record<string, unknown>;
        const text = extractTextFromRichText(todo.rich_text as unknown[]);
        const checked = todo.checked ? '✓' : '○';
        if (text) textParts.push(`${checked} ${text}`);
        break;
      }
      case 'toggle': {
        const toggle = blockObj.toggle as Record<string, unknown>;
        const text = extractTextFromRichText(toggle.rich_text as unknown[]);
        if (text) textParts.push(`▸ ${text}`);
        break;
      }
      case 'quote': {
        const quote = blockObj.quote as Record<string, unknown>;
        const text = extractTextFromRichText(quote.rich_text as unknown[]);
        if (text) textParts.push(`> ${text}`);
        break;
      }
      case 'callout': {
        const callout = blockObj.callout as Record<string, unknown>;
        const text = extractTextFromRichText(callout.rich_text as unknown[]);
        if (text) textParts.push(`📌 ${text}`);
        break;
      }
      case 'code': {
        const code = blockObj.code as Record<string, unknown>;
        const text = extractTextFromRichText(code.rich_text as unknown[]);
        if (text) textParts.push(`\`\`\`\n${text}\n\`\`\``);
        break;
      }
      case 'divider': {
        textParts.push('\n---\n');
        break;
      }
      case 'table': {
        // Table content is in children, handled separately
        break;
      }
      // Add more block types as needed
    }

    // Process children if present
    if (blockObj.has_children && Array.isArray(blockObj.children)) {
      for (const child of blockObj.children) {
        processBlock(child);
      }
    }
  }

  for (const block of blocks) {
    processBlock(block);
  }

  return textParts.join('\n');
}

/**
 * Recursively fetch all blocks from a page
 */
async function fetchAllBlocks(
  accessToken: string,
  blockId: string,
  maxDepth: number = 3
): Promise<unknown[]> {
  const allBlocks: unknown[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ page_size: '100' });
    if (cursor) params.set('start_cursor', cursor);

    const response = await fetch(
      `${NOTION_API_URL}/blocks/${blockId}/children?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': NOTION_VERSION,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch blocks:', await response.text());
      break;
    }

    const data = await response.json();
    const results = data.results as Record<string, unknown>[];

    // Fetch children for blocks that have them
    for (const block of results) {
      if (block.has_children && maxDepth > 0) {
        const children = await fetchAllBlocks(accessToken, block.id as string, maxDepth - 1);
        block.children = children;
      }
    }

    allBlocks.push(...results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return allBlocks;
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
      temperature: 0.3,
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    const { action, page_id, page_content, query } = body;

    // Search user's Notion pages
    if (action === 'search_pages') {
      const accessToken = await getAccessToken(supabase, user.id);

      const searchBody: Record<string, unknown> = {
        filter: {
          value: 'page',
          property: 'object',
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
        page_size: 20,
      };

      if (query) {
        searchBody.query = query;
      }

      const response = await fetch(`${NOTION_API_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to search pages:', error);
        return new Response(JSON.stringify({ error: 'Failed to search Notion pages' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const pages: NotionPage[] = data.results.map((page: Record<string, unknown>) => ({
        id: page.id,
        title: extractTitle(page),
        icon: extractIcon(page),
        lastEditedTime: page.last_edited_time,
        url: page.url,
      }));

      return new Response(JSON.stringify({
        success: true,
        pages,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List user's recent Notion pages (alias for search without query)
    if (action === 'list_pages') {
      const accessToken = await getAccessToken(supabase, user.id);

      const response = await fetch(`${NOTION_API_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            value: 'page',
            property: 'object',
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time',
          },
          page_size: 20,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to list pages:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch pages from Notion' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const pages: NotionPage[] = data.results.map((page: Record<string, unknown>) => ({
        id: page.id,
        title: extractTitle(page),
        icon: extractIcon(page),
        lastEditedTime: page.last_edited_time,
        url: page.url,
      }));

      return new Response(JSON.stringify({
        success: true,
        pages,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch a specific page's content
    if (action === 'fetch_page') {
      if (!page_id) {
        return new Response(JSON.stringify({ error: 'page_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const accessToken = await getAccessToken(supabase, user.id);

      // Fetch page metadata
      const pageResponse = await fetch(`${NOTION_API_URL}/pages/${page_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': NOTION_VERSION,
        },
      });

      if (!pageResponse.ok) {
        const error = await pageResponse.text();
        console.error('Failed to fetch page:', error);

        if (pageResponse.status === 404) {
          return new Response(JSON.stringify({ error: 'Page not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ error: 'Failed to fetch page from Notion' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pageData = await pageResponse.json();
      const title = extractTitle(pageData);

      // Fetch page content (blocks)
      const blocks = await fetchAllBlocks(accessToken, page_id);
      const textContent = blocksToText(blocks);

      return new Response(JSON.stringify({
        success: true,
        page: {
          id: page_id,
          title,
          content: textContent,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract blueprint fields from page content using AI
    if (action === 'extract_blueprint') {
      if (!page_content) {
        return new Response(JSON.stringify({ error: 'page_content is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Limit content length to prevent abuse
      const maxLength = 50000;
      const truncatedContent = page_content.slice(0, maxLength);

      if (page_content.length > maxLength) {
        console.warn(`Page content truncated from ${page_content.length} to ${maxLength} characters`);
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
    console.error('Error in notion-import:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
