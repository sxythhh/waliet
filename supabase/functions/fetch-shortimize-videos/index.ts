import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry and exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      // Rate limited - wait and retry with exponential backoff
      const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.log(`Rate limited (429), waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
      await delay(waitTime);
      lastError = new Error(`Rate limited after ${maxRetries} attempts`);
      continue;
    }
    
    return response;
  }
  
  throw lastError || new Error('Max retries exceeded');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      brandId, 
      collectionName,
      page = 1,
      limit = 100,
      orderBy = 'uploaded_at',
      orderDirection = 'desc',
      username,
      uploadedAtStart,
      uploadedAtEnd
    } = await req.json();

    if (!brandId) {
      throw new Error('brandId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the brand's Shortimize API key and collection name
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('shortimize_api_key, collection_name')
      .eq('id', brandId)
      .single();

    if (brandError) {
      console.error('Error fetching brand:', brandError);
      throw new Error('Failed to fetch brand');
    }

    if (!brand?.shortimize_api_key) {
      throw new Error('Shortimize API key not configured for this brand');
    }

    // Use provided collection name or fall back to brand's collection
    const collection = collectionName || brand.collection_name;

    // Build query parameters
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('order_by', orderBy);
    params.append('order_direction', orderDirection);
    
    if (collection) {
      params.append('collections', collection.trim());
      console.log('Filtering by collection:', collection.trim());
    } else {
      console.log('No collection specified - this may return all organization videos');
    }
    if (username) {
      params.append('username', username);
    }
    if (uploadedAtStart) {
      params.append('uploaded_at_start', uploadedAtStart);
    }
    if (uploadedAtEnd) {
      params.append('uploaded_at_end', uploadedAtEnd);
    }

    // Fetch videos from Shortimize API with retry logic
    const response = await fetchWithRetry(
      `https://api.shortimize.com/videos?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${brand.shortimize_api_key}`,
        },
      },
      3
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shortimize API error:', errorText);
      throw new Error(`Shortimize API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      videos: result.data || [],
      pagination: result.pagination || { total: 0, page: 1, limit: 100, total_pages: 0 }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-shortimize-videos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});