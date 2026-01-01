import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { safeLog, safeError, truncateId } from "../_shared/logging.ts";

// Webhooks don't need browser CORS - they're server-to-server
const webhookHeaders = {
  "Content-Type": "application/json",
};

// Verify Slash webhook signature
function verifySlashSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!secret) {
    safeError("SLASH_WEBHOOK_SECRET not configured - webhook signature verification disabled");
    return true; // Allow during development if no secret configured
  }
  
  if (!signature) {
    safeError("No signature provided in Slash webhook request");
    return false; // Reject unsigned webhooks in production
  }
  
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    
    // Support both raw and prefixed signature formats
    const isValid = signature === expectedSignature || 
                   signature === `sha256=${expectedSignature}` ||
                   signature === `v1=${expectedSignature}`;
    
    if (!isValid) {
      safeError("Invalid Slash webhook signature");
    }
    
    return isValid;
  } catch (err) {
    safeError("Slash signature verification error", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('SLASH_WEBHOOK_SECRET') || "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const signature = req.headers.get('x-slash-signature') || req.headers.get('slash-signature');
    
    // Verify signature - reject invalid signatures
    if (!verifySlashSignature(rawBody, signature, webhookSecret)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: webhookHeaders,
      });
    }

    const payload = JSON.parse(rawBody);
    
    // Log without sensitive data
    const eventType = payload.type || payload.event;
    safeLog('Slash webhook received', { eventType, hasTransaction: !!payload.transaction });

    // Handle deposit/transaction events
    if (eventType?.includes('transaction') || eventType?.includes('deposit') || payload.transaction) {
      const transaction = payload.transaction || payload.data || payload;
      
      const virtualAccountId = transaction.virtualAccountId || 
                               transaction.virtual_account_id || 
                               transaction.destination?.virtualAccountId;
      
      if (!virtualAccountId) {
        safeLog('No virtual account ID found in transaction');
        return new Response(JSON.stringify({ success: true, message: 'No virtual account ID' }), {
          headers: webhookHeaders,
        });
      }

      // Find the brand with this virtual account
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('id, name')
        .eq('slash_virtual_account_id', virtualAccountId)
        .single();

      if (brandError || !brand) {
        safeLog('Brand not found for virtual account', { 
          virtualAccountId: truncateId(virtualAccountId) 
        });
        return new Response(JSON.stringify({ success: true, message: 'Brand not found' }), {
          headers: webhookHeaders,
        });
      }

      // Get the deposit amount (Slash uses cents)
      const amountCents = transaction.amountCents || transaction.amount_cents || transaction.amount || 0;
      const amountDollars = amountCents / 100;

      safeLog('Processing Slash deposit', { 
        brandId: truncateId(brand.id), 
        amount: amountDollars 
      });

      // Check if this transaction was already processed (idempotency)
      const transactionId = transaction.id || transaction.transactionId;
      if (transactionId) {
        const { data: existingTx } = await supabase
          .from('brand_wallet_transactions')
          .select('id')
          .eq('metadata->>slash_transaction_id', transactionId)
          .single();

        if (existingTx) {
          safeLog('Transaction already processed', { 
            transactionId: truncateId(transactionId) 
          });
          return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
            headers: webhookHeaders,
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
        safeLog('Using manual update for brand wallet');
        
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
      const { data: currentBrand } = await supabase
        .from('brands')
        .select('slash_balance_cents')
        .eq('id', brand.id)
        .single();
        
      await supabase
        .from('brands')
        .update({
          slash_balance_cents: (currentBrand?.slash_balance_cents || 0) + amountCents
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

      safeLog('Successfully credited deposit', { 
        brandId: truncateId(brand.id), 
        amount: amountDollars 
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: webhookHeaders,
    });

  } catch (error: unknown) {
    safeError('Error in slash-webhook', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Always return 200 for webhooks to prevent retries
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 200,
      headers: webhookHeaders,
    });
  }
});
