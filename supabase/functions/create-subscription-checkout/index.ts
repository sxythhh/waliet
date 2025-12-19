import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan configuration
const PLANS = {
  starter: {
    plan_id: 'plan_DU4ba3ik2UHVZ',
    name: 'Starter',
    price: 99,
  },
  growth: {
    plan_id: 'plan_JSWLvDSLsSde4',
    name: 'Growth',
    price: 249,
  },
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

    const { brand_id, plan_key, return_url } = await req.json();

    if (!brand_id || !plan_key) {
      return new Response(JSON.stringify({ error: 'brand_id and plan_key are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate plan
    const plan = PLANS[plan_key as keyof typeof PLANS];
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Invalid plan_key. Must be "starter" or "growth"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is a member of this brand
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

    // Get brand details
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

    console.log(`Creating checkout for brand ${brand.name}, plan: ${plan.name}`);

    // Create checkout configuration with Whop API
    const checkoutResponse = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: plan.plan_id,
        redirect_url: return_url || `https://virality.gg/brand/${brand.slug}?subscription=success`,
        metadata: {
          type: 'subscription',
          brand_id: brand_id,
          brand_name: brand.name,
          brand_slug: brand.slug,
          plan_key: plan_key,
          plan_name: plan.name,
        },
      }),
    });

    const responseText = await checkoutResponse.text();
    console.log('Whop checkout response status:', checkoutResponse.status);
    console.log('Whop checkout response:', responseText);

    if (!checkoutResponse.ok) {
      console.error('Whop checkout error:', responseText);
      return new Response(JSON.stringify({ 
        error: 'Failed to create checkout', 
        details: responseText,
        status: checkoutResponse.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const checkoutData = JSON.parse(responseText);
    console.log('Checkout created:', checkoutData.id);

    return new Response(JSON.stringify({ 
      checkout_url: checkoutData.purchase_url,
      checkout_id: checkoutData.id,
      plan: plan.name,
      price: plan.price,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in create-subscription-checkout:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
