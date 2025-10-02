-- Add UPDATE policy for campaigns table
-- Allow authenticated users to update campaigns
CREATE POLICY "Authenticated users can update campaigns"
ON campaigns
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);