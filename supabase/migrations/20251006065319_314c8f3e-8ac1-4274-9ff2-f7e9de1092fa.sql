-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view members of their brands" ON public.brand_members;
DROP POLICY IF EXISTS "Brand admins and owners can insert members" ON public.brand_members;
DROP POLICY IF EXISTS "Brand admins and owners can update members" ON public.brand_members;
DROP POLICY IF EXISTS "Brand admins and owners can delete members" ON public.brand_members;

DROP POLICY IF EXISTS "Users can view invitations for their brands" ON public.brand_invitations;
DROP POLICY IF EXISTS "Brand admins and owners can create invitations" ON public.brand_invitations;
DROP POLICY IF EXISTS "Brand admins and owners can update invitations" ON public.brand_invitations;

-- Create security definer function to check brand membership
CREATE OR REPLACE FUNCTION public.is_brand_admin(_user_id uuid, _brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.brand_members
    WHERE user_id = _user_id
      AND brand_id = _brand_id
      AND role IN ('owner', 'admin')
  )
$$;

-- Create security definer function to check if user is member of any brand
CREATE OR REPLACE FUNCTION public.is_brand_member(_user_id uuid, _brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.brand_members
    WHERE user_id = _user_id
      AND brand_id = _brand_id
  )
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view members of their brands"
ON public.brand_members
FOR SELECT
USING (
  public.is_brand_member(auth.uid(), brand_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand admins can insert members"
ON public.brand_members
FOR INSERT
WITH CHECK (
  public.is_brand_admin(auth.uid(), brand_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand admins can update members"
ON public.brand_members
FOR UPDATE
USING (
  public.is_brand_admin(auth.uid(), brand_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand admins can delete members"
ON public.brand_members
FOR DELETE
USING (
  public.is_brand_admin(auth.uid(), brand_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Recreate invitation policies
CREATE POLICY "Users can view invitations for their brands"
ON public.brand_invitations
FOR SELECT
USING (
  public.is_brand_member(auth.uid(), brand_id)
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand admins can create invitations"
ON public.brand_invitations
FOR INSERT
WITH CHECK (
  public.is_brand_admin(auth.uid(), brand_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand admins can update invitations"
ON public.brand_invitations
FOR UPDATE
USING (
  public.is_brand_admin(auth.uid(), brand_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);