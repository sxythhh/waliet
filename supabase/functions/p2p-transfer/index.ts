import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MINIMUM_TRANSFER = 1;
const TRANSFER_FEE_RATE = 0.03; // 3% fee

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth to get their identity
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const senderId = user.id;

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting check
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_user_id: senderId,
      p_action: 'p2p_transfer',
      p_max_attempts: 5,
      p_window_seconds: 60
    });

    if (rateLimitError || !allowed) {
      console.log('Rate limit exceeded for user:', senderId);
      return new Response(
        JSON.stringify({ error: 'Too many transfer attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { recipientUsername, amount, note } = await req.json();

    // Validate input
    if (!recipientUsername || typeof recipientUsername !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Recipient username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount < MINIMUM_TRANSFER) {
      return new Response(
        JSON.stringify({ error: `Minimum transfer amount is $${MINIMUM_TRANSFER}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find recipient by username
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', recipientUsername.trim())
      .single();

    if (recipientError || !recipient) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-transfer
    if (recipient.id === senderId) {
      return new Response(
        JSON.stringify({ error: 'Cannot transfer to yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate fee and net amount
    const fee = Math.round(transferAmount * TRANSFER_FEE_RATE * 100) / 100;
    const netAmount = Math.round((transferAmount - fee) * 100) / 100;

    console.log('Executing atomic P2P transfer:', { senderId, recipientId: recipient.id, amount: transferAmount, fee, netAmount });

    // Execute atomic transfer using RPC
    const { data: result, error: transferError } = await supabase.rpc('atomic_p2p_transfer', {
      p_sender_id: senderId,
      p_recipient_id: recipient.id,
      p_gross_amount: transferAmount,
      p_net_amount: netAmount,
      p_fee: fee,
      p_note: note || null
    });

    if (transferError) {
      console.error('Atomic transfer failed:', transferError);
      const errorMessage = transferError.message.includes('Insufficient balance') 
        ? 'Insufficient balance'
        : 'Transfer failed';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transfer completed successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully transferred $${netAmount.toFixed(2)} to @${recipient.username}`,
        details: {
          amount: transferAmount,
          fee: fee,
          netAmount: netAmount,
          recipientUsername: recipient.username,
          transferId: result?.transfer_id
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transfer error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
