-- Fix infinite recursion in business_members RLS policies
-- The "Users can view co-members" policy references business_members table in its own check,
-- causing infinite recursion when Postgres evaluates the policy.

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view co-members" ON business_members;

-- The existing "Users can view their own memberships" policy is sufficient for basic operations.
-- If co-member visibility is needed, it should be done via a security definer function
-- or by fetching through the businesses table join.

-- Add a policy that allows users to view members of businesses they belong to
-- using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_business_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT business_id FROM business_members WHERE user_id = user_uuid;
$$;

-- Create new non-recursive policy for viewing co-members
CREATE POLICY "Users can view co-members via function"
ON business_members FOR SELECT
USING (
  business_id IN (SELECT get_user_business_ids(auth.uid()))
);
