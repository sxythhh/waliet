import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

const POSTHOG_API_KEY = Deno.env.get('POSTHOG_API_KEY');
const POSTHOG_PROJECT_ID = Deno.env.get('POSTHOG_PROJECT_ID');
const POSTHOG_HOST = 'https://us.i.posthog.com';

interface InsightResult {
  result: any[];
  next?: string;
}

async function queryPostHog(query: string, params?: Record<string, any>): Promise<any> {
  if (!POSTHOG_API_KEY) {
    throw new Error('POSTHOG_API_KEY not configured');
  }

  const response = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PostHog API error:', errorText);
    throw new Error(`PostHog API error: ${response.status}`);
  }

  return response.json();
}

async function getInsight(shortId: string): Promise<InsightResult> {
  if (!POSTHOG_API_KEY) {
    throw new Error('POSTHOG_API_KEY not configured');
  }

  const response = await fetch(
    `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/insights/?short_id=${shortId}`,
    {
      headers: {
        'Authorization': `Bearer ${POSTHOG_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`PostHog insight error: ${response.status}`);
  }

  return response.json();
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

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if PostHog is configured
    if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
      const missing = [];
      if (!POSTHOG_API_KEY) missing.push('POSTHOG_API_KEY');
      if (!POSTHOG_PROJECT_ID) missing.push('POSTHOG_PROJECT_ID');
      return new Response(
        JSON.stringify({
          configured: false,
          error: 'PostHog not fully configured',
          message: `Add ${missing.join(' and ')} to your Supabase secrets`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '7d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];

    // Validate date format (YYYY-MM-DD) as defense-in-depth against SQL injection
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDateStr) || !dateRegex.test(endDateStr)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Escape single quotes in date strings (additional safety measure)
    const safeStartDate = startDateStr.replace(/'/g, "''");
    const safeEndDate = endDateStr.replace(/'/g, "''");

    // Query 1: Total pageviews and unique visitors
    const pageviewsQuery = `
      SELECT
        count() as pageviews,
        count(DISTINCT distinct_id) as unique_visitors
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= toDateTime('${safeStartDate}')
        AND timestamp <= toDateTime('${safeEndDate} 23:59:59')
    `;

    // Query 2: Sessions count (using $session_id)
    const sessionsQuery = `
      SELECT
        count(DISTINCT properties.$session_id) as sessions
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= toDateTime('${safeStartDate}')
        AND timestamp <= toDateTime('${safeEndDate} 23:59:59')
    `;

    // Query 3: Pageviews by day
    const dailyQuery = `
      SELECT
        toDate(timestamp) as date,
        count() as pageviews,
        count(DISTINCT distinct_id) as unique_visitors
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= toDateTime('${safeStartDate}')
        AND timestamp <= toDateTime('${safeEndDate} 23:59:59')
      GROUP BY date
      ORDER BY date ASC
    `;

    // Query 4: Top pages
    const topPagesQuery = `
      SELECT
        properties.$pathname as pathname,
        count() as views
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= toDateTime('${safeStartDate}')
        AND timestamp <= toDateTime('${safeEndDate} 23:59:59')
      GROUP BY pathname
      ORDER BY views DESC
      LIMIT 10
    `;

    // Query 5: Device breakdown
    const devicesQuery = `
      SELECT
        properties.$device_type as device,
        count() as count
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= toDateTime('${safeStartDate}')
        AND timestamp <= toDateTime('${safeEndDate} 23:59:59')
      GROUP BY device
      ORDER BY count DESC
      LIMIT 5
    `;

    // Query 6: Browser breakdown
    const browsersQuery = `
      SELECT
        properties.$browser as browser,
        count() as count
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= toDateTime('${safeStartDate}')
        AND timestamp <= toDateTime('${safeEndDate} 23:59:59')
      GROUP BY browser
      ORDER BY count DESC
      LIMIT 5
    `;

    // Query 7: Country breakdown
    const countriesQuery = `
      SELECT
        properties.$geoip_country_code as country,
        count() as count
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= toDateTime('${safeStartDate}')
        AND timestamp <= toDateTime('${safeEndDate} 23:59:59')
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `;

    // Execute all queries in parallel
    const [
      pageviewsResult,
      sessionsResult,
      dailyResult,
      topPagesResult,
      devicesResult,
      browsersResult,
      countriesResult,
    ] = await Promise.all([
      queryPostHog(pageviewsQuery),
      queryPostHog(sessionsQuery),
      queryPostHog(dailyQuery),
      queryPostHog(topPagesQuery),
      queryPostHog(devicesQuery),
      queryPostHog(browsersQuery),
      queryPostHog(countriesQuery),
    ]);

    // Parse results
    const pageviews = pageviewsResult.results?.[0]?.[0] || 0;
    const uniqueVisitors = pageviewsResult.results?.[0]?.[1] || 0;
    const sessions = sessionsResult.results?.[0]?.[0] || 0;

    // Build daily data
    const dailyData = (dailyResult.results || []).map((row: any[]) => ({
      date: row[0],
      pageviews: row[1],
      uniqueVisitors: row[2],
    }));

    // Build top pages
    const topPages = (topPagesResult.results || []).map((row: any[]) => ({
      pathname: row[0] || '/',
      views: row[1],
    }));

    // Build device breakdown
    const devices = (devicesResult.results || []).map((row: any[]) => ({
      device: row[0] || 'Unknown',
      count: row[1],
    }));

    // Build browser breakdown
    const browsers = (browsersResult.results || []).map((row: any[]) => ({
      browser: row[0] || 'Unknown',
      count: row[1],
    }));

    // Build country breakdown
    const countries = (countriesResult.results || []).map((row: any[]) => ({
      country: row[0] || 'Unknown',
      count: row[1],
    }));

    // Calculate bounce rate (single page sessions / total sessions)
    // This is an approximation
    const bounceRate = sessions > 0
      ? Math.round((1 - (pageviews / sessions / 2)) * 100)
      : 0;

    // Calculate average pages per session
    const pagesPerSession = sessions > 0
      ? (pageviews / sessions).toFixed(1)
      : '0';

    return new Response(
      JSON.stringify({
        configured: true,
        period,
        dateRange: { start: startDateStr, end: endDateStr },
        summary: {
          pageviews,
          uniqueVisitors,
          sessions,
          bounceRate: Math.max(0, Math.min(100, bounceRate)),
          pagesPerSession,
        },
        dailyData,
        topPages,
        devices,
        browsers,
        countries,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in posthog-analytics:', error);
    // Return 200 with error so frontend can display the actual error message
    return new Response(
      JSON.stringify({
        configured: true,
        error: error.message || 'Failed to fetch analytics',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
