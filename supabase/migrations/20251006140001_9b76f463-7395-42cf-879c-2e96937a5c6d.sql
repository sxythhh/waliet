-- Add policy to allow users to accept brand invitations
CREATE POLICY "Users can accept their own brand invitations"
ON public.brand_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.brand_invitations
    WHERE brand_invitations.brand_id = brand_members.brand_id
      AND brand_invitations.email = get_user_email(auth.uid())
      AND brand_invitations.status = 'pending'
      AND brand_invitations.expires_at > now()
  )
  AND brand_members.user_id = auth.uid()
);