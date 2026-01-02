import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from 'https://esm.sh/@solana/web3.js@1.98.0';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from 'https://esm.sh/@solana/spl-token@0.4.9?deps=@solana/web3.js@1.98.0';
import bs58 from 'https://esm.sh/bs58@6.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Solana USDC on Mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDC_DECIMALS = 6;

interface ProcessPayoutRequest {
  payoutRequestId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment setup
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const treasuryPrivateKey = Deno.env.get('SOLANA_TREASURY_PRIVATE_KEY');
    const heliusApiKey = Deno.env.get('HELIUS_API_KEY');

    if (!treasuryPrivateKey) {
      console.error('SOLANA_TREASURY_PRIVATE_KEY not configured');
      return new Response(JSON.stringify({
        error: 'Crypto payouts not configured',
        details: 'Treasury wallet not set up'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!heliusApiKey) {
      console.error('HELIUS_API_KEY not configured');
      return new Response(JSON.stringify({
        error: 'Crypto payouts not configured',
        details: 'RPC provider not set up'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate admin authorization
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
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: ProcessPayoutRequest = await req.json();
    const { payoutRequestId } = body;

    if (!payoutRequestId) {
      return new Response(JSON.stringify({ error: 'payoutRequestId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing crypto payout', { payoutRequestId, adminId: user.id });

    // Fetch payout request
    const { data: payoutRequest, error: payoutError } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('id', payoutRequestId)
      .single();

    if (payoutError || !payoutRequest) {
      console.error('Payout request not found:', payoutError);
      return new Response(JSON.stringify({ error: 'Payout request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate status - must be pending or in_transit
    if (!['pending', 'in_transit'].includes(payoutRequest.status)) {
      return new Response(JSON.stringify({
        error: 'Invalid payout status',
        details: `Cannot process payout with status: ${payoutRequest.status}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate payment method is crypto
    if (payoutRequest.payout_method !== 'crypto') {
      return new Response(JSON.stringify({
        error: 'Not a crypto payout',
        details: `Payment method is: ${payoutRequest.payout_method}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get wallet address from payout_details
    const walletAddress = payoutRequest.payout_details?.wallet_address ||
                         payoutRequest.payout_details?.address;

    if (!walletAddress) {
      return new Response(JSON.stringify({
        error: 'No wallet address found',
        details: 'Creator has not provided a Solana wallet address'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate Solana address format
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(walletAddress);
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Invalid wallet address',
        details: 'The provided address is not a valid Solana address'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate amount in USDC base units (6 decimals)
    const amountUSD = parseFloat(payoutRequest.amount);
    const amountBaseUnits = BigInt(Math.floor(amountUSD * Math.pow(10, USDC_DECIMALS)));

    if (amountBaseUnits <= 0) {
      return new Response(JSON.stringify({
        error: 'Invalid amount',
        details: 'Payout amount must be greater than 0'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Payout details:', {
      walletAddress,
      amountUSD,
      amountBaseUnits: amountBaseUnits.toString()
    });

    // Set up Solana connection via Helius
    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
    const connection = new Connection(rpcUrl, 'confirmed');

    // Load treasury keypair
    const treasurySecretKey = bs58.decode(treasuryPrivateKey);
    const treasuryKeypair = Keypair.fromSecretKey(treasurySecretKey);
    const treasuryPubkey = treasuryKeypair.publicKey;

    console.log('Treasury wallet:', treasuryPubkey.toBase58());

    // Get treasury's USDC token account
    const treasuryATA = await getAssociatedTokenAddress(
      USDC_MINT,
      treasuryPubkey
    );

    // Check treasury balance
    try {
      const treasuryBalance = await connection.getTokenAccountBalance(treasuryATA);
      const treasuryBalanceAmount = BigInt(treasuryBalance.value.amount);

      console.log('Treasury USDC balance:', treasuryBalance.value.uiAmountString);

      if (treasuryBalanceAmount < amountBaseUnits) {
        return new Response(JSON.stringify({
          error: 'Insufficient treasury balance',
          details: `Treasury has ${treasuryBalance.value.uiAmountString} USDC, need ${amountUSD} USDC`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      console.error('Error checking treasury balance:', e);
      return new Response(JSON.stringify({
        error: 'Treasury wallet not found',
        details: 'Treasury USDC token account does not exist. Please fund the treasury.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get recipient's USDC token account
    const recipientATA = await getAssociatedTokenAddress(
      USDC_MINT,
      recipientPubkey
    );

    // Build transaction
    const transaction = new Transaction();

    // Check if recipient ATA exists, if not create it
    const recipientATAInfo = await connection.getAccountInfo(recipientATA);
    if (!recipientATAInfo) {
      console.log('Creating recipient ATA:', recipientATA.toBase58());
      transaction.add(
        createAssociatedTokenAccountInstruction(
          treasuryPubkey, // payer
          recipientATA, // associated token account
          recipientPubkey, // owner
          USDC_MINT // mint
        )
      );
    }

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        treasuryATA, // source
        recipientATA, // destination
        treasuryPubkey, // owner
        amountBaseUnits // amount
      )
    );

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryPubkey;

    console.log('Sending transaction...');

    // Sign and send transaction
    let signature: string;
    try {
      signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [treasuryKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3,
        }
      );
    } catch (txError) {
      console.error('Transaction failed:', txError);
      return new Response(JSON.stringify({
        error: 'Transaction failed',
        details: txError instanceof Error ? txError.message : 'Unknown transaction error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Transaction confirmed:', signature);

    // Update payout request with transaction details
    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        tx_signature: signature,
        tx_confirmed_at: new Date().toISOString(),
        blockchain_network: 'solana-mainnet',
        crypto_amount: amountUSD,
        wallet_address: walletAddress,
        transaction_id: signature, // Also store in legacy field for compatibility
      })
      .eq('id', payoutRequestId);

    if (updateError) {
      console.error('Failed to update payout request:', updateError);
      // Transaction was successful, but DB update failed
      // Log this for manual reconciliation
      return new Response(JSON.stringify({
        success: true,
        warning: 'Transaction sent but database update failed',
        signature,
        solscanUrl: `https://solscan.io/tx/${signature}`,
        amount: amountUSD,
        recipient: walletAddress,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update related wallet_transaction if exists
    const { data: pendingTransaction } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", payoutRequest.user_id)
      .eq("type", "withdrawal")
      .eq("amount", -Number(payoutRequest.amount))
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingTransaction) {
      await supabase
        .from("wallet_transactions")
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
          metadata: { tx_signature: signature, blockchain: 'solana-mainnet' }
        })
        .eq("id", pendingTransaction.id);
    }

    console.log('Crypto payout completed successfully', {
      payoutRequestId,
      signature,
      amount: amountUSD,
      recipient: walletAddress,
    });

    return new Response(JSON.stringify({
      success: true,
      signature,
      solscanUrl: `https://solscan.io/tx/${signature}`,
      amount: amountUSD,
      recipient: walletAddress,
      network: 'solana-mainnet',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error processing crypto payout:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
