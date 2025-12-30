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

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { brand_id, amount, description } = await req.json();

    if (!brand_id || !amount) {
      return new Response(JSON.stringify({ error: 'brand_id and amount are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Amount must be a positive number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin of this brand
    const { data: memberData, error: memberError } = await supabase
      .from('brand_members')
      .select('role')
      .eq('brand_id', brand_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData || !['owner', 'admin'].includes(memberData.role)) {
      return new Response(JSON.stringify({ error: 'Not authorized for this brand' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get brand wallet balance
    const { data: brandWallet, error: brandWalletError } = await supabase
      .from('brand_wallets')
      .select('id, balance, total_spent')
      .eq('brand_id', brand_id)
      .single();

    if (brandWalletError || !brandWallet) {
      return new Response(JSON.stringify({ error: 'Brand wallet not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentBrandBalance = Number(brandWallet.balance) || 0;
    if (currentBrandBalance < transferAmount) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient balance in brand wallet',
        current_balance: currentBrandBalance,
        requested_amount: transferAmount
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get brand info
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

    console.log(`Transferring $${transferAmount} from brand ${brand.name} to user ${user.id}`);

    // Deduct from brand wallet
    const { error: deductError } = await supabase
      .from('brand_wallets')
      .update({
        balance: currentBrandBalance - transferAmount,
        total_spent: Number(brandWallet.total_spent || 0) + transferAmount,
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brand_id);

    if (deductError) {
      console.error('Error deducting from brand wallet:', deductError);
      return new Response(JSON.stringify({ error: 'Failed to deduct from brand wallet' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record brand wallet transaction
    await supabase
      .from('brand_wallet_transactions')
      .insert({
        brand_id: brand_id,
        type: 'transfer_out',
        amount: -transferAmount,
        status: 'completed',
        description: description || `Transfer to personal wallet`,
        created_by: user.id,
        metadata: {
          destination_type: 'personal_wallet',
          destination_user_id: user.id
        }
      });

    // Get or create user's personal wallet
    let { data: personalWallet } = await supabase
      .from('wallets')
      .select('id, balance, total_earned')
      .eq('user_id', user.id)
      .single();

    if (!personalWallet) {
      // Create wallet if it doesn't exist
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
          pending_balance: 0
        })
        .select()
        .single();
      
      personalWallet = newWallet;
    }

    if (!personalWallet) {
      return new Response(JSON.stringify({ error: 'Failed to get or create personal wallet' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Credit personal wallet
    const { error: creditError } = await supabase
      .from('wallets')
      .update({
        balance: Number(personalWallet.balance) + transferAmount,
        total_earned: Number(personalWallet.total_earned || 0) + transferAmount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (creditError) {
      console.error('Error crediting personal wallet:', creditError);
      // Try to rollback brand wallet
      await supabase
        .from('brand_wallets')
        .update({
          balance: currentBrandBalance,
          total_spent: Number(brandWallet.total_spent || 0),
          updated_at: new Date().toISOString()
        })
        .eq('brand_id', brand_id);
      
      return new Response(JSON.stringify({ error: 'Failed to credit personal wallet' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record personal wallet transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: transferAmount,
        type: 'transfer_in',
        status: 'completed',
        description: description || `Transfer from brand: ${brand.name}`,
        metadata: {
          source_type: 'brand_wallet',
          brand_id: brand_id,
          brand_name: brand.name
        }
      });

    console.log(`Successfully transferred $${transferAmount} from brand ${brand.name} to user ${user.id}`);

    // Get updated balances
    const { data: updatedPersonalWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const { data: updatedBrandWallet } = await supabase
      .from('brand_wallets')
      .select('balance')
      .eq('brand_id', brand_id)
      .single();

    return new Response(JSON.stringify({ 
      success: true,
      transfer_amount: transferAmount,
      personal_wallet_balance: Number(updatedPersonalWallet?.balance) || 0,
      brand_wallet_balance: Number(updatedBrandWallet?.balance) || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in brand-to-personal-transfer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
