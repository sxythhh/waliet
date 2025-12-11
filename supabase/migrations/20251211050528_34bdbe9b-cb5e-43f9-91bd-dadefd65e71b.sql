-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can add themselves as first brand member" ON public.brand_members;

-- Create a security definer function to check if brand has no members
CREATE OR REPLACE FUNCTION public.brand_has_no_members(_brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.brand_members
    WHERE brand_id = _brand_id
  )
$$;

-- Create the fixed policy using the function
CREATE POLICY "Users can add themselves as first brand member"
ON public.brand_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'owner'
  AND public.brand_has_no_members(brand_id)
);