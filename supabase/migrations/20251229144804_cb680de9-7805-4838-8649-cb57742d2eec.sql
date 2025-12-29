-- Allow anyone to view approved campaign submissions for public profiles
-- This is needed so that the public profile page can show a user's campaign history
CREATE POLICY "Anyone can view approved submissions for public profiles"
ON campaign_submissions
FOR SELECT
USING (status = 'approved');