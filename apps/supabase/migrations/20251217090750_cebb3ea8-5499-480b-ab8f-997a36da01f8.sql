-- Allow users to insert their own brand role during onboarding
CREATE POLICY "Users can insert own brand role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'brand'::app_role
);