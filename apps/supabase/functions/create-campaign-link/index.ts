import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateLinkRequest {
  brandId: string;
  campaignId?: string;
  boostId?: string;
  assignedTo?: string;
  destinationUrl: string;
  title?: string;
  description?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  useDub?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreateLinkRequest = await req.json();
    const { 
      brandId, 
      campaignId, 
      boostId, 
      assignedTo, 
      destinationUrl, 
      title, 
      description,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      useDub 
    } = body;

    if (!brandId || !destinationUrl) {
      return new Response(
        JSON.stringify({ error: 'brandId and destinationUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is brand member
    const { data: isMember } = await supabase.rpc('is_brand_member', {
      _user_id: user.id,
      _brand_id: brandId
    });

    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'Not authorized for this brand' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate short code
    const { data: shortCode, error: codeError } = await supabase.rpc('generate_short_code');
    
    if (codeError) {
      console.error('Error generating short code:', codeError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate short code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let dubLinkId = null;
    let dubShortLink = null;

    // Optional Dub integration - get API key from brand settings
    if (useDub) {
      // Fetch the brand's Dub API key
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('dub_api_key')
        .eq('id', brandId)
        .single();

      const dubApiKey = brand?.dub_api_key;
      
      if (dubApiKey) {
        try {
          // Build destination URL with UTM params
          const urlWithUtm = new URL(destinationUrl);
          if (utmSource) urlWithUtm.searchParams.set('utm_source', utmSource);
          if (utmMedium) urlWithUtm.searchParams.set('utm_medium', utmMedium);
          if (utmCampaign) urlWithUtm.searchParams.set('utm_campaign', utmCampaign);
          if (utmContent) urlWithUtm.searchParams.set('utm_content', utmContent);

          const dubResponse = await fetch('https://api.dub.co/links', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${dubApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: urlWithUtm.toString(),
              key: shortCode,
              title: title || `Campaign Link - ${shortCode}`,
              description: description,
            }),
          });

          if (dubResponse.ok) {
            const dubData = await dubResponse.json();
            dubLinkId = dubData.id;
            dubShortLink = dubData.shortLink;
            console.log('Created Dub link:', dubShortLink);
          } else {
            console.warn('Dub API error:', await dubResponse.text());
          }
        } catch (dubError) {
          console.error('Dub integration error:', dubError);
          // Continue without Dub - fallback to internal tracking
        }
      } else {
        console.log('No Dub API key configured for brand');
      }
    }

    // Create the link in our database
    const { data: link, error: insertError } = await supabase
      .from('campaign_links')
      .insert({
        brand_id: brandId,
        campaign_id: campaignId || null,
        bounty_campaign_id: boostId || null,
        assigned_to: assignedTo || null,
        short_code: shortCode,
        destination_url: destinationUrl,
        title: title || null,
        description: description || null,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        dub_link_id: dubLinkId,
        dub_short_link: dubShortLink,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating link:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the tracking URL
    const trackingUrl = dubShortLink || `${supabaseUrl}/functions/v1/track-link-click?code=${shortCode}`;

    console.log('Campaign link created:', { id: link.id, shortCode, trackingUrl });

    return new Response(
      JSON.stringify({ 
        success: true, 
        link: {
          ...link,
          trackingUrl,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-campaign-link:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
