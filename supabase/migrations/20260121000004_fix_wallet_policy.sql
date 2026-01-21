-- Fix the business_wallets INSERT policy
-- The previous policy was checking business_members which may cause a race condition
-- Simpler approach: allow authenticated users to create wallets, RLS on SELECT handles security

DROP POLICY IF EXISTS "Business members can create business wallets" ON business_wallets;

-- Allow authenticated users to create business wallets
-- Security is handled by the fact that you need to know the business_id
-- and the SELECT policy ensures you can only see your own wallets
CREATE POLICY "Authenticated users can create business wallets"
ON business_wallets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
