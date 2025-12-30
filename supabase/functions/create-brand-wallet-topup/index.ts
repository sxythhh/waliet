import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeRedirectUrl(input: string | undefined | null) {
  const fallback = 'https://example.com';
  if (!input) return fallback;

  try {
    const url = new URL(input);
    url.searchParams.delete('__lovable_token');
    url.searchParams.delete('state_id');
    const sanitized = url.toString();
    if (sanitized.length > 1900) {
      return `${url.origin}${url.pathname}`;
    }
    return sanitized;
  } catch {
    return fallback;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const whopApiKey = Deno.env.get('WHOP_API_KEY')!;
    const parentCompanyId = Deno.env.get('WHOP_PARENT_COMPANY_ID')!;
    
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

    const { brand_id, amount, total_amount, return_url, transaction_id } = await req.json();
    
    // Use total_amount (includes processing fee) for billing, amount for crediting wallet
    const chargeAmount = total_amount || amount;
    const creditAmount = amount || chargeAmount;

    if (!brand_id) {
      return new Response(JSON.stringify({ error: 'brand_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin of this brand
    const { data: memberData, error: memberError } = await supabase
      .from('brand_members')
      .select('role')
      .eq('brand_id', brand_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData || !['owner', 'admin'].includes(memberData.role)) {
      return new Response(JSON.stringify({ error: 'Not authorized for this brand' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get brand info
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, slug')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return new Response(JSON.stringify({ error: 'Brand not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure brand_wallets record exists
    const { data: existingWallet } = await supabase
      .from('brand_wallets')
      .select('id')
      .eq('brand_id', brand_id)
      .maybeSingle();

    if (!existingWallet) {
      await supabase.from('brand_wallets').insert({
        brand_id: brand_id,
        balance: 0,
        total_deposited: 0,
        total_spent: 0,
        currency: 'usd'
      });
    }

    console.log(`Creating topup for brand ${brand.name}, amount: $${creditAmount}, charge: $${chargeAmount}`);
    console.log(`Using parent company: ${parentCompanyId}`);

    // Create a one-time plan and checkout for the topup amount using Virality's parent company
    const redirectUrl = sanitizeRedirectUrl(return_url);
    
    // Record a pending transaction
    const { data: intentTx, error: intentError } = await supabase
      .from('brand_wallet_transactions')
      .insert({
        brand_id: brand_id,
        type: 'topup',
        amount: creditAmount,
        status: 'pending',
        description: `Wallet top-up: $${creditAmount}`,
        metadata: {
          user_id: user.id,
          initiated_at: new Date().toISOString(),
          charge_amount: chargeAmount,
          credit_amount: creditAmount,
        },
        created_by: user.id,
      })
      .select('id')
      .single();

    if (intentError) {
      console.error('Failed to record top-up intent:', intentError);
      return new Response(
        JSON.stringify({ error: 'Failed to record transaction', details: intentError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a checkout configuration with an inline plan for the topup amount
    // This charges to Virality's parent Whop business
    const checkoutRes = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan: {
          company_id: parentCompanyId,
          currency: 'usd',
          initial_price: chargeAmount,
          plan_type: 'one_time',
          visibility: 'hidden',
        },
        redirect_url: redirectUrl,
        metadata: {
          brand_id,
          user_id: user.id,
          purpose: 'brand_wallet_topup',
          amount: chargeAmount,
          credit_amount: creditAmount,
          transaction_id: intentTx.id,
        },
      }),
    });

    const checkoutText = await checkoutRes.text();
    console.log('Checkout response status:', checkoutRes.status);
    console.log('Checkout response:', checkoutText);

    if (!checkoutRes.ok) {
      await supabase
        .from('brand_wallet_transactions')
        .update({ status: 'failed', description: 'Wallet top-up checkout failed' })
        .eq('id', intentTx.id);

      return new Response(
        JSON.stringify({ error: 'Failed to create checkout', details: checkoutText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const checkoutData = JSON.parse(checkoutText);
    const checkoutUrl = checkoutData.purchase_url || checkoutData.url || checkoutData.checkout_url;

    console.log('Checkout created:', checkoutUrl);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        checkout_id: checkoutData.id,
        transaction_id: intentTx.id,
        amount: creditAmount,
        charge_amount: chargeAmount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-brand-wallet-topup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
