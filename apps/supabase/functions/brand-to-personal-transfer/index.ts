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

    // Authenticate user
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
      p_action: 'brand_to_personal_transfer',
      p_max_attempts: 10,
      p_window_seconds: 60
    });

    if (rateLimitError || !allowed) {
      console.log('Rate limit exceeded for user:', user.id);
      return new Response(JSON.stringify({ error: 'Too many transfer attempts. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { brand_id, amount, description } = await req.json();

    if (!brand_id || !amount) {
      return new Response(JSON.stringify({ error: 'brand_id and amount are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Amount must be a positive number' }), {
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

    // Get brand name for description
    const { data: brand } = await supabase
      .from('brands')
      .select('name')
      .eq('id', brand_id)
      .single();

    console.log('Executing atomic brand-to-personal transfer:', { brandId: brand_id, userId: user.id, amount: transferAmount });

    // Execute atomic transfer using RPC
    const { data: result, error: transferError } = await supabase.rpc('atomic_brand_to_personal_transfer', {
      p_brand_id: brand_id,
      p_user_id: user.id,
      p_amount: transferAmount,
      p_description: description || `Transfer from brand: ${brand?.name || 'Unknown'}`
    });

    if (transferError) {
      console.error('Atomic transfer failed:', transferError);
      const errorMessage = transferError.message.includes('Insufficient') 
        ? 'Insufficient balance in brand wallet'
        : 'Transfer failed';
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Brand-to-personal transfer completed:', result);

    // Get updated balances
    const { data: updatedPersonalWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const { data: updatedBrandWallet } = await supabase
      .from('brand_wallets')
      .select('balance')
      .eq('brand_id', brand_id)
      .single();

    return new Response(JSON.stringify({ 
      success: true,
      transfer_amount: transferAmount,
      personal_wallet_balance: Number(updatedPersonalWallet?.balance) || 0,
      brand_wallet_balance: Number(updatedBrandWallet?.balance) || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in brand-to-personal-transfer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
