import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { accountUrl, campaignId, collectionNames, trackingType } = await req.json();

    if (!accountUrl) {
      return new Response(
        JSON.stringify({ error: 'Account URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let shortimizeApiKey: string | null = null;
    let finalCollectionNames = collectionNames || [];

    // If campaignId is provided, get the brand's Shortimize API key and collection name
    if (campaignId) {
      const { data: campaign, error: campaignError } = await supabaseClient
        .from('campaigns')
        .select('brand_id, brands(shortimize_api_key, collection_name)')
        .eq('id', campaignId)
        .single();

      if (campaignError) {
        console.error('Error fetching campaign:', campaignError);
      } else if (campaign) {
        const brandData = Array.isArray(campaign.brands) ? campaign.brands[0] : campaign.brands;
        shortimizeApiKey = brandData?.shortimize_api_key;
        
        // Use brand's collection_name if available and no collection names were provided
        if (brandData?.collection_name && finalCollectionNames.length === 0) {
          finalCollectionNames = [brandData.collection_name];
        }
      }
    }

    // Fall back to global API key if brand doesn't have one
    if (!shortimizeApiKey) {
      shortimizeApiKey = Deno.env.get('SHORTIMIZE_API_KEY') || null;
    }

    if (!shortimizeApiKey) {
      console.log('No Shortimize API key configured');
      return new Response(
        JSON.stringify({ success: true, message: 'No Shortimize tracking configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tracking account:', accountUrl, 'with collections:', finalCollectionNames);

    // Track the account in Shortimize
    const response = await fetch('https://api.shortimize.com/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${shortimizeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        link: accountUrl,
        collection_names: finalCollectionNames,
        tracking_type: trackingType || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Shortimize API error:', response.status, data);
      
      // Check if account already tracked
      if (data.properties?.error?.includes('already tracked')) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Account already tracked',
            accountId: data.properties?.accountId,
            directUrl: data.properties?.directUrl,
            alreadyTracked: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: `Shortimize API error: ${response.status}`,
          details: data 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Account tracked successfully:', data);

    return new Response(
      JSON.stringify({
        success: true,
        accountId: data.properties?.accountId,
        directUrl: data.properties?.directUrl,
        message: 'Account is now being tracked',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in track-shortimize-account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
