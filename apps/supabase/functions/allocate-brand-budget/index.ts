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

    // Rate limiting check
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_action: 'allocate_budget',
      p_max_attempts: 20,
      p_window_seconds: 60
    });

    if (rateLimitError || !allowed) {
      console.log('Rate limit exceeded for user:', user.id);
      return new Response(JSON.stringify({ error: 'Too many budget allocation attempts. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { brand_id, campaign_id, boost_id, amount } = await req.json();

    if (!brand_id || !amount) {
      return new Response(JSON.stringify({ error: 'brand_id and amount are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!campaign_id && !boost_id) {
      return new Response(JSON.stringify({ error: 'Either campaign_id or boost_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allocateAmount = Number(amount);
    if (isNaN(allocateAmount) || allocateAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Amount must be greater than 0' }), {
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

    // Verify campaign/boost belongs to this brand
    const targetId = campaign_id || boost_id;
    const campaignType = campaign_id ? 'campaign' : 'boost';
    const table = campaign_id ? 'campaigns' : 'bounty_campaigns';

    const { data: target, error: targetError } = await supabase
      .from(table)
      .select('id, brand_id, title')
      .eq('id', targetId)
      .single();

    if (targetError || !target || target.brand_id !== brand_id) {
      return new Response(JSON.stringify({ error: `${campaignType} not found or does not belong to this brand` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Executing atomic budget allocation:', { brandId: brand_id, targetId, campaignType, amount: allocateAmount });

    // Execute atomic budget allocation using RPC
    const { data: result, error: allocateError } = await supabase.rpc('atomic_allocate_budget', {
      p_brand_id: brand_id,
      p_campaign_id: targetId,
      p_campaign_type: campaignType,
      p_amount: allocateAmount
    });

    if (allocateError) {
      console.error('Atomic allocation failed:', allocateError);
      const errorMessage = allocateError.message.includes('Insufficient') 
        ? 'Insufficient brand wallet balance'
        : 'Budget allocation failed';
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Budget allocation completed:', result);

    // Get updated brand wallet balance
    const { data: updatedWallet } = await supabase
      .from('brand_wallets')
      .select('balance')
      .eq('brand_id', brand_id)
      .single();

    return new Response(JSON.stringify({ 
      success: true,
      allocated_amount: allocateAmount,
      remaining_balance: Number(updatedWallet?.balance) || 0,
      new_budget: result?.new_budget
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in allocate-brand-budget:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
