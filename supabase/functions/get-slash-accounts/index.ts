import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const slashApiKey = Deno.env.get('SLASH_API_KEY');
    
    if (!slashApiKey) {
      console.error('SLASH_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'SLASH_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching Slash accounts...');

    const response = await fetch('https://api.joinslash.com/account', {
      method: 'GET',
      headers: {
        'X-API-Key': slashApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Slash API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch accounts', 
        status: response.status,
        details: errorText 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Slash accounts response:', JSON.stringify(data, null, 2));

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching Slash accounts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
