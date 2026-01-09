import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Keypair, PublicKey } from 'https://esm.sh/@solana/web3.js@1.98.0';
import * as bip39 from 'https://esm.sh/bip39@3.1.0';
import { derivePath } from 'https://esm.sh/ed25519-hd-key@1.3.0';
import { ethers } from 'https://esm.sh/ethers@6.13.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supported networks
const SUPPORTED_NETWORKS = ['solana', 'ethereum', 'base', 'polygon', 'arbitrum', 'optimism'] as const;
type Network = typeof SUPPORTED_NETWORKS[number];

interface GenerateAddressRequest {
  brand_id?: string;
  user_id?: string;
  network: Network;
  label?: string;
}

interface GenerateAddressResponse {
  success: boolean;
  address?: string;
  network?: string;
  derivation_index?: number;
  already_exists?: boolean;
  error?: string;
}

// Derive Solana keypair from seed using BIP-44 path
function deriveSolanaKeypair(seed: Buffer, index: number): Keypair {
  // BIP-44 path for Solana: m/44'/501'/0'/0'/{index}'
  const path = `m/44'/501'/0'/0'/${index}'`;
  const derivedSeed = derivePath(path, seed.toString('hex')).key;
  return Keypair.fromSeed(derivedSeed);
}

// Derive EVM address from seed using standard BIP-44 path
function deriveEvmAddress(seed: Buffer, index: number): string {
  // Use ethers HDNode for standard derivation
  const hdNode = ethers.HDNodeWallet.fromSeed(seed);
  // BIP-44 path for Ethereum: m/44'/60'/0'/0/{index}
  const derivedWallet = hdNode.derivePath(`m/44'/60'/0'/0/${index}`);
  return derivedWallet.address;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment setup
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const treasurySeed = Deno.env.get('SOLANA_TREASURY_SEED');

    if (!treasurySeed) {
      console.error('SOLANA_TREASURY_SEED not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'Deposit addresses not configured',
      } as GenerateAddressResponse), {
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
        error: 'Unauthorized'
      } as GenerateAddressResponse), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      } as GenerateAddressResponse), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: GenerateAddressRequest = await req.json();
    const { brand_id, user_id, network, label } = body;

    // Validate request
    if (!brand_id && !user_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either brand_id or user_id is required'
      } as GenerateAddressResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (brand_id && user_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Cannot specify both brand_id and user_id'
      } as GenerateAddressResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!network || !SUPPORTED_NETWORKS.includes(network)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid network. Supported: ${SUPPORTED_NETWORKS.join(', ')}`
      } as GenerateAddressResponse), {
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
        // Check if admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!profile?.is_admin) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Not authorized for this brand'
          } as GenerateAddressResponse), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Validate authorization for user (must be self or admin)
    if (user_id && user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Can only generate address for yourself'
        } as GenerateAddressResponse), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Generating deposit address', { brand_id, user_id, network, requestedBy: user.id });

    // Check if address already exists for this owner + network
    const existingQuery = supabase
      .from('crypto_deposit_addresses')
      .select('id, deposit_address, derivation_index')
      .eq('blockchain_network', network)
      .eq('is_active', true);

    if (brand_id) {
      existingQuery.eq('brand_id', brand_id);
    } else {
      existingQuery.eq('user_id', user_id);
    }

    const { data: existingAddress } = await existingQuery.single();

    if (existingAddress) {
      console.log('Address already exists', { address: existingAddress.deposit_address });
      return new Response(JSON.stringify({
        success: true,
        address: existingAddress.deposit_address,
        network,
        derivation_index: existingAddress.derivation_index,
        already_exists: true
      } as GenerateAddressResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert mnemonic to seed
    const seed = await bip39.mnemonicToSeed(treasurySeed);

    // Get next derivation index atomically
    const chainType = network === 'solana' ? 'solana' : 'evm';
    const { data: indexData, error: indexError } = await supabase
      .rpc('get_next_derivation_index', { p_chain_type: chainType });

    if (indexError) {
      console.error('Failed to get derivation index', indexError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to generate address'
      } as GenerateAddressResponse), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const derivationIndex = indexData as number;
    let depositAddress: string;

    // Generate address based on network
    if (network === 'solana') {
      const keypair = deriveSolanaKeypair(Buffer.from(seed), derivationIndex);
      depositAddress = keypair.publicKey.toBase58();
    } else {
      // All EVM chains share the same address derivation
      depositAddress = deriveEvmAddress(Buffer.from(seed), derivationIndex);
    }

    console.log('Generated new address', { address: depositAddress, network, derivationIndex });

    // Store the new address
    const insertData: any = {
      blockchain_network: network,
      deposit_address: depositAddress,
      derivation_index: derivationIndex,
      label: label || `${network.charAt(0).toUpperCase() + network.slice(1)} Deposit`,
      is_active: true
    };

    if (brand_id) {
      insertData.brand_id = brand_id;
    } else {
      insertData.user_id = user_id;
    }

    const { error: insertError } = await supabase
      .from('crypto_deposit_addresses')
      .insert(insertData);

    if (insertError) {
      console.error('Failed to store address', insertError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to store deposit address'
      } as GenerateAddressResponse), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      address: depositAddress,
      network,
      derivation_index: derivationIndex,
      already_exists: false
    } as GenerateAddressResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating deposit address:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as GenerateAddressResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
