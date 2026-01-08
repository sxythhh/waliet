import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface AdjustWalletInput {
  brand_id: string;
  adjustment_type: 'add' | 'remove';
  amount: number;
  description?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight with proper origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  // Get validated CORS headers for all responses
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // Check if user is admin - CRITICAL SECURITY CHECK
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      console.error('Non-admin attempted wallet adjustment:', {
        user_id: user.id,
        email: user.email,
      });
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const body: AdjustWalletInput = await req.json();
    const { brand_id, adjustment_type, amount, description } = body;

    // Validate inputs
    if (!brand_id) {
      return new Response(JSON.stringify({ error: 'brand_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!adjustment_type || !['add', 'remove'].includes(adjustment_type)) {
      return new Response(JSON.stringify({ error: 'adjustment_type must be "add" or "remove"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
      return new Response(JSON.stringify({ error: 'amount must be a positive number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate brand exists
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return new Response(JSON.stringify({ error: 'Brand not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For removals, check current balance
    if (adjustment_type === 'remove') {
      const { data: transactions } = await supabase
        .from('brand_wallet_transactions')
        .select('type, amount, status')
        .eq('brand_id', brand_id);

      const currentBalance = (transactions || []).reduce((acc, tx) => {
        if (tx.status !== 'completed') return acc;
        const txAmount = Number(tx.amount) || 0;
        if (['deposit', 'topup', 'refund', 'admin_credit'].includes(tx.type)) {
          return acc + txAmount;
        } else {
          return acc - txAmount;
        }
      }, 0);

      if (amount > currentBalance) {
        return new Response(JSON.stringify({
          error: 'Insufficient balance',
          current_balance: currentBalance,
          requested_amount: amount,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Create transaction
    const transactionType = adjustment_type === 'add' ? 'admin_credit' : 'admin_debit';
    const transactionDescription = description || `Admin ${adjustment_type === 'add' ? 'credit' : 'debit'}`;

    const { data: transaction, error: insertError } = await supabase
      .from('brand_wallet_transactions')
      .insert({
        brand_id,
        type: transactionType,
        amount,
        status: 'completed',
        description: transactionDescription,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create wallet transaction:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to adjust wallet' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log admin action for audit trail
    console.log('Admin wallet adjustment:', {
      admin_id: user.id,
      admin_username: adminProfile.username,
      brand_id,
      brand_name: brand.name,
      adjustment_type,
      amount,
      description: transactionDescription,
      transaction_id: transaction.id,
    });

    return new Response(JSON.stringify({
      success: true,
      transaction_id: transaction.id,
      brand_id,
      adjustment_type,
      amount,
      description: transactionDescription,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error adjusting wallet:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
