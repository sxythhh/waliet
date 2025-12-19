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

    const { brand_id, amount, mode = 'setup', return_url } = await req.json();

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

    console.log(`Creating checkout session for brand ${brand.name} (company: ${brand.whop_company_id}), mode: ${mode}, amount: ${amount}`);

    // Create checkout configuration with metadata
    const checkoutPayload: Record<string, unknown> = {
      company_id: brand.whop_company_id,
      mode: mode,
      currency: 'usd',
      redirect_url: return_url || 'https://virality.gg/dashboard',
      metadata: {
        brand_id: brand_id,
        user_id: user.id,
        brand_slug: brand.slug,
        purpose: mode === 'setup' ? 'wallet_payment_method_setup' : 'wallet_topup',
        amount: amount || 0,
        initiated_at: new Date().toISOString(),
      },
    };

    // For setup mode, we don't need a plan - just setting up payment method
    if (mode === 'setup') {
      // Setup mode for saving a payment method
      checkoutPayload.plan = {
        company_id: brand.whop_company_id,
        plan_type: 'one_time',
        initial_price: 0, // Free for setup
        currency: 'usd',
      };
    } else if (mode === 'payment' && amount) {
      // Payment mode for actual charge
      checkoutPayload.plan = {
        company_id: brand.whop_company_id,
        plan_type: 'one_time',
        initial_price: amount,
        currency: 'usd',
      };
    }

    const checkoutResponse = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutPayload),
    });

    const responseText = await checkoutResponse.text();
    console.log('Checkout configuration response status:', checkoutResponse.status);
    console.log('Checkout configuration response:', responseText);

    if (!checkoutResponse.ok) {
      console.error('Whop API error:', responseText);
      return new Response(JSON.stringify({ 
        error: 'Failed to create checkout session', 
        details: responseText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const checkoutData = JSON.parse(responseText);
    console.log('Checkout session created:', checkoutData.id);

    return new Response(JSON.stringify({ 
      session_id: checkoutData.id,
      plan_id: checkoutData.plan?.id,
      purchase_url: checkoutData.purchase_url,
      company_id: brand.whop_company_id,
      metadata: checkoutData.metadata,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in create-checkout-session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
