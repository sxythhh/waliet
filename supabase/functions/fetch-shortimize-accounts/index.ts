import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { brandId, collections } = await req.json();

    if (!brandId) {
      return new Response(
        JSON.stringify({ error: 'Brand ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the brand's Shortimize API key
    const { data: brand, error: brandError } = await supabaseClient
      .from('brands')
      .select('shortimize_api_key')
      .eq('id', brandId)
      .single();

    if (brandError || !brand?.shortimize_api_key) {
      return new Response(
        JSON.stringify({ error: 'Shortimize API key not configured for this brand' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the URL with optional collections parameter
    let url = 'https://api.shortimize.com/accounts';
    if (collections) {
      url += `?collections=${encodeURIComponent(collections)}`;
    }

    // Call Shortimize API
    const shortimizeResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${brand.shortimize_api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!shortimizeResponse.ok) {
      const errorText = await shortimizeResponse.text();
      console.error('Shortimize API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Shortimize API', 
          status: shortimizeResponse.status,
          details: errorText 
        }),
        { status: shortimizeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await shortimizeResponse.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-shortimize-accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
