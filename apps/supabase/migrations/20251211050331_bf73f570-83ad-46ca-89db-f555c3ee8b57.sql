-- Allow users to add themselves as owner when no members exist for a brand yet
CREATE POLICY "Users can add themselves as first brand member"
ON public.brand_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM public.brand_members WHERE brand_id = brand_members.brand_id
  )
);