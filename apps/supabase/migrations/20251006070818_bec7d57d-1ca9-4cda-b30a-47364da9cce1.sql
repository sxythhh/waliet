-- Drop the problematic policy
DROP POLICY IF EXISTS "Brand members can view profiles of other brand members" ON public.profiles;

-- Create security definer function to check if users share a brand
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.brand_members bm1
    INNER JOIN public.brand_members bm2 ON bm1.brand_id = bm2.brand_id
    WHERE bm1.user_id = _viewer_id
      AND bm2.user_id = _profile_id
  )
$$;

-- Add policy using the security definer function
CREATE POLICY "Brand members can view profiles of other brand members"
ON public.profiles
FOR SELECT
USING (
  public.can_view_profile(auth.uid(), id)
  OR auth.uid() = id
  OR has_role(auth.uid(), 'admin'::app_role)
);