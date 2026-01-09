-- Allow authenticated users to insert their own campaign videos
CREATE POLICY "Creators can submit their own videos"
ON public.campaign_videos
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Allow creators to update their own videos (for editing submission text, etc.)
CREATE POLICY "Creators can update their own videos"
ON public.campaign_videos
FOR UPDATE
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);