import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-STRIPE-BALANCE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

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

    // Get brand with Stripe account ID
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled')
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
      logStep("Error fetching transactions", { error: txError });
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

    logStep("Local wallet balance calculated", { localBalance, brand_id });

    if (!brand.stripe_account_id) {
      // Brand hasn't set up their Stripe Connect account yet
      return new Response(JSON.stringify({ 
        balance: localBalance,
        virality_balance: localBalance,
        stripe_balance: 0,
        pending_balance: 0,
        currency: 'usd',
        has_stripe_account: false,
        onboarding_complete: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check account status and retrieve balance
    const account = await stripe.accounts.retrieve(brand.stripe_account_id);
    logStep("Stripe account retrieved", { 
      charges_enabled: account.charges_enabled, 
      payouts_enabled: account.payouts_enabled 
    });

    // Update brand onboarding status if changed
    if (account.charges_enabled !== brand.stripe_charges_enabled || 
        account.payouts_enabled !== brand.stripe_payouts_enabled) {
      await supabase
        .from('brands')
        .update({ 
          stripe_onboarding_complete: account.charges_enabled && account.payouts_enabled,
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled
        })
        .eq('id', brand_id);
    }

    let stripeBalance = 0;
    let pendingBalance = 0;

    // Only try to get balance if account is fully set up
    if (account.charges_enabled) {
      try {
        const balance = await stripe.balance.retrieve({
          stripeAccount: brand.stripe_account_id
        });
        
        // Find USD available balance
        const usdAvailable = balance.available.find((b: { currency: string; amount: number }) => b.currency === 'usd');
        const usdPending = balance.pending.find((b: { currency: string; amount: number }) => b.currency === 'usd');
        
        // Stripe returns amounts in cents
        stripeBalance = (usdAvailable?.amount || 0) / 100;
        pendingBalance = (usdPending?.amount || 0) / 100;
        
        logStep("Stripe balance retrieved", { stripeBalance, pendingBalance });
      } catch (balanceError) {
        logStep("Could not retrieve balance", { error: balanceError });
      }
    }

    const totalBalance = stripeBalance + localBalance;

    return new Response(JSON.stringify({ 
      balance: totalBalance,
      virality_balance: localBalance,
      stripe_balance: stripeBalance,
      pending_balance: pendingBalance,
      currency: 'usd',
      has_stripe_account: true,
      onboarding_complete: account.charges_enabled && account.payouts_enabled,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    logStep("ERROR", { message: error instanceof Error ? error.message : 'Unknown error' });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
