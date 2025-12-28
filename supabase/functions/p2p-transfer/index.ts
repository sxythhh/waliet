import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MINIMUM_TRANSFER = 1;
const TRANSFER_FEE_RATE = 0.03; // 3% fee

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header to identify the sender
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
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
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const senderId = user.id;
    console.log('Transfer initiated by user:', senderId);

    // Parse request body
    const { recipientUsername, amount } = await req.json();
    console.log('Transfer request:', { recipientUsername, amount });

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

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find recipient by username
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', recipientUsername.trim())
      .single();

    if (recipientError || !recipient) {
      console.error('Recipient not found:', recipientError);
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
    const totalDebit = transferAmount;

    console.log('Transfer calculation:', { transferAmount, fee, netAmount, totalDebit });

    // Get sender's wallet balance
    const { data: senderWallet, error: senderWalletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', senderId)
      .single();

    if (senderWalletError || !senderWallet) {
      console.error('Sender wallet not found:', senderWalletError);
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (senderWallet.balance < totalDebit) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform the transfer atomically
    // 1. Debit sender
    const { error: debitError } = await supabase
      .from('wallets')
      .update({ 
        balance: senderWallet.balance - totalDebit,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', senderId);

    if (debitError) {
      console.error('Failed to debit sender:', debitError);
      return new Response(
        JSON.stringify({ error: 'Transfer failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Credit recipient
    const { data: recipientWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', recipient.id)
      .single();

    const recipientBalance = recipientWallet?.balance || 0;

    const { error: creditError } = await supabase
      .from('wallets')
      .update({ 
        balance: recipientBalance + netAmount,
        total_earned: (recipientWallet as any)?.total_earned + netAmount || netAmount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', recipient.id);

    if (creditError) {
      // Rollback sender debit
      console.error('Failed to credit recipient, rolling back:', creditError);
      await supabase
        .from('wallets')
        .update({ balance: senderWallet.balance })
        .eq('user_id', senderId);
      
      return new Response(
        JSON.stringify({ error: 'Transfer failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Log the transfer
    const { error: logError } = await supabase
      .from('p2p_transfers')
      .insert({
        sender_id: senderId,
        recipient_id: recipient.id,
        amount: transferAmount,
        fee: fee,
        net_amount: netAmount,
        status: 'completed'
      });

    if (logError) {
      console.error('Failed to log transfer:', logError);
      // Don't rollback, transfer was successful
    }

    // 4. Create wallet transaction records for both parties
    await supabase.from('wallet_transactions').insert([
      {
        user_id: senderId,
        amount: -totalDebit,
        type: 'transfer_out',
        description: `Transfer to @${recipient.username}`,
        metadata: { recipient_id: recipient.id, fee: fee }
      },
      {
        user_id: recipient.id,
        amount: netAmount,
        type: 'transfer_in',
        description: `Transfer from user`,
        metadata: { sender_id: senderId }
      }
    ]);

    console.log('Transfer completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully transferred $${netAmount.toFixed(2)} to @${recipient.username}`,
        details: {
          amount: transferAmount,
          fee: fee,
          netAmount: netAmount,
          recipientUsername: recipient.username
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
