import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-STRIPE-CONNECT] ${step}${detailsStr}`);
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
      logStep("ERROR: STRIPE_SECRET_KEY not configured");
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

    const { brand_id, return_url, refresh_url } = await req.json();
    logStep("Request params", { brand_id, return_url, refresh_url });

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

    // Get brand details
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, slug, stripe_account_id, stripe_onboarding_complete')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return new Response(JSON.stringify({ error: 'Brand not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const email = profile?.email || user.email;

    let stripeAccountId = brand.stripe_account_id;

    // If brand doesn't have a Stripe account, create one
    if (!stripeAccountId) {
      logStep("Creating new Stripe Connect Standard account");
      
      const account = await stripe.accounts.create({
        type: 'standard',
        email: email,
        metadata: {
          brand_id: brand_id,
          brand_slug: brand.slug
        }
      });

      stripeAccountId = account.id;
      logStep("Stripe account created", { stripeAccountId });

      // Save the account ID to the brand
      const { error: updateError } = await supabase
        .from('brands')
        .update({ 
          stripe_account_id: stripeAccountId,
          stripe_onboarding_complete: false
        })
        .eq('id', brand_id);

      if (updateError) {
        logStep("Error updating brand with stripe_account_id", { error: updateError });
      }
    } else {
      logStep("Brand already has Stripe account", { stripeAccountId });
      
      // Check if onboarding is complete
      const account = await stripe.accounts.retrieve(stripeAccountId);
      if (account.charges_enabled && account.payouts_enabled) {
        logStep("Account already fully onboarded");
        
        // Update the brand to mark onboarding complete
        await supabase
          .from('brands')
          .update({ 
            stripe_onboarding_complete: true,
            stripe_charges_enabled: true,
            stripe_payouts_enabled: true
          })
          .eq('id', brand_id);
        
        return new Response(JSON.stringify({ 
          already_complete: true,
          stripe_account_id: stripeAccountId,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Create an Account Link for onboarding
    const defaultReturnUrl = `https://virality.gg/dashboard?workspace=${brand.slug}&tab=profile&stripe_onboarding=complete`;
    const defaultRefreshUrl = `https://virality.gg/dashboard?workspace=${brand.slug}&tab=profile&stripe_onboarding=refresh`;

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refresh_url || defaultRefreshUrl,
      return_url: return_url || defaultReturnUrl,
      type: 'account_onboarding',
    });

    logStep("Account link created", { url: accountLink.url, expires_at: accountLink.expires_at });

    return new Response(JSON.stringify({ 
      onboarding_url: accountLink.url,
      stripe_account_id: stripeAccountId,
      expires_at: accountLink.expires_at,
      already_exists: !!brand.stripe_account_id
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
