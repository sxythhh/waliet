import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-helius-signature',
};

// Solana USDC Mint address (mainnet)
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DECIMALS = 6;

interface HeliusTokenTransfer {
  mint: string;
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  tokenStandard: string;
}

interface HeliusWebhookPayload {
  accountData: any[];
  description: string;
  events: any;
  fee: number;
  feePayer: string;
  instructions: any[];
  nativeTransfers: any[];
  signature: string;
  slot: number;
  source: string;
  timestamp: number;
  tokenTransfers: HeliusTokenTransfer[];
  transactionError: any;
  type: string;
}

// Verify Helius webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return expectedSignature === signature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const webhookSecret = Deno.env.get('HELIUS_WEBHOOK_SECRET');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('x-helius-signature');
      if (!signature) {
        console.error('Missing Helius signature header');
        return new Response(JSON.stringify({ error: 'Missing signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!verifySignature(rawBody, signature, webhookSecret)) {
        console.error('Invalid Helius signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Parse the payload (can be array or single object)
    const payload = JSON.parse(rawBody);
    const transactions: HeliusWebhookPayload[] = Array.isArray(payload) ? payload : [payload];

    console.log(`Processing ${transactions.length} transaction(s) from Helius webhook`);

    const results: any[] = [];

    for (const tx of transactions) {
      // Skip if no token transfers
      if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) {
        console.log(`Skipping tx ${tx.signature} - no token transfers`);
        continue;
      }

      // Process each token transfer
      for (const transfer of tx.tokenTransfers) {
        // Skip if not USDC
        if (transfer.mint !== USDC_MINT) {
          console.log(`Skipping transfer - not USDC (mint: ${transfer.mint})`);
          continue;
        }

        // Skip if zero amount
        if (!transfer.tokenAmount || transfer.tokenAmount <= 0) {
          console.log(`Skipping transfer - zero or negative amount`);
          continue;
        }

        const toAddress = transfer.toUserAccount;
        const fromAddress = transfer.fromUserAccount;
        const rawAmount = transfer.tokenAmount;
        const decimalAmount = rawAmount / Math.pow(10, USDC_DECIMALS);

        console.log(`Processing USDC transfer: ${decimalAmount} USDC to ${toAddress}`);

        // Check if this is one of our deposit addresses
        const { data: depositAddress, error: addressError } = await supabase
          .from('crypto_deposit_addresses')
          .select('id, brand_id, user_id')
          .eq('deposit_address', toAddress)
          .eq('blockchain_network', 'solana')
          .eq('is_active', true)
          .single();

        if (addressError || !depositAddress) {
          console.log(`Address ${toAddress} not found in our system - skipping`);
          continue;
        }

        console.log(`Found deposit address for ${depositAddress.brand_id ? 'brand' : 'user'}`);

        // Check for duplicate (idempotency)
        const { data: existingDeposit } = await supabase
          .from('crypto_deposits')
          .select('id, status')
          .eq('tx_signature', tx.signature)
          .eq('blockchain_network', 'solana')
          .single();

        if (existingDeposit) {
          console.log(`Deposit already exists for tx ${tx.signature} with status ${existingDeposit.status}`);
          results.push({
            tx_signature: tx.signature,
            status: 'already_exists',
            deposit_id: existingDeposit.id,
          });
          continue;
        }

        // Create the deposit record
        const depositData: any = {
          deposit_address_id: depositAddress.id,
          brand_id: depositAddress.brand_id,
          user_id: depositAddress.user_id,
          blockchain_network: 'solana',
          tx_signature: tx.signature,
          from_address: fromAddress,
          to_address: toAddress,
          token_mint: USDC_MINT,
          token_symbol: 'USDC',
          raw_amount: rawAmount,
          decimal_amount: decimalAmount,
          usd_value: decimalAmount, // USDC is 1:1 with USD
          status: 'confirmed',
          confirmations: 1,
          required_confirmations: 1,
          block_time: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : null,
          detected_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
          source: 'webhook',
          webhook_payload: tx,
        };

        const { data: newDeposit, error: insertError } = await supabase
          .from('crypto_deposits')
          .insert(depositData)
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting deposit:', insertError);
          results.push({
            tx_signature: tx.signature,
            status: 'insert_error',
            error: insertError.message,
          });
          continue;
        }

        console.log(`Created deposit record ${newDeposit.id}`);

        // Credit the deposit to the wallet
        try {
          const { data: creditResult, error: creditError } = await supabase
            .rpc('atomic_credit_crypto_deposit', { p_deposit_id: newDeposit.id });

          if (creditError) {
            console.error('Error crediting deposit:', creditError);
            results.push({
              tx_signature: tx.signature,
              status: 'credit_error',
              deposit_id: newDeposit.id,
              error: creditError.message,
            });
          } else {
            console.log('Deposit credited successfully:', creditResult);
            results.push({
              tx_signature: tx.signature,
              status: 'credited',
              deposit_id: newDeposit.id,
              amount: decimalAmount,
              ...creditResult,
            });
          }
        } catch (creditErr: any) {
          console.error('Exception crediting deposit:', creditErr);
          results.push({
            tx_signature: tx.signature,
            status: 'credit_exception',
            deposit_id: newDeposit.id,
            error: creditErr.message,
          });
        }
      }
    }

    console.log(`Webhook processing complete. Results:`, results);

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
