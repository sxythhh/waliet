-- Add DELETE policy for campaign_submissions to allow users to delete their own submissions
CREATE POLICY "Users can delete own submissions"
ON campaign_submissions
FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);