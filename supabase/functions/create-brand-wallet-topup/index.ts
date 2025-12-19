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

    if (!amount || amount < 1) {
      return new Response(JSON.stringify({ error: 'amount must be at least $1' }), {
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

    // Get brand with Whop company ID and saved payment method
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, slug, whop_company_id, whop_member_id, whop_payment_method_id')
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

    // If returning from a setup intent redirect, finalize by fetching the setup intent,
    // saving the payment method, and charging immediately.
    if (setup_intent_id) {
      console.log(`Finalizing topup via setup_intent_id: ${setup_intent_id}`);

      const setupIntentRes = await fetch(`https://api.whop.com/api/v1/setup_intents/${setup_intent_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${whopApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const setupIntentText = await setupIntentRes.text();
      console.log('Setup intent fetch status:', setupIntentRes.status);
      console.log('Setup intent fetch response:', setupIntentText);

      if (!setupIntentRes.ok) {
        return new Response(JSON.stringify({
          error: 'Failed to retrieve setup intent',
          details: setupIntentText,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const setupIntentRaw = JSON.parse(setupIntentText);
      // Whop APIs sometimes wrap the object in { data: ... }
      const setupIntent = setupIntentRaw?.data ?? setupIntentRaw;

      const pmId = setupIntent?.payment_method?.id;
      const memberId = setupIntent?.member?.id;

      if (!pmId) {
        // Return 200 with an explicit error field so the client can show a helpful message
        return new Response(JSON.stringify({
          success: false,
          error: 'Payment method not found on setup intent',
          details: setupIntentText,
          needs_payment_method: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase
        .from('brands')
        .update({ whop_payment_method_id: pmId, whop_member_id: memberId ?? null })
        .eq('id', brand_id);

      // Use the saved payment method for the charge below
      (brand as any).whop_payment_method_id = pmId;
      (brand as any).whop_member_id = memberId ?? null;

      console.log(`Saved payment method from setup intent: ${pmId}`);
    }

    console.log(`Processing topup for brand ${brand.name} (company: ${brand.whop_company_id}), amount: $${amount}`);
    console.log(`Saved payment method: ${brand.whop_payment_method_id || 'none'}`);

    // If brand has a saved payment method and member_id, use the payments API
    if (brand.whop_payment_method_id && brand.whop_member_id) {
      console.log(`Using saved payment method: ${brand.whop_payment_method_id}, member: ${brand.whop_member_id}`);

      // Use payments.create API which works with member-scoped payment methods
      const paymentResponse = await fetch('https://api.whop.com/api/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whopApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: brand.whop_company_id,
          member_id: brand.whop_member_id,
          payment_method_id: brand.whop_payment_method_id,
          plan: {
            initial_price: amount,
            currency: 'usd',
            plan_type: 'one_time',
          },
          metadata: {
            type: 'brand_wallet_topup',
            brand_id: brand_id,
            user_id: user.id,
          },
        }),
      });

      const responseText = await paymentResponse.text();
      console.log('Whop payment response status:', paymentResponse.status);
      console.log('Whop payment response:', responseText);

      if (!paymentResponse.ok) {
        console.error('Whop payment API error:', responseText);
        
        // If payment method is invalid, clear it and prompt for new one
        if (paymentResponse.status === 400 || paymentResponse.status === 404 || paymentResponse.status === 422) {
          console.log('Payment method may be invalid, clearing saved method');
          await supabase
            .from('brands')
            .update({ whop_payment_method_id: null, whop_member_id: null })
            .eq('id', brand_id);
        }
        
        return new Response(JSON.stringify({ 
          error: 'Failed to charge saved payment method', 
          details: responseText,
          needs_payment_method: true,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const paymentData = JSON.parse(responseText);
      console.log('Payment created:', paymentData);

      // Record the transaction
      await supabase
        .from('brand_wallet_transactions')
        .insert({
          brand_id: brand_id,
          type: 'topup',
          amount: amount,
          status: paymentData.status === 'paid' ? 'completed' : 'pending',
          description: `Wallet top-up: $${amount}`,
          whop_payment_id: paymentData.id,
          metadata: {
            user_id: user.id,
            payment_id: paymentData.id,
            initiated_at: new Date().toISOString()
          },
          created_by: user.id
        });

      return new Response(JSON.stringify({ 
        success: true,
        payment_id: paymentData.id,
        status: paymentData.status,
        amount: amount,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No saved payment method - create a setup checkout
    // Clean the redirect URL - remove __lovable_token which is very long and causes 500 errors
    let cleanRedirectUrl = return_url || 'https://example.com';
    try {
      const urlObj = new URL(cleanRedirectUrl);
      // Keep only essential params
      const workspace = urlObj.searchParams.get('workspace');
      const tab = urlObj.searchParams.get('tab') || 'profile';
      
      // Build clean URL without the token
      urlObj.search = '';
      if (workspace) urlObj.searchParams.set('workspace', workspace);
      urlObj.searchParams.set('tab', tab);
      
      cleanRedirectUrl = urlObj.toString();
    } catch (e) {
      console.log('Could not parse redirect URL, using as-is');
    }
    
    console.log('No saved payment method. Creating setup checkout with amount in metadata.');
    console.log('Redirect URL:', cleanRedirectUrl);

    // Create a setup checkout - include amount in metadata so webhook can charge after saving
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
        redirect_url: cleanRedirectUrl,
        metadata: {
          brand_id,
          user_id: user.id,
          amount: amount, // Include the amount so webhook can create the topup
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
        message: 'Redirecting to save your payment method. Your wallet will be topped up after saving.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
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
