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

    const { brand_id, amount, return_url } = await req.json();

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

    const WHOP_API_BASE = 'https://api.whop.com';
    const whopHeaders: HeadersInit = {
      // Per Whop docs, this is the API key value (not a Bearer token)
      'Authorization': whopApiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Helps avoid WAF/challenge pages in some environments
      'User-Agent': 'LovableCloud/1.0 (+https://lovable.dev)',
    };

    const whopGetText = async (url: string) => {
      const res = await fetch(url, { method: 'GET', headers: whopHeaders });
      const text = await res.text();
      return { res, text };
    };

    const whopPostText = async (url: string, body: Record<string, unknown>) => {
      const res = await fetch(url, { method: 'POST', headers: whopHeaders, body: JSON.stringify(body) });
      const text = await res.text();
      return { res, text };
    };

    // First, get the company's payment methods
    const { res: paymentMethodsResponse, text: paymentMethodsText } = await whopGetText(
      `${WHOP_API_BASE}/payment_methods?company_id=${encodeURIComponent(brand.whop_company_id)}`
    );

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

    // If no payment method exists, create a Setup checkout so the user can add one.
    if (!paymentMethods || paymentMethods.length === 0) {
      const redirectUrl = return_url || 'https://example.com';
      console.log('No payment method on file. Creating setup checkout configuration. redirect_url:', redirectUrl);

      const { res: setupCheckoutRes, text: setupCheckoutText } = await whopPostText(
        `${WHOP_API_BASE}/checkout_configurations`,
        {
          company_id: brand.whop_company_id,
          mode: 'setup',
          currency: 'usd',
          redirect_url: redirectUrl,
          metadata: {
            brand_id,
            user_id: user.id,
            purpose: 'wallet_payment_method_setup',
          },
        }
      );

      console.log('Setup checkout response status:', setupCheckoutRes.status);
      console.log('Setup checkout response:', setupCheckoutText);

      if (!setupCheckoutRes.ok) {
        return new Response(
          JSON.stringify({
            error: 'No payment method on file, and failed to start payment method setup',
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
          error: 'No payment method on file. Please add a payment method first.',
          needs_payment_method: true,
          setup_checkout_url:
            setupCheckoutData.purchase_url || setupCheckoutData.url || setupCheckoutData.checkout_url,
          setup_checkout_id: setupCheckoutData.id,
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
    const { res: checkoutResponse, text: responseText } = await whopPostText(`${WHOP_API_BASE}/topups`, {
      amount: amount,
      company_id: brand.whop_company_id,
      currency: 'usd',
      payment_method_id: paymentMethodId,
    });

    console.log('Whop topup response status:', checkoutResponse.status);
    console.log('Whop topup response:', responseText);

    if (!checkoutResponse.ok) {
      console.error('Whop API error:', responseText);

      return new Response(
        JSON.stringify({
          error: 'Failed to create topup',
          details: responseText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
