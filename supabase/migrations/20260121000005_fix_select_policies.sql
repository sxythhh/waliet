-- Fix SELECT policies for business_members join to businesses

-- Allow business members to see their businesses (even if not "active")
-- This is needed for the sidebar query that joins business_members to businesses
DROP POLICY IF EXISTS "Anyone can view active businesses" ON businesses;

-- Policy 1: Anyone can view active businesses (public discovery)
CREATE POLICY "Anyone can view active businesses" ON businesses FOR SELECT
  USING (is_active = true);

-- Policy 2: Business members can always view their own businesses
CREATE POLICY "Business members can view their businesses" ON businesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_members
      WHERE business_members.business_id = businesses.id
      AND business_members.user_id = auth.uid()
    )
  );

-- Simplify the business_members SELECT policy to avoid recursive issues
DROP POLICY IF EXISTS "Business members can view their memberships" ON business_members;

-- Users can see their own memberships
CREATE POLICY "Users can view their own memberships" ON business_members FOR SELECT
  USING (user_id = auth.uid());

-- Users can see other members in businesses they belong to
CREATE POLICY "Users can view co-members" ON business_members FOR SELECT
  USING (
    business_id IN (
      SELECT bm.business_id FROM business_members bm WHERE bm.user_id = auth.uid()
    )
  );
