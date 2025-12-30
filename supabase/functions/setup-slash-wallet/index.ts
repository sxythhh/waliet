import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLASH_API_URL = 'https://api.joinslash.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const slashApiKey = Deno.env.get('SLASH_API_KEY')!;
    
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

    const { brand_id } = await req.json();

    if (!brand_id) {
      return new Response(JSON.stringify({ error: 'brand_id is required' }), {
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

    // Get brand info
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, slug, slash_virtual_account_id')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return new Response(JSON.stringify({ error: 'Brand not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If brand already has a Slash account, return existing info
    if (brand.slash_virtual_account_id) {
      const { data: existingBrand } = await supabase
        .from('brands')
        .select('slash_virtual_account_id, slash_account_number, slash_routing_number, slash_crypto_addresses')
        .eq('id', brand_id)
        .single();

      return new Response(JSON.stringify({ 
        success: true,
        already_exists: true,
        virtual_account_id: existingBrand?.slash_virtual_account_id,
        account_number: existingBrand?.slash_account_number,
        routing_number: existingBrand?.slash_routing_number,
        crypto_addresses: existingBrand?.slash_crypto_addresses || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Creating Slash virtual account for brand: ${brand.name}`);

    // Step 1: Create virtual account
    // Note: accountId is required - this should be the main Slash account ID
    const slashAccountId = Deno.env.get('SLASH_ACCOUNT_ID');
    if (!slashAccountId) {
      console.error('SLASH_ACCOUNT_ID not configured');
      return new Response(JSON.stringify({ error: 'Slash account not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const createAccountResponse = await fetch(`${SLASH_API_URL}/virtual-account`, {
      method: 'POST',
      headers: {
        'X-API-Key': slashApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: slashAccountId,
        name: `Virality - ${brand.name}`
      }),
    });

    if (!createAccountResponse.ok) {
      const errorText = await createAccountResponse.text();
      console.error('Slash create virtual account error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to create virtual account', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountData = await createAccountResponse.json();
    console.log('Slash virtual account created:', JSON.stringify(accountData, null, 2));

    const virtualAccount = accountData.virtualAccount;

    // Step 2: Get crypto deposit addresses
    let cryptoAddresses: any[] = [];
    try {
      const cryptoResponse = await fetch(`${SLASH_API_URL}/crypto/offramp`, {
        method: 'POST',
        headers: {
          'X-API-Key': slashApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          virtualAccountId: virtualAccount.id,
          paymentRail: 'ach',
          currency: 'usdc'
        }),
      });

      if (cryptoResponse.ok) {
        const cryptoData = await cryptoResponse.json();
        cryptoAddresses = cryptoData.addresses || [];
        console.log('Crypto addresses retrieved:', JSON.stringify(cryptoAddresses, null, 2));
      } else {
        console.warn('Failed to get crypto addresses:', await cryptoResponse.text());
      }
    } catch (cryptoError) {
      console.warn('Error getting crypto addresses:', cryptoError);
    }

    // Step 3: Update brand with Slash info
    const { error: updateError } = await supabase
      .from('brands')
      .update({
        slash_virtual_account_id: virtualAccount.id,
        slash_account_number: virtualAccount.accountNumber,
        slash_routing_number: virtualAccount.routingNumber,
        slash_crypto_addresses: cryptoAddresses,
        updated_at: new Date().toISOString()
      })
      .eq('id', brand_id);

    if (updateError) {
      console.error('Error updating brand:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to save wallet info' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 4: Create brand_wallet record if it doesn't exist
    const { error: walletError } = await supabase
      .from('brand_wallets')
      .upsert({
        brand_id: brand_id,
        balance: 0,
        total_deposited: 0,
        total_spent: 0,
        currency: 'usd'
      }, { onConflict: 'brand_id' });

    if (walletError) {
      console.warn('Error creating brand wallet:', walletError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      virtual_account_id: virtualAccount.id,
      account_number: virtualAccount.accountNumber,
      routing_number: virtualAccount.routingNumber,
      crypto_addresses: cryptoAddresses
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in setup-slash-wallet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
