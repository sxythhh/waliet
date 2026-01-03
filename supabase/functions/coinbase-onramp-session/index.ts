import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from 'https://deno.land/std@0.177.0/encoding/base64.ts';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnrampSessionRequest {
  brand_id?: string;
  user_id?: string;
  amount_usd?: number;
  network?: string;
}

interface OnrampSessionResponse {
  success: boolean;
  session_url?: string;
  deposit_address?: string;
  error?: string;
}

// Coinbase Onramp API endpoint
const COINBASE_ONRAMP_URL = 'https://pay.coinbase.com/buy/select-asset';

// Supported destination networks for Coinbase Onramp
const NETWORK_TO_COINBASE: Record<string, { network: string; asset: string }> = {
  solana: { network: 'solana', asset: 'USDC' },
  ethereum: { network: 'ethereum', asset: 'USDC' },
  base: { network: 'base', asset: 'USDC' },
  polygon: { network: 'polygon', asset: 'USDC' },
  arbitrum: { network: 'arbitrum', asset: 'USDC' },
  optimism: { network: 'optimism', asset: 'USDC' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const coinbaseAppId = Deno.env.get('COINBASE_ONRAMP_APP_ID');

    if (!coinbaseAppId) {
      console.error('Coinbase Onramp not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'Coinbase Onramp not configured',
      } as OnrampSessionResponse), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized',
      } as OnrampSessionResponse), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized',
      } as OnrampSessionResponse), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const body: OnrampSessionRequest = await req.json();
    const { brand_id, user_id, amount_usd, network = 'solana' } = body;

    // Validate owner
    if (!brand_id && !user_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either brand_id or user_id is required',
      } as OnrampSessionResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate network
    const coinbaseNetwork = NETWORK_TO_COINBASE[network];
    if (!coinbaseNetwork) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid network: ${network}`,
      } as OnrampSessionResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate authorization for brand
    if (brand_id) {
      const { data: membership } = await supabase
        .from('brand_members')
        .select('role')
        .eq('brand_id', brand_id)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!profile?.is_admin) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Not authorized for this brand',
          } as OnrampSessionResponse), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Get or create deposit address
    const addressQuery = supabase
      .from('crypto_deposit_addresses')
      .select('deposit_address')
      .eq('blockchain_network', network)
      .eq('is_active', true);

    if (brand_id) {
      addressQuery.eq('brand_id', brand_id);
    } else {
      addressQuery.eq('user_id', user_id || user.id);
    }

    const { data: existingAddress } = await addressQuery.single();

    let depositAddress: string;

    if (existingAddress) {
      depositAddress = existingAddress.deposit_address;
    } else {
      // Generate new address via the generate-deposit-address function
      const { data: newAddress, error: genError } = await supabase.functions.invoke(
        'generate-deposit-address',
        {
          body: {
            brand_id,
            user_id: user_id || (brand_id ? undefined : user.id),
            network,
          },
          headers: {
            Authorization: authHeader,
          },
        }
      );

      if (genError || !newAddress?.success) {
        return new Response(JSON.stringify({
          success: false,
          error: newAddress?.error || 'Failed to generate deposit address',
        } as OnrampSessionResponse), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      depositAddress = newAddress.address;
    }

    console.log('Creating Coinbase Onramp session', {
      brand_id,
      user_id,
      network,
      depositAddress,
      amount_usd,
    });

    // Build Coinbase Onramp URL with parameters
    const params = new URLSearchParams({
      appId: coinbaseAppId,
      destinationWallets: JSON.stringify([{
        address: depositAddress,
        blockchains: [coinbaseNetwork.network],
        assets: [coinbaseNetwork.asset],
      }]),
      defaultNetwork: coinbaseNetwork.network,
      defaultAsset: coinbaseNetwork.asset,
    });

    // Add optional amount preset
    if (amount_usd && amount_usd > 0) {
      params.set('presetFiatAmount', amount_usd.toString());
      params.set('fiatCurrency', 'USD');
    }

    // Add partner user ID for tracking
    const partnerUserId = brand_id || user_id || user.id;
    params.set('partnerUserId', partnerUserId);

    const sessionUrl = `${COINBASE_ONRAMP_URL}?${params.toString()}`;

    // Log the session creation
    await supabase.from('crypto_deposits').insert({
      deposit_address_id: null, // Will be linked when deposit comes in
      brand_id,
      user_id: user_id || (brand_id ? null : user.id),
      blockchain_network: network,
      tx_signature: `coinbase_session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      from_address: null,
      to_address: depositAddress,
      token_mint: 'USDC',
      token_symbol: 'USDC',
      raw_amount: 0,
      decimal_amount: 0,
      usd_value: amount_usd || 0,
      status: 'pending',
      source: 'coinbase_onramp',
      notes: 'Coinbase Onramp session initiated',
    }).then(() => {
      console.log('Logged Coinbase Onramp session initiation');
    }).catch((err) => {
      // Non-critical, just log
      console.warn('Failed to log Coinbase session:', err);
    });

    return new Response(JSON.stringify({
      success: true,
      session_url: sessionUrl,
      deposit_address: depositAddress,
    } as OnrampSessionResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating Coinbase Onramp session:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as OnrampSessionResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
