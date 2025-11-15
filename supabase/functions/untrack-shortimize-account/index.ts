import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { campaignId, socialAccountId } = await req.json();

    if (!campaignId || !socialAccountId) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID and social account ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Untracking account:', { campaignId, socialAccountId });

    // Get campaign and brand details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('brand_id, brands(shortimize_api_key)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brandData = Array.isArray(campaign.brands) ? campaign.brands[0] : campaign.brands;
    const shortimizeApiKey = brandData?.shortimize_api_key;

    if (!shortimizeApiKey) {
      console.log('No Shortimize API key configured for this campaign');
      return new Response(
        JSON.stringify({ success: true, message: 'No tracking configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get social account details
    const { data: socialAccount, error: accountError } = await supabaseClient
      .from('social_accounts')
      .select('username, platform')
      .eq('id', socialAccountId)
      .single();

    if (accountError || !socialAccount) {
      console.error('Social account not found:', accountError);
      return new Response(
        JSON.stringify({ error: 'Social account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the Shortimize account ID from analytics
    const { data: analytics, error: analyticsError } = await supabaseClient
      .from('campaign_account_analytics')
      .select('shortimize_account_id')
      .eq('campaign_id', campaignId)
      .eq('account_username', socialAccount.username)
      .eq('platform', socialAccount.platform)
      .maybeSingle();

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError);
    }

    if (!analytics?.shortimize_account_id) {
      console.log('No Shortimize account ID found for this account');
      return new Response(
        JSON.stringify({ success: true, message: 'Account not tracked in Shortimize' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Stopping tracking for Shortimize account ID:', analytics.shortimize_account_id);

    // Stop tracking in Shortimize
    const response = await fetch('https://api.shortimize.com/accounts', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${shortimizeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: analytics.shortimize_account_id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Shortimize API error:', response.status, errorData);
      
      // Don't fail the whole operation if Shortimize API fails
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account unlinked (Shortimize tracking removal failed)',
          shortimizeError: errorData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully stopped tracking in Shortimize');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account untracked successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in untrack-shortimize-account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
