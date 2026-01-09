import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsRequest {
  linkId?: string;
  brandId?: string;
  campaignId?: string;
  boostId?: string;
  startDate?: string;
  endDate?: string;
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

    const url = new URL(req.url);
    const linkId = url.searchParams.get('linkId');
    const brandId = url.searchParams.get('brandId');
    const campaignId = url.searchParams.get('campaignId');
    const boostId = url.searchParams.get('boostId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!linkId && !brandId) {
      return new Response(
        JSON.stringify({ error: 'linkId or brandId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If specific link requested
    if (linkId) {
      const { data: link, error: linkError } = await supabase
        .from('campaign_links')
        .select(`
          *,
          assigned_user:profiles!campaign_links_assigned_to_fkey(id, username, full_name, avatar_url)
        `)
        .eq('id', linkId)
        .single();

      if (linkError || !link) {
        return new Response(
          JSON.stringify({ error: 'Link not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user has access
      const { data: isMember } = await supabase.rpc('is_brand_member', {
        _user_id: user.id,
        _brand_id: link.brand_id
      });

      if (!isMember && link.assigned_to !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Not authorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get click analytics
      let clicksQuery = supabase
        .from('link_clicks')
        .select('*')
        .eq('link_id', linkId)
        .order('clicked_at', { ascending: false });

      if (startDate) {
        clicksQuery = clicksQuery.gte('clicked_at', startDate);
      }
      if (endDate) {
        clicksQuery = clicksQuery.lte('clicked_at', endDate);
      }

      const { data: clicks } = await clicksQuery.limit(1000);

      // Get conversions
      let conversionsQuery = supabase
        .from('link_conversions')
        .select('*')
        .eq('link_id', linkId)
        .order('converted_at', { ascending: false });

      if (startDate) {
        conversionsQuery = conversionsQuery.gte('converted_at', startDate);
      }
      if (endDate) {
        conversionsQuery = conversionsQuery.lte('converted_at', endDate);
      }

      const { data: conversions } = await conversionsQuery;

      // Aggregate stats
      const clicksByCountry: Record<string, number> = {};
      const clicksByDevice: Record<string, number> = {};
      const clicksByBrowser: Record<string, number> = {};
      const clicksByDay: Record<string, number> = {};

      (clicks || []).forEach(click => {
        // Country
        const country = click.country || 'Unknown';
        clicksByCountry[country] = (clicksByCountry[country] || 0) + 1;
        
        // Device
        const device = click.device || 'unknown';
        clicksByDevice[device] = (clicksByDevice[device] || 0) + 1;
        
        // Browser
        const browser = click.browser || 'unknown';
        clicksByBrowser[browser] = (clicksByBrowser[browser] || 0) + 1;
        
        // Day
        const day = click.clicked_at.split('T')[0];
        clicksByDay[day] = (clicksByDay[day] || 0) + 1;
      });

      return new Response(
        JSON.stringify({
          link,
          analytics: {
            totalClicks: link.total_clicks,
            uniqueClicks: link.unique_clicks,
            totalConversions: link.total_conversions,
            conversionValue: link.conversion_value,
            conversionRate: link.unique_clicks > 0 
              ? ((link.total_conversions / link.unique_clicks) * 100).toFixed(2) 
              : 0,
            clicksByCountry,
            clicksByDevice,
            clicksByBrowser,
            clicksByDay,
            recentClicks: (clicks || []).slice(0, 50),
            conversions: conversions || [],
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all links for a brand/campaign/boost
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

    let linksQuery = supabase
      .from('campaign_links')
      .select(`
        *,
        assigned_user:profiles!campaign_links_assigned_to_fkey(id, username, full_name, avatar_url)
      `)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (campaignId) {
      linksQuery = linksQuery.eq('campaign_id', campaignId);
    }
    if (boostId) {
      linksQuery = linksQuery.eq('bounty_campaign_id', boostId);
    }

    const { data: links, error: linksError } = await linksQuery;

    if (linksError) {
      console.error('Error fetching links:', linksError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch links' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate totals
    const totals = (links || []).reduce((acc, link) => ({
      totalClicks: acc.totalClicks + (link.total_clicks || 0),
      uniqueClicks: acc.uniqueClicks + (link.unique_clicks || 0),
      totalConversions: acc.totalConversions + (link.total_conversions || 0),
      conversionValue: acc.conversionValue + parseFloat(link.conversion_value || 0),
    }), {
      totalClicks: 0,
      uniqueClicks: 0,
      totalConversions: 0,
      conversionValue: 0,
    });

    return new Response(
      JSON.stringify({
        links: links || [],
        totals,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-link-analytics:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
