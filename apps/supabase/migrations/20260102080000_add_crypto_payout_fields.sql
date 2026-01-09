-- Add crypto payout tracking fields to payout_requests
-- This enables automated Solana USDC payouts with transaction tracking

-- Add blockchain-related columns
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS blockchain_network TEXT;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS tx_signature TEXT;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS tx_confirmed_at TIMESTAMPTZ;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS crypto_amount DECIMAL(20,6);
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Add index for transaction lookups (useful for reconciliation)
CREATE INDEX IF NOT EXISTS idx_payout_requests_tx_signature ON payout_requests(tx_signature) WHERE tx_signature IS NOT NULL;

-- Add index for blockchain network filtering
CREATE INDEX IF NOT EXISTS idx_payout_requests_blockchain_network ON payout_requests(blockchain_network) WHERE blockchain_network IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN payout_requests.blockchain_network IS 'Blockchain network used for payout (e.g., solana-mainnet)';
COMMENT ON COLUMN payout_requests.tx_signature IS 'Blockchain transaction signature/hash';
COMMENT ON COLUMN payout_requests.tx_confirmed_at IS 'Timestamp when blockchain transaction was confirmed';
COMMENT ON COLUMN payout_requests.crypto_amount IS 'Amount in crypto units (e.g., USDC with 6 decimals)';
COMMENT ON COLUMN payout_requests.wallet_address IS 'Destination wallet address for crypto payouts';
