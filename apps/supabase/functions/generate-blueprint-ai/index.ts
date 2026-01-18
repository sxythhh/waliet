import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface GenerateRequest {
  websiteUrl: string;
  brandId: string;
}

interface BlueprintFields {
  title?: string;
  content?: string;
  brand_voice?: string;
  hooks?: string[];
  talking_points?: string[];
  dos_and_donts?: {
    dos: string[];
    donts: string[];
  };
  call_to_action?: string;
  platforms?: string[];
}

/**
 * Fetch website content using a simple text extraction approach
 */
async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ViralityBot/1.0; +https://virality.gg)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status}`);
    }

    const html = await response.text();

    // Basic HTML to text extraction
    // Remove scripts, styles, and HTML tags
    let text = html
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove style tags and their content
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove noscript tags
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
      // Remove all HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  } catch (error) {
    console.error('Error fetching website:', error);
    throw new Error('Could not fetch website content. Please check the URL and try again.');
  }
}

/**
 * Use AI to generate blueprint fields from website content
 */
async function generateBlueprintFromContent(
  websiteContent: string,
  websiteUrl: string
): Promise<BlueprintFields> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    throw new Error('AI service not configured');
  }

  const systemPrompt = `You are a brand analyst that creates content creator guidelines based on brand websites.

Your task is to analyze website content and generate a structured content blueprint that creators can use when making content for this brand.

Return a JSON object with these fields:
- title: A clear name for this content blueprint (e.g., "[Brand Name] Creator Guidelines")
- content: A brief overview/summary of what content creators should know about this brand (2-3 paragraphs, can use HTML like <p>, <strong>, <ul>, <li>)
- brand_voice: Description of how the brand communicates - their tone, style, personality (1-2 sentences)
- hooks: Array of 3-5 attention-grabbing opening lines or hooks creators could use
- talking_points: Array of 3-5 key messages or product benefits to highlight
- dos_and_donts: Object with:
  - dos: Array of 3-4 things creators SHOULD do
  - donts: Array of 3-4 things creators should AVOID
- call_to_action: What viewers should do after watching (e.g., "Use code X for 20% off", "Check the link in bio")
- platforms: Array of recommended platforms based on the brand's target audience (lowercase: "tiktok", "instagram", "youtube", "twitter")

Important:
- Be specific and actionable, not generic
- Base everything on actual content from the website
- Keep hooks and talking points concise (1 sentence each)
- Make do's and don'ts practical for video creators
- Return ONLY valid JSON, no markdown or explanation`;

  // Limit content length
  const maxLength = 15000;
  const truncatedContent = websiteContent.slice(0, maxLength);

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
        {
          role: 'user',
          content: `Please analyze this website (${websiteUrl}) and generate a content creator blueprint:\n\n${truncatedContent}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI generation failed:', error);
    throw new Error('Failed to generate blueprint. Please try again.');
  }

  const result = await response.json();
  const generatedContent = result.choices?.[0]?.message?.content;

  if (!generatedContent) {
    throw new Error('No content generated');
  }

  try {
    const parsed = JSON.parse(generatedContent);
    return parsed as BlueprintFields;
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    throw new Error('Failed to process generated content');
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: GenerateRequest = await req.json();
    const { websiteUrl, brandId } = body;

    if (!websiteUrl) {
      return new Response(JSON.stringify({ error: 'Website URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL format
    let url: URL;
    try {
      url = new URL(websiteUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to the brand (if brandId provided)
    if (brandId) {
      const { data: membership } = await supabase
        .from('brand_memberships')
        .select('id')
        .eq('brand_id', brandId)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return new Response(JSON.stringify({ error: 'Access denied to this brand' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch website content
    console.log(`Fetching content from: ${url.href}`);
    const websiteContent = await fetchWebsiteContent(url.href);

    if (!websiteContent || websiteContent.length < 100) {
      return new Response(
        JSON.stringify({
          error: 'Could not extract enough content from the website. Please try a different page.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate blueprint using AI
    console.log(`Generating blueprint from ${websiteContent.length} characters of content`);
    const blueprintFields = await generateBlueprintFromContent(websiteContent, url.href);

    return new Response(JSON.stringify(blueprintFields), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-blueprint-ai:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
