/**
 * Treasury Wallet Generator for Solana USDC Payouts
 *
 * Run this script LOCALLY to generate a new treasury keypair.
 * NEVER run this on a server or commit the output to version control.
 *
 * Usage:
 *   npx ts-node scripts/generate-treasury-wallet.ts
 *
 * After running:
 * 1. Copy the PUBLIC KEY - this is your treasury address to fund
 * 2. Store the PRIVATE KEY securely in Supabase secrets as SOLANA_TREASURY_PRIVATE_KEY
 * 3. Fund the treasury with SOL (for tx fees) and USDC
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

function generateTreasuryWallet() {
  console.log('\n🔐 Generating new Solana Treasury Wallet...\n');
  console.log('=' .repeat(60));

  // Generate new keypair
  const keypair = Keypair.generate();

  // Get public key (address)
  const publicKey = keypair.publicKey.toBase58();

  // Get private key in base58 format (for Supabase secrets)
  const privateKey = bs58.encode(keypair.secretKey);

  console.log('\n📍 PUBLIC KEY (Treasury Address):');
  console.log(`   ${publicKey}`);
  console.log('\n   Use this address to:');
  console.log('   • Receive USDC from your exchange');
  console.log('   • Send SOL for transaction fees (~0.1 SOL recommended)');
  console.log('   • View balance on Solscan: https://solscan.io/account/' + publicKey);

  console.log('\n🔑 PRIVATE KEY (KEEP SECRET - Store in Supabase):');
  console.log(`   ${privateKey}`);
  console.log('\n   ⚠️  IMPORTANT:');
  console.log('   • NEVER share this key');
  console.log('   • NEVER commit to git');
  console.log('   • Store as SOLANA_TREASURY_PRIVATE_KEY in Supabase secrets');

  console.log('\n' + '=' .repeat(60));
  console.log('\n📋 Next Steps:');
  console.log('1. Copy the private key and store in Supabase Dashboard:');
  console.log('   Settings → Edge Functions → Secrets → Add new secret');
  console.log('   Name: SOLANA_TREASURY_PRIVATE_KEY');
  console.log('   Value: <paste private key>');
  console.log('\n2. Fund the treasury address with:');
  console.log('   • ~0.1 SOL (for transaction fees)');
  console.log('   • USDC (for payouts)');
  console.log('\n3. Set up Helius API key:');
  console.log('   • Sign up at https://helius.dev');
  console.log('   • Add HELIUS_API_KEY to Supabase secrets');
  console.log('\n');
}

// Run if executed directly
generateTreasuryWallet();
