-- =============================================
-- ADD FOREIGN KEY CONSTRAINT TO PAYOUT_REQUESTS
-- Ensures payout_requests.user_id references a valid profile
-- =============================================

-- Check if the constraint already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_payout_requests_user_id'
    AND table_name = 'payout_requests'
  ) THEN
    -- Add foreign key constraint with ON DELETE CASCADE
    -- This ensures that when a profile is deleted, associated payout requests are also deleted
    ALTER TABLE payout_requests
    ADD CONSTRAINT fk_payout_requests_user_id
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- Add index for better query performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);

-- Add comment documenting the constraint
COMMENT ON CONSTRAINT fk_payout_requests_user_id ON payout_requests IS
'Ensures user_id references a valid profile. Cascade deletes payout requests when profile is deleted.';
