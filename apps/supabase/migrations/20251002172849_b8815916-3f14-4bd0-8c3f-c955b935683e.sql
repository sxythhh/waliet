-- Fix Campaign Submissions RLS Policy
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Brand owners and admins can update submissions" ON public.campaign_submissions;

-- Create proper policy: only submission creator OR admins can update
CREATE POLICY "Only submission creator or admins can update submissions"
ON public.campaign_submissions
FOR UPDATE
USING (
  auth.uid() = creator_id OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = creator_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix Profiles Table Exposure
-- Drop the overly permissive select policy
DROP POLICY IF EXISTS "Users can view public profile data" ON public.profiles;

-- Create restrictive policy: users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create public_profiles view for non-sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  full_name,
  avatar_url,
  bio,
  total_earnings,
  trust_score,
  demographics_score,
  views_score
FROM public.profiles;

-- Allow authenticated users to view public profiles
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Remove Wallet Self-Update Permission
-- Drop the policy that allows users to update their own wallet
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

-- Create policy: only admins can update wallets
CREATE POLICY "Only admins can update wallets"
ON public.wallets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));