import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-api-key, x-signature, x-timestamp, content-type',
};

interface PaymentRequest {
  campaign_id: string;
  user_id: string;
  amount: number;
  description?: string;
  views?: number;
  platform?: string;
  account_username?: string;
}

// Simple validation function
function validatePaymentRequest(body: any): { valid: boolean; error?: string } {
  if (!body.campaign_id || typeof body.campaign_id !== 'string') {
    return { valid: false, error: 'campaign_id is required and must be a string' };
  }
  
  if (!body.user_id || typeof body.user_id !== 'string') {
    return { valid: false, error: 'user_id is required and must be a string' };
  }
  
  if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
    return { valid: false, error: 'amount is required and must be a positive number' };
  }
  
  if (body.description && typeof body.description !== 'string') {
    return { valid: false, error: 'description must be a string' };
  }
  
  if (body.views && typeof body.views !== 'number') {
    return { valid: false, error: 'views must be a number' };
  }
  
  if (body.platform && typeof body.platform !== 'string') {
    return { valid: false, error: 'platform must be a string' };
  }
  
  if (body.account_username && typeof body.account_username !== 'string') {
    return { valid: false, error: 'account_username must be a string' };
  }
  
  return { valid: true };
}

// HMAC-SHA256 signature verification
async function verifySignature(
  payload: string,
  signature: string,
  timestamp: string,
  apiKey: string
): Promise<boolean> {
  // Check timestamp is within 5 minutes to prevent replay attacks
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - requestTime);
  
  if (timeDiff > 300) { // 5 minutes
    console.error('Request timestamp too old:', timeDiff, 'seconds');
    return false;
  }
  
  // Create the message to sign: timestamp + payload
  const message = `${timestamp}.${payload}`;
  
  // Create HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKey);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    const signature = req.headers.get('x-signature');
    const timestamp = req.headers.get('x-timestamp');
    const expectedApiKey = Deno.env.get('VIRALITY_API_KEY');
    
    // Basic API key check first
    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Invalid API key attempt');
      return new Response(
        JSON.stringify({ error: 'Invalid or missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    if (!checkRateLimit(apiKey)) {
      console.error('Rate limit exceeded for API key');
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 20 requests per minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // If signature is provided, verify it (enhanced security)
    if (signature && timestamp) {
      const isValid = await verifySignature(rawBody, signature, timestamp, expectedApiKey!);
      if (!isValid) {
        console.error('Invalid signature or expired timestamp');
        return new Response(
          JSON.stringify({ error: 'Invalid signature or expired timestamp' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse and validate request body
    const body: PaymentRequest = JSON.parse(rawBody);
    const validation = validatePaymentRequest(body);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { campaign_id, user_id, amount, description, views, platform, account_username } = body;

    // Verify campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, budget, budget_used')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance, total_earned')
      .eq('user_id', user_id)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: 'User wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const balanceBefore = parseFloat(wallet.balance.toString());
    const balanceAfter = balanceBefore + amount;
    const newTotalEarned = parseFloat(wallet.total_earned.toString()) + amount;
    const newBudgetUsed = parseFloat(campaign.budget_used?.toString() || '0') + amount;

    // Create metadata object
    const metadata: any = {
      campaign_id,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      campaign_budget_before: parseFloat(campaign.budget_used?.toString() || '0'),
      campaign_budget_after: newBudgetUsed,
      campaign_total_budget: parseFloat(campaign.budget.toString()),
      signed_request: !!signature, // Track if request was signed
    };

    if (views) metadata.views = views;
    if (platform) metadata.platform = platform;
    if (account_username) metadata.account_username = account_username;

    // Create transaction record
    const transactionDescription = description || 
      `Payment for ${platform || 'campaign'} ${account_username ? `account @${account_username}` : ''}`.trim();

    const { data: transaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        amount,
        type: 'earning',
        status: 'completed',
        description: transactionDescription,
        metadata,
        created_by: null, // API key based, no specific user
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      throw new Error('Failed to create transaction');
    }

    // Update user's wallet
    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update({
        balance: balanceAfter,
        total_earned: newTotalEarned,
      })
      .eq('user_id', user_id);

    if (walletUpdateError) {
      console.error('Wallet update error:', walletUpdateError);
      throw new Error('Failed to update wallet');
    }

    // Update campaign budget used
    const { error: campaignUpdateError } = await supabase
      .from('campaigns')
      .update({
        budget_used: newBudgetUsed,
      })
      .eq('id', campaign_id);

    if (campaignUpdateError) {
      console.error('Campaign update error:', campaignUpdateError);
      // Don't fail the transaction for this
    }

    // Enhanced audit logging
    await supabase
      .from('security_audit_log')
      .insert({
        user_id: null, // API key based
        action: 'CREATE_PAYMENT_API',
        table_name: 'wallet_transactions',
        record_id: transaction.id,
        new_data: {
          transaction_id: transaction.id,
          recipient_user_id: user_id,
          amount,
          campaign_id,
          source: 'api_key',
          signed: !!signature,
          timestamp: timestamp || null,
        },
      });

    console.log(`Payment created via API: ${amount} for user ${profile.username} (${user_id}) in campaign ${campaign.title} [signed: ${!!signature}]`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          id: transaction.id,
          user_id,
          username: profile.username,
          amount,
          campaign_id,
          campaign_title: campaign.title,
          balance_after: balanceAfter,
          total_earned: newTotalEarned,
          description: transactionDescription,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
