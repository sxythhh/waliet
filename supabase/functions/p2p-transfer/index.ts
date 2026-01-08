import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { safeLog, safeError, truncateId } from "../_shared/logging.ts";

const MINIMUM_TRANSFER = 1;
const TRANSFER_FEE_RATE = 0.03; // 3% fee

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
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
      safeLog('Rate limit exceeded for P2P transfer', { userId: truncateId(senderId) });
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

    // Get sender's username from profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', senderId)
      .single();

    safeLog('Executing atomic P2P transfer', {
      senderId: truncateId(senderId),
      recipientId: truncateId(recipient.id),
      amount: transferAmount,
      fee
    });

    // Execute atomic transfer using RPC
    const { data: result, error: transferError } = await supabase.rpc('atomic_p2p_transfer', {
      p_sender_id: senderId,
      p_recipient_id: recipient.id,
      p_gross_amount: transferAmount,
      p_net_amount: netAmount,
      p_fee: fee,
      p_note: note || null,
      p_sender_username: senderProfile?.username || null,
      p_recipient_username: recipient.username
    });

    if (transferError) {
      safeError('Atomic transfer failed', transferError);
      const errorMessage = transferError.message.includes('Insufficient balance') 
        ? 'Insufficient balance'
        : 'Transfer failed';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    safeLog('Transfer completed successfully', { 
      transferId: truncateId(result?.transfer_id),
      netAmount 
    });

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
    safeError('Transfer error', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
