-- Update existing 'approved' statuses to 'in_transit' first
-- Then add 'in_transit' to the enum

-- Step 1: Create temporary text column
ALTER TABLE payout_requests 
  ADD COLUMN status_temp text;

-- Step 2: Copy current statuses, converting 'approved' to 'in_transit'
UPDATE payout_requests 
SET status_temp = CASE 
  WHEN status::text = 'approved' THEN 'in_transit'
  ELSE status::text 
END;

-- Step 3: Drop policies and old column
DROP POLICY IF EXISTS "Users can create own payout requests" ON payout_requests;
ALTER TABLE payout_requests DROP COLUMN status;

-- Step 4: Create new enum (without 'approved', with 'in_transit')
CREATE TYPE payout_status_new AS ENUM ('pending', 'in_transit', 'completed', 'rejected');

-- Step 5: Add new column with new enum type
ALTER TABLE payout_requests 
  ADD COLUMN status payout_status_new;

-- Step 6: Copy data over
UPDATE payout_requests 
SET status = status_temp::payout_status_new;

-- Step 7: Drop temp column
ALTER TABLE payout_requests DROP COLUMN status_temp;

-- Step 8: Set default and NOT NULL
ALTER TABLE payout_requests 
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL;

-- Step 9: Recreate RLS policy
CREATE POLICY "Users can create own payout requests" 
ON payout_requests 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'pending'::payout_status_new
);