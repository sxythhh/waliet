-- Add missing INSERT policies for business creation

-- Allow authenticated users to create businesses
CREATE POLICY "Authenticated users can create businesses"
ON businesses FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to add themselves as business members
CREATE POLICY "Users can add themselves as business members"
ON business_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow business members to create wallets for their businesses
CREATE POLICY "Business members can create business wallets"
ON business_wallets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_members
    WHERE business_members.business_id = business_wallets.business_id
    AND business_members.user_id = auth.uid()
  )
);
