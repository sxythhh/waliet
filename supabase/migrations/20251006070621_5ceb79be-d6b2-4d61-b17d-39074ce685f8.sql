-- Add RLS policy to allow brand members to view other brand members' profiles
CREATE POLICY "Brand members can view profiles of other brand members"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.brand_members bm1
    INNER JOIN public.brand_members bm2 ON bm1.brand_id = bm2.brand_id
    WHERE bm1.user_id = auth.uid()
      AND bm2.user_id = profiles.id
  )
);