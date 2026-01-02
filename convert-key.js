// Run with: node convert-key.js
// Then delete this file immediately after!

const bs58 = require('bs58');

// Paste your JSON array key here (between the brackets)
const keyArray = [
  // Example: 123, 45, 67, 89, ...
  // Paste your full array here
];

if (keyArray.length === 0) {
  console.log('\n⚠️  Please paste your key array inside the keyArray brackets!\n');
  console.log('Example format:');
  console.log('const keyArray = [123, 45, 67, 89, 12, 34, ...];');
  console.log('\nThe array should have 64 numbers (0-255).\n');
  process.exit(1);
}

if (keyArray.length !== 64) {
  console.log(`\n⚠️  Your key has ${keyArray.length} bytes, but Solana keys need exactly 64 bytes.\n`);
  process.exit(1);
}

const base58Key = bs58.encode(Buffer.from(keyArray));

console.log('\n✅ Your base58-encoded private key:\n');
console.log(base58Key);
console.log('\n⚠️  IMPORTANT: Copy this key and DELETE this file immediately!\n');
console.log('Set this as SOLANA_TREASURY_PRIVATE_KEY in Supabase Edge Functions secrets.\n');
