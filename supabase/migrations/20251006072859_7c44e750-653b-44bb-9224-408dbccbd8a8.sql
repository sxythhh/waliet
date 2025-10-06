-- Add DELETE policy for brand invitations
CREATE POLICY "Brand admins can delete invitations"
ON public.brand_invitations
FOR DELETE
TO authenticated
USING (
  is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role)
);