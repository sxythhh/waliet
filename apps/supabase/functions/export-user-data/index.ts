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

    const userId = user.id;

    // Collect all user data from various tables
    const exportData: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      userId: userId,
      email: user.email,
    };

    // 1. Profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    exportData.profile = profile;

    // 2. Wallet data
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    exportData.wallet = wallet;

    // 3. Wallet transactions
    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.transactions = transactions || [];

    // 4. Social accounts
    const { data: socialAccounts } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId);
    exportData.socialAccounts = socialAccounts || [];

    // 5. User sessions
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.sessions = sessions || [];

    // 6. Payment ledger entries
    const { data: payments } = await supabase
      .from('payment_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.payments = payments || [];

    // 7. Campaign applications
    const { data: applications } = await supabase
      .from('campaign_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.campaignApplications = applications || [];

    // 8. Video submissions
    const { data: submissions } = await supabase
      .from('video_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.videoSubmissions = submissions || [];

    // 9. Boost submissions
    const { data: boostSubmissions } = await supabase
      .from('bounty_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    exportData.boostSubmissions = boostSubmissions || [];

    // 10. Referral data
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    exportData.referrals = referrals || [];

    // 11. Portfolio data
    const { data: portfolio } = await supabase
      .from('creator_portfolios')
      .select('*')
      .eq('user_id', userId)
      .single();
    exportData.portfolio = portfolio;

    // 12. Notification preferences (from profiles)
    const notificationFields = [
      'notify_email_new_campaigns',
      'notify_email_transactions',
      'notify_email_weekly_roundup',
      'notify_email_campaign_updates',
      'notify_email_payout_status',
      'notify_discord_new_campaigns',
      'notify_discord_transactions',
      'notify_discord_campaign_updates',
      'notify_discord_payout_status',
    ];
    exportData.notificationPreferences = {};
    if (profile) {
      notificationFields.forEach(field => {
        if (field in profile) {
          exportData.notificationPreferences[field] = profile[field];
        }
      });
    }

    // 13. Demographic data
    const { data: demographics } = await supabase
      .from('demographic_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    exportData.demographics = demographics?.[0] || null;

    // Log this export for audit
    await supabase.rpc('log_security_event', {
      p_action_type: 'data_export',
      p_entity_type: 'user',
      p_entity_id: userId,
      p_actor_id: userId,
      p_metadata: { tables_exported: Object.keys(exportData).length }
    });

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="virality-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
    );

  } catch (error) {
    console.error('Error exporting user data:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to export data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
