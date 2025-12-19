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

    const { brand_id, amount, return_url, setup_intent_id } = await req.json();

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
    console.log(`Processing topup for brand ${brand.name} (company: ${brand.whop_company_id}), amount: $${amount}`);
    
    let paymentMethodId: string | null = null;

    // If setup_intent_id is provided, fetch the payment method from it directly
    if (setup_intent_id) {
      console.log('Fetching payment method from setup_intent_id:', setup_intent_id);
      const setupIntentRes = await fetch(
        `https://api.whop.com/api/v1/setup_intents/${setup_intent_id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${whopApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const setupIntentText = await setupIntentRes.text();
      console.log('Setup intent fetch status:', setupIntentRes.status);
      console.log('Setup intent fetch response:', setupIntentText);
      
      if (setupIntentRes.ok) {
        const setupIntentData = JSON.parse(setupIntentText);
        if (setupIntentData.payment_method?.id) {
          paymentMethodId = setupIntentData.payment_method.id;
          console.log('Got payment method from setup intent:', paymentMethodId);
        }
      }
    }

    // If no payment method from setup intent, try to get from company's payment methods list
    if (!paymentMethodId) {
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
      
      if (paymentMethods && paymentMethods.length > 0) {
        paymentMethodId = paymentMethods[0].id;
      }
    }

    console.log('Saved payment method:', paymentMethodId || 'none');

    // If no payment method exists, create a setup checkout so user can save their payment method
    if (!paymentMethodId) {
      const redirectUrl = return_url || 'https://example.com';
      console.log('No payment method on file. Creating setup checkout. redirect_url:', redirectUrl);

      // Create a setup checkout - this saves the payment method for future use
      const setupCheckoutRes = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whopApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: brand.whop_company_id,
          mode: 'setup',
          currency: 'usd',
          redirect_url: redirectUrl,
          metadata: {
            brand_id,
            user_id: user.id,
            purpose: 'wallet_payment_method_setup',
          },
        }),
      });

      const setupCheckoutText = await setupCheckoutRes.text();
      console.log('Setup checkout response status:', setupCheckoutRes.status);
      console.log('Setup checkout response:', setupCheckoutText);

      if (!setupCheckoutRes.ok) {
        return new Response(
          JSON.stringify({
            error: 'Failed to create setup checkout',
            details: setupCheckoutText,
            needs_payment_method: true,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const setupCheckoutData = JSON.parse(setupCheckoutText);
      
      return new Response(
        JSON.stringify({
          success: true,
          needs_payment_method: true,
          checkout_url: setupCheckoutData.purchase_url || setupCheckoutData.url || setupCheckoutData.checkout_url,
          checkout_id: setupCheckoutData.id,
          message: 'Redirecting to save your payment method.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
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
        amount: amount,
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

    // Record the transaction (topup is processed immediately)
    if (amount && amount >= 1) {
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
            initiated_at: new Date().toISOString()
          },
          created_by: user.id
        });
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
