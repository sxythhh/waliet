-- Drop problematic RLS policy
DROP POLICY IF EXISTS "Users can view invitations for their brands" ON brand_invitations;

-- Create security definer function to get user email
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id;
$$;

-- Recreate RLS policy using security definer function
CREATE POLICY "Users can view invitations for their brands"
ON brand_invitations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_brand_member(auth.uid(), brand_id)
  OR email = public.get_user_email(auth.uid())
);