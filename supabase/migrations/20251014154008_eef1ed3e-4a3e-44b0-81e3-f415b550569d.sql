-- Add 'balance_correction' to the allowed transaction types
ALTER TABLE wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE wallet_transactions 
ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type IN ('earning', 'withdrawal', 'referral', 'balance_correction'));