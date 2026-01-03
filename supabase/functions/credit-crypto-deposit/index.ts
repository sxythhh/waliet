import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreditDepositRequest {
  deposit_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate authorization (admin only for manual crediting)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const body: CreditDepositRequest = await req.json();
    const { deposit_id } = body;

    if (!deposit_id) {
      return new Response(JSON.stringify({ error: 'deposit_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Manually crediting deposit:', { deposit_id, admin_id: user.id });

    // Fetch the deposit
    const { data: deposit, error: fetchError } = await supabase
      .from('crypto_deposits')
      .select('*')
      .eq('id', deposit_id)
      .single();

    if (fetchError || !deposit) {
      return new Response(JSON.stringify({ error: 'Deposit not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already credited
    if (deposit.status === 'credited') {
      return new Response(JSON.stringify({
        success: true,
        already_credited: true,
        deposit_id,
        message: 'Deposit was already credited',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call the atomic credit function
    const { data: creditResult, error: creditError } = await supabase
      .rpc('atomic_credit_crypto_deposit', { p_deposit_id: deposit_id });

    if (creditError) {
      console.error('Error crediting deposit:', creditError);
      return new Response(JSON.stringify({
        success: false,
        error: creditError.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update credited_by field
    await supabase
      .from('crypto_deposits')
      .update({
        credited_by: user.id,
        notes: `Manually credited by admin ${user.email}`,
      })
      .eq('id', deposit_id);

    console.log('Deposit credited successfully:', creditResult);

    return new Response(JSON.stringify({
      success: true,
      deposit_id,
      ...creditResult,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error crediting deposit:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
