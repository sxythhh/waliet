import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const whopApiKey = Deno.env.get('WHOP_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { brand_id } = await req.json();

    if (!brand_id) {
      return new Response(JSON.stringify({ error: 'brand_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is member of this brand
    const { data: memberData, error: memberError } = await supabase
      .from('brand_members')
      .select('role')
      .eq('brand_id', brand_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData) {
      return new Response(JSON.stringify({ error: 'Not authorized for this brand' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get brand with Whop company ID
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, whop_company_id, whop_onboarding_complete')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return new Response(JSON.stringify({ error: 'Brand not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate local wallet balance from brand_wallet_transactions
    const { data: transactions, error: txError } = await supabase
      .from('brand_wallet_transactions')
      .select('type, amount, status')
      .eq('brand_id', brand_id);

    if (txError) {
      console.error('Error fetching transactions:', txError);
    }

    const localBalance = (transactions || []).reduce((acc, tx) => {
      if (tx.status !== 'completed') return acc;
      const txAmount = Number(tx.amount) || 0;
      // Credit types add to balance
      if (['topup', 'refund', 'admin_credit'].includes(tx.type)) {
        return acc + txAmount;
      }
      // Debit types subtract from balance
      if (['withdrawal', 'campaign_allocation', 'boost_allocation', 'admin_debit'].includes(tx.type)) {
        return acc - txAmount;
      }
      return acc;
    }, 0);

    console.log(`Local wallet balance for brand ${brand_id}: $${localBalance}`);

    if (!brand.whop_company_id) {
      // Brand hasn't set up their Whop company yet - return local balance only
      return new Response(JSON.stringify({ 
        balance: localBalance,
        virality_balance: localBalance,
        withdraw_balance: 0,
        pending_balance: 0,
        currency: 'usd',
        has_whop_company: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch balance from Whop API
    console.log(`Fetching Whop balance for company: ${brand.whop_company_id}`);
    
    const whopResponse = await fetch(`https://api.whop.com/api/v5/ledger_accounts/${brand.whop_company_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${whopApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!whopResponse.ok) {
      const errorText = await whopResponse.text();
      console.error('Whop API error:', errorText);
      
      // If the company doesn't have a ledger yet, return local balance only
      if (whopResponse.status === 404) {
        return new Response(JSON.stringify({ 
          balance: localBalance,
          virality_balance: localBalance,
          withdraw_balance: 0,
          pending_balance: 0,
          currency: 'usd',
          has_whop_company: true,
          onboarding_complete: brand.whop_onboarding_complete
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to fetch balance', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ledgerData = await whopResponse.json();
    console.log('Whop ledger data:', JSON.stringify(ledgerData, null, 2));

    // Handle both old format (direct balance) and new format (balanceCaches.nodes)
    let whopBalance = 0;
    let pendingBalance = 0;
    let currency = 'usd';

    // Check for new API structure with balanceCaches
    if (ledgerData.balanceCaches?.nodes?.length > 0) {
      // Find USD balance or use first available
      const usdBalance = ledgerData.balanceCaches.nodes.find((n: any) => n.currency === 'usd');
      const balanceNode = usdBalance || ledgerData.balanceCaches.nodes[0];
      // Whop returns balance in cents, convert to dollars
      whopBalance = (balanceNode?.balance || 0) / 100;
      pendingBalance = (balanceNode?.pendingBalance || 0) / 100;
      currency = balanceNode?.currency || 'usd';
    } else if (ledgerData.balance !== undefined) {
      // Old format - balance might be in cents
      whopBalance = ledgerData.balance / 100;
      pendingBalance = (ledgerData.pending_balance || 0) / 100;
      currency = ledgerData.currency || 'usd';
    }

    console.log(`Parsed Whop balance: $${whopBalance}, pending: $${pendingBalance}`);

    const totalBalance = whopBalance + localBalance;

    return new Response(JSON.stringify({ 
      balance: totalBalance,
      virality_balance: localBalance,
      withdraw_balance: whopBalance,
      pending_balance: pendingBalance,
      currency: currency,
      has_whop_company: true,
      onboarding_complete: brand.whop_onboarding_complete
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in get-brand-balance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
