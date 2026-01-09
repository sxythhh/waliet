-- Create a function to check if user belongs to a brand with active subscription
CREATE OR REPLACE FUNCTION public.is_member_of_active_brand(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.brand_members bm
    INNER JOIN public.brands b ON b.id = bm.brand_id
    WHERE bm.user_id = _user_id
      AND b.subscription_status = 'active'
  )
$$;

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Brand members can view profiles of campaign applicants" ON public.profiles;
DROP POLICY IF EXISTS "Brand members can view profiles of other brand members" ON public.profiles;

-- Create new policy: Brand members with active subscriptions can view all profiles
CREATE POLICY "Active brand members can view all profiles"
ON public.profiles
FOR SELECT
USING (
  -- Users can always view their own profile
  auth.uid() = id
  -- Admins can view all profiles
  OR has_role(auth.uid(), 'admin'::app_role)
  -- Members of brands with active subscriptions can view all profiles
  OR is_member_of_active_brand(auth.uid())
);