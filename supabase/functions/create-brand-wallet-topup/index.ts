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

    // Remove Lovable-specific auth token + transient params (can make URL extremely long)
    url.searchParams.delete('__lovable_token');
    url.searchParams.delete('state_id');

    const sanitized = url.toString();

    // Defensive: keep under common URL limits for third-party services
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

    // Get brand with Whop company ID
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, slug, whop_company_id')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return new Response(JSON.stringify({ error: 'Brand not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!brand.whop_company_id) {
      return new Response(JSON.stringify({ error: 'Brand does not have a wallet set up. Please set up your wallet first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a topup for the brand to add funds
    console.log(`Creating topup for brand ${brand.name} (company: ${brand.whop_company_id}), amount: $${amount}`);
    
    // First, get the company's payment methods
    const paymentMethodsResponse = await fetch(
      `https://api.whop.com/api/v1/payment_methods?company_id=${brand.whop_company_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${whopApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const paymentMethodsText = await paymentMethodsResponse.text();
    console.log('Payment methods response status:', paymentMethodsResponse.status);
    console.log('Payment methods response:', paymentMethodsText);

    if (!paymentMethodsResponse.ok) {
      console.error('Failed to get payment methods:', paymentMethodsText);
      return new Response(
        JSON.stringify({
          error: 'Failed to get payment methods',
          details: paymentMethodsText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const paymentMethodsData = JSON.parse(paymentMethodsText);
    const paymentMethods = paymentMethodsData.data || paymentMethodsData;

    // If no payment method exists, create a payment checkout so user pays + saves their card
    if (!paymentMethods || paymentMethods.length === 0) {
      const redirectUrl = sanitizeRedirectUrl(return_url);
      const topupAmount = chargeAmount || 1; // default to $1 if not provided
      const creditAmount = amount || 1;
      console.log('No payment method on file. Creating payment checkout. redirect_url:', redirectUrl, 'charge amount:', topupAmount, 'credit amount:', creditAmount);

      // Record a pending "top up intent" so we can finalize after returning from checkout
      const { data: intentTx, error: intentError } = await supabase
        .from('brand_wallet_transactions')
        .insert({
          brand_id: brand_id,
          type: 'topup',
          amount: creditAmount, // Credit the original amount (without fee)
          status: 'pending',
          description: 'Wallet top-up initiated',
          metadata: {
            user_id: user.id,
            initiated_at: new Date().toISOString(),
            flow: 'checkout_payment_method',
            charge_amount: topupAmount,
            credit_amount: creditAmount,
          },
          created_by: user.id,
        })
        .select('id')
        .single();

      if (intentError) {
        console.error('Failed to record top-up intent:', intentError);
        return new Response(
          JSON.stringify({
            error: 'Failed to record top-up intent',
            details: intentError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Create a payment checkout with an inline plan for the topup amount
      const checkoutRes = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whopApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: {
            company_id: brand.whop_company_id,
            currency: 'usd',
            initial_price: topupAmount,
            plan_type: 'one_time',
            visibility: 'hidden',
          },
          redirect_url: redirectUrl,
          metadata: {
            brand_id,
            user_id: user.id,
            purpose: 'wallet_topup',
            amount: topupAmount,
            credit_amount: creditAmount,
            topup_intent_id: intentTx.id,
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
          JSON.stringify({
            error: 'Failed to create checkout',
            details: checkoutText,
            needs_payment_method: true,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const checkoutData = JSON.parse(checkoutText);

      return new Response(
        JSON.stringify({
          success: true,
          needs_payment_method: true,
          checkout_url: checkoutData.purchase_url || checkoutData.url || checkoutData.checkout_url,
          checkout_id: checkoutData.id,
          transaction_id: intentTx.id,
          amount: creditAmount,
          charge_amount: topupAmount,
          message: 'Redirecting to complete payment.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }


    // Use the first payment method
    const paymentMethodId = paymentMethods[0].id;
    console.log(`Using payment method: ${paymentMethodId}`);

    // Create the topup using Whop's topups API
    // Docs: https://docs.whop.com/api-reference/topups/create-topup
    const checkoutResponse = await fetch('https://api.whop.com/api/v1/topups', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: chargeAmount, // Charge the total amount including fee
        company_id: brand.whop_company_id,
        currency: 'usd',
        payment_method_id: paymentMethodId,
      }),
    });

    const responseText = await checkoutResponse.text();
    console.log('Whop topup response status:', checkoutResponse.status);
    console.log('Whop topup response:', responseText);

    if (!checkoutResponse.ok) {
      console.error('Whop API error:', responseText);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to create topup', 
        details: responseText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const topupData = JSON.parse(responseText);
    console.log('Topup created:', topupData);

    // Record / update the transaction (topup is processed immediately)
    if (amount && amount >= 1) {
      if (transaction_id) {
        await supabase
          .from('brand_wallet_transactions')
          .update({
            status: topupData.status === 'paid' ? 'completed' : 'pending',
            description: `Wallet top-up: $${amount}`,
            whop_payment_id: topupData.id,
            metadata: {
              user_id: user.id,
              payment_id: topupData.id,
              finalized_at: new Date().toISOString(),
              previous_flow: 'checkout_payment_method',
            },
          })
          .eq('id', transaction_id)
          .eq('brand_id', brand_id);
      } else {
        await supabase
          .from('brand_wallet_transactions')
          .insert({
            brand_id: brand_id,
            type: 'topup',
            amount: amount,
            status: topupData.status === 'paid' ? 'completed' : 'pending',
            description: `Wallet top-up: $${amount}`,
            whop_payment_id: topupData.id,
            metadata: {
              user_id: user.id,
              payment_id: topupData.id,
              initiated_at: new Date().toISOString(),
            },
            created_by: user.id,
          });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      payment_id: topupData.id,
      status: topupData.status,
      amount: topupData.total,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in create-brand-wallet-topup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
