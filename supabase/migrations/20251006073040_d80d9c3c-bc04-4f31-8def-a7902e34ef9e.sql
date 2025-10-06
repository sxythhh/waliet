-- Fix the RLS policy that's causing the permission denied error
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can accept their own invitations" ON public.brand_invitations;

-- Create a security definer function to get user email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can accept their own invitations"
ON public.brand_invitations
FOR UPDATE
TO authenticated
USING (email = get_current_user_email());