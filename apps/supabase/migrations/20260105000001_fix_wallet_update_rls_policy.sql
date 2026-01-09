-- Fix critical security vulnerability: Users could update their wallet balance directly
-- This migration restricts wallet updates to only payout-related columns

-- Step 1: Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can update own wallet payout methods" ON wallets;

-- Step 2: Create a function to validate wallet updates
-- This function ensures users can only update payout_method and payout_details
CREATE OR REPLACE FUNCTION check_wallet_update_allowed()
RETURNS TRIGGER AS $$
BEGIN
  -- If using service role key (auth.uid() is NULL), allow all updates
  -- This is needed for edge functions that process legitimate transactions
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- If the user is an admin, allow all updates
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- For regular users, only allow updating payout_method and payout_details
  -- Check if any restricted columns are being modified
  IF OLD.balance IS DISTINCT FROM NEW.balance THEN
    RAISE EXCEPTION 'Users cannot modify wallet balance directly';
  END IF;

  IF OLD.total_earned IS DISTINCT FROM NEW.total_earned THEN
    RAISE EXCEPTION 'Users cannot modify total_earned directly';
  END IF;

  IF OLD.total_withdrawn IS DISTINCT FROM NEW.total_withdrawn THEN
    RAISE EXCEPTION 'Users cannot modify total_withdrawn directly';
  END IF;

  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Users cannot modify user_id';
  END IF;

  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Users cannot modify wallet id';
  END IF;

  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Users cannot modify created_at';
  END IF;

  -- Allow the update (only payout_method, payout_details, updated_at can change)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to enforce the column restrictions
DROP TRIGGER IF EXISTS enforce_wallet_update_restrictions ON wallets;
CREATE TRIGGER enforce_wallet_update_restrictions
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION check_wallet_update_allowed();

-- Step 4: Create new restrictive RLS policy for user updates
CREATE POLICY "Users can update own wallet payout details only"
  ON wallets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment explaining the security model
COMMENT ON FUNCTION check_wallet_update_allowed() IS
  'Security function: Ensures regular users can only update payout_method and payout_details columns.
   Balance and totals must be modified through edge functions (service role) or by admins.';
