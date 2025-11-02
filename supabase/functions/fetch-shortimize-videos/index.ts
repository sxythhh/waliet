import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandId, collectionName } = await req.json();

    if (!brandId || !collectionName) {
      throw new Error('brandId and collectionName are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the brand's Shortimize API key
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('shortimize_api_key')
      .eq('id', brandId)
      .single();

    if (brandError) {
      console.error('Error fetching brand:', brandError);
      throw new Error('Failed to fetch brand');
    }

    if (!brand?.shortimize_api_key) {
      throw new Error('Shortimize API key not configured for this brand');
    }

    // Fetch videos from Shortimize API
    const encodedCollection = encodeURIComponent(collectionName.trim());
    const response = await fetch(
      `https://api.shortimize.com/videos?collections=${encodedCollection}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${brand.shortimize_api_key}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shortimize API error:', errorText);
      throw new Error(`Shortimize API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify(result.data || []), {
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
