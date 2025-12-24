import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple hash function for IP anonymization
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Parse device info from user agent
function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let device = 'desktop';
  let browser = 'unknown';
  let os = 'unknown';

  // Device detection
  if (/mobile/i.test(ua)) {
    device = 'mobile';
  } else if (/tablet|ipad/i.test(ua)) {
    device = 'tablet';
  }

  // Browser detection
  if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/edge|edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/opera|opr/i.test(ua)) {
    browser = 'Opera';
  }

  // OS detection
  if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/macintosh|mac os/i.test(ua)) {
    os = 'macOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  }

  return { device, browser, os };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const shortCode = url.searchParams.get('code');

    if (!shortCode) {
      return new Response('Missing code parameter', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Find the link
    const { data: link, error: linkError } = await supabase
      .from('campaign_links')
      .select('*')
      .eq('short_code', shortCode)
      .eq('is_active', true)
      .single();

    if (linkError || !link) {
      console.error('Link not found:', shortCode);
      return new Response('Link not found', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Get visitor info
    const userAgent = req.headers.get('user-agent') || '';
    const referrer = req.headers.get('referer') || '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('cf-connecting-ip') || 
               'unknown';
    
    const ipHash = hashIP(ip);
    const { device, browser, os } = parseUserAgent(userAgent);

    // Try to get country from Cloudflare header
    const country = req.headers.get('cf-ipcountry') || null;
    const city = req.headers.get('cf-ipcity') || null;

    // Check if this is a unique click (hasn't clicked in last 24 hours)
    const { data: recentClick } = await supabase
      .from('link_clicks')
      .select('id')
      .eq('link_id', link.id)
      .eq('ip_hash', ipHash)
      .gte('clicked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    const isUniqueClick = !recentClick;

    // Record the click
    const { error: clickError } = await supabase
      .from('link_clicks')
      .insert({
        link_id: link.id,
        ip_hash: ipHash,
        country,
        city,
        device,
        browser,
        os,
        referrer,
        user_agent: userAgent.substring(0, 500), // Limit length
      });

    if (clickError) {
      console.error('Error recording click:', clickError);
    }

    // Update click counts
    const { error: updateError } = await supabase
      .from('campaign_links')
      .update({
        total_clicks: link.total_clicks + 1,
        unique_clicks: isUniqueClick ? link.unique_clicks + 1 : link.unique_clicks,
      })
      .eq('id', link.id);

    if (updateError) {
      console.error('Error updating click counts:', updateError);
    }

    console.log('Click tracked:', { 
      linkId: link.id, 
      shortCode, 
      device, 
      country,
      isUnique: isUniqueClick 
    });

    // Build redirect URL with UTM params
    let redirectUrl = link.destination_url;
    try {
      const destUrl = new URL(link.destination_url);
      if (link.utm_source) destUrl.searchParams.set('utm_source', link.utm_source);
      if (link.utm_medium) destUrl.searchParams.set('utm_medium', link.utm_medium);
      if (link.utm_campaign) destUrl.searchParams.set('utm_campaign', link.utm_campaign);
      if (link.utm_content) destUrl.searchParams.set('utm_content', link.utm_content);
      redirectUrl = destUrl.toString();
    } catch (e) {
      console.warn('Invalid destination URL, using as-is:', link.destination_url);
    }

    // Redirect to destination
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error in track-link-click:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
