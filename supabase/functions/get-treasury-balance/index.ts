import { Connection, PublicKey, Keypair } from 'https://esm.sh/@solana/web3.js@1.95.4';
import { getAssociatedTokenAddress, getAccount } from 'https://esm.sh/@solana/spl-token@0.4.9';
import { decode as bs58Decode } from 'https://esm.sh/bs58@6.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Solana USDC on Mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDC_DECIMALS = 6;
const LAMPORTS_PER_SOL = 1000000000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const treasuryPrivateKey = Deno.env.get('SOLANA_TREASURY_PRIVATE_KEY');
    const heliusApiKey = Deno.env.get('HELIUS_API_KEY');

    if (!treasuryPrivateKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Treasury wallet not configured',
      }), {
        status: 200, // Return 200 with error message for UI handling
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!heliusApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'RPC provider not configured',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set up connection
    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
    const connection = new Connection(rpcUrl, 'confirmed');

    // Load treasury keypair (only to get public key)
    const treasurySecretKey = bs58Decode(treasuryPrivateKey);
    const treasuryKeypair = Keypair.fromSecretKey(treasurySecretKey);
    const treasuryPubkey = treasuryKeypair.publicKey;

    // Get SOL balance
    const solBalanceLamports = await connection.getBalance(treasuryPubkey);
    const solBalance = solBalanceLamports / LAMPORTS_PER_SOL;

    // Get USDC balance
    let usdcBalance = 0;
    try {
      const treasuryATA = await getAssociatedTokenAddress(USDC_MINT, treasuryPubkey);
      const tokenAccount = await getAccount(connection, treasuryATA);
      usdcBalance = Number(tokenAccount.amount) / Math.pow(10, USDC_DECIMALS);
    } catch (e) {
      // Token account might not exist yet
      console.log('Treasury USDC token account not found, balance is 0');
      usdcBalance = 0;
    }

    return new Response(JSON.stringify({
      success: true,
      treasuryAddress: treasuryPubkey.toBase58(),
      usdcBalance,
      solBalance,
      network: 'solana-mainnet',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error fetching treasury balance:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
