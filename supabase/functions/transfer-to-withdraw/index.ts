import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const whopApiKey = Deno.env.get('WHOP_API_KEY');
    const whopParentCompanyId = Deno.env.get('WHOP_PARENT_COMPANY_ID');

    if (!whopApiKey || !whopParentCompanyId) {
      console.error('Missing Whop configuration');
      return new Response(
        JSON.stringify({ error: 'Whop API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { brandId, amount } = await req.json();
    console.log(`Transfer request: brandId=${brandId}, amount=${amount}, userId=${user.id}`);

    if (!brandId || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a member of the brand
    const { data: membership, error: membershipError } = await supabaseClient
      .from('brand_members')
      .select('role')
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.error('Membership check failed:', membershipError);
      return new Response(
        JSON.stringify({ error: 'Not authorized for this brand' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get brand details including whop_company_id
    const { data: brand, error: brandError } = await supabaseClient
      .from('brands')
      .select('whop_company_id, name')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.error('Brand fetch failed:', brandError);
      return new Response(
        JSON.stringify({ error: 'Brand not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!brand.whop_company_id) {
      console.error('Brand does not have a Whop company configured');
      return new Response(
        JSON.stringify({ error: 'Brand wallet not set up. Please set up your wallet first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate idempotency key
    const idempotenceKey = crypto.randomUUID();
    console.log(`Creating Whop transfer with idempotence_key=${idempotenceKey}`);

    // Call Whop API to create transfer
    // Transfer from parent company (Virality) to brand's ledger account
    const whopResponse = await fetch('https://api.whop.com/api/v5/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin_id: whopParentCompanyId,
        destination_id: brand.whop_company_id,
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        notes: `Transfer from Virality balance to ${brand.name} withdraw balance`,
        idempotence_key: idempotenceKey,
      }),
    });

    // Handle the response - check for empty body
    const responseText = await whopResponse.text();
    console.log('Whop API raw response:', responseText, 'Status:', whopResponse.status);
    
    let whopData: any = {};
    if (responseText) {
      try {
        whopData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Whop response:', parseError);
        whopData = { raw: responseText };
      }
    }
    console.log('Whop API parsed response:', JSON.stringify(whopData));

    if (!whopResponse.ok) {
      console.error('Whop transfer failed:', whopData);
      return new Response(
        JSON.stringify({ error: whopData.message || whopData.error || `Transfer failed with status ${whopResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the transaction in our database
    const { error: txError } = await supabaseClient
      .from('brand_wallet_transactions')
      .insert({
        brand_id: brandId,
        type: 'transfer_to_withdraw',
        amount: amount,
        status: 'completed',
        description: `Transfer to withdraw balance`,
        created_by: user.id,
        metadata: {
          whop_transfer_id: whopData.id,
          idempotence_key: idempotenceKey,
        }
      });

    if (txError) {
      console.error('Failed to record transaction:', txError);
      // Note: The Whop transfer succeeded, but we failed to record it locally
      // This is logged but we still return success since the money moved
    }

    console.log(`Transfer completed successfully: ${amount} USD`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        transfer_id: whopData.id,
        amount: amount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Transfer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
