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

    const { brandId, adId, startDate, endDate } = await req.json();

    if (!brandId || !adId) {
      return new Response(
        JSON.stringify({ error: 'Brand ID and Ad ID are required' }),
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

    // Build the URL with optional date parameters
    let url = `https://api.shortimize.com/videos/${adId}/history`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    console.log('Fetching video history from:', url);

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
      throw new Error(`Shortimize API error: ${shortimizeResponse.status} - ${errorText}`);
    }

    const historyData = await shortimizeResponse.json();
    console.log('Video history fetched successfully:', historyData.length, 'records');

    return new Response(
      JSON.stringify(historyData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-video-history:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
