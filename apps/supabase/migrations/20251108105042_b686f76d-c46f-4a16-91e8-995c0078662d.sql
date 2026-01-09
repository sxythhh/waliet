-- Add database constraint to prevent duplicate pending withdrawals per user
-- This is a critical security fix to prevent withdrawal request duplication

-- First, create a unique partial index that only applies to pending/in_transit requests
CREATE UNIQUE INDEX idx_unique_pending_withdrawal_per_user 
ON payout_requests (user_id) 
WHERE status IN ('pending', 'in_transit');

-- Add comment explaining the constraint
COMMENT ON INDEX idx_unique_pending_withdrawal_per_user IS 
'Prevents users from having multiple pending/in-transit withdrawal requests simultaneously. Critical for preventing withdrawal duplication exploits.';