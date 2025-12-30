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

    const payload = await req.json();
    console.log('Slash webhook received:', JSON.stringify(payload, null, 2));

    // Handle different webhook event types
    const eventType = payload.type || payload.event;
    
    if (!eventType) {
      console.log('No event type in payload, checking for transaction data');
    }

    // Handle deposit/transaction events
    // Common event types: transaction.completed, deposit.completed, etc.
    if (eventType?.includes('transaction') || eventType?.includes('deposit') || payload.transaction) {
      const transaction = payload.transaction || payload.data || payload;
      
      // Get virtual account ID from the transaction
      const virtualAccountId = transaction.virtualAccountId || 
                               transaction.virtual_account_id || 
                               transaction.destination?.virtualAccountId;
      
      if (!virtualAccountId) {
        console.error('No virtual account ID found in transaction');
        return new Response(JSON.stringify({ success: true, message: 'No virtual account ID' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find the brand with this virtual account
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('id, name')
        .eq('slash_virtual_account_id', virtualAccountId)
        .single();

      if (brandError || !brand) {
        console.error('Brand not found for virtual account:', virtualAccountId);
        return new Response(JSON.stringify({ success: true, message: 'Brand not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get the deposit amount (Slash uses cents)
      const amountCents = transaction.amountCents || transaction.amount_cents || transaction.amount || 0;
      const amountDollars = amountCents / 100;

      console.log(`Processing deposit of $${amountDollars} for brand ${brand.name} (${brand.id})`);

      // Check if this transaction was already processed (idempotency)
      const transactionId = transaction.id || transaction.transactionId;
      if (transactionId) {
        const { data: existingTx } = await supabase
          .from('brand_wallet_transactions')
          .select('id')
          .eq('metadata->>slash_transaction_id', transactionId)
          .single();

        if (existingTx) {
          console.log('Transaction already processed:', transactionId);
          return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Update brand_wallets balance
      const { error: walletUpdateError } = await supabase.rpc('update_brand_wallet_balance', {
        p_brand_id: brand.id,
        p_amount: amountDollars
      });

      // If RPC doesn't exist, do it manually
      if (walletUpdateError) {
        console.log('Using manual update for brand wallet');
        
        // Check if wallet exists
        const { data: existingWallet } = await supabase
          .from('brand_wallets')
          .select('id, balance, total_deposited')
          .eq('brand_id', brand.id)
          .single();

        if (existingWallet) {
          await supabase
            .from('brand_wallets')
            .update({
              balance: Number(existingWallet.balance) + amountDollars,
              total_deposited: Number(existingWallet.total_deposited) + amountDollars,
              updated_at: new Date().toISOString()
            })
            .eq('brand_id', brand.id);
        } else {
          await supabase
            .from('brand_wallets')
            .insert({
              brand_id: brand.id,
              balance: amountDollars,
              total_deposited: amountDollars,
              currency: 'usd'
            });
        }
      }

      // Update brands.slash_balance_cents for quick access
      await supabase
        .from('brands')
        .update({
          slash_balance_cents: (await supabase
            .from('brands')
            .select('slash_balance_cents')
            .eq('id', brand.id)
            .single()
          ).data?.slash_balance_cents + amountCents
        })
        .eq('id', brand.id);

      // Record the transaction
      await supabase
        .from('brand_wallet_transactions')
        .insert({
          brand_id: brand.id,
          type: 'deposit',
          amount: amountDollars,
          status: 'completed',
          description: `Slash deposit - ${transaction.paymentMethod || transaction.payment_rail || 'wire'}`,
          metadata: {
            slash_transaction_id: transactionId,
            source: 'slash_webhook',
            payment_method: transaction.paymentMethod || transaction.payment_rail,
            raw_event: eventType
          }
        });

      console.log(`Successfully credited $${amountDollars} to brand ${brand.name}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in slash-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Always return 200 for webhooks to prevent retries
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
