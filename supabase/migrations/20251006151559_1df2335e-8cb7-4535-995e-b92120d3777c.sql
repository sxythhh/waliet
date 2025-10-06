-- Allow unauthenticated users to view invitations by ID (for accepting invites)
CREATE POLICY "Anyone can view invitations by ID for acceptance"
ON public.brand_invitations
FOR SELECT
TO public
USING (true);