-- Add policy to allow brand members to remove creators from their campaigns
CREATE POLICY "Brand members can remove creators from their campaigns"
ON public.social_account_campaigns
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    JOIN brand_members bm ON bm.brand_id = c.brand_id
    WHERE c.id = social_account_campaigns.campaign_id
    AND bm.user_id = auth.uid()
  )
);

-- Add policy to allow brand members to remove bounty applications
CREATE POLICY "Brand members can delete bounty applications"
ON public.bounty_applications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bounty_campaigns bc
    JOIN brand_members bm ON bm.brand_id = bc.brand_id
    WHERE bc.id = bounty_applications.bounty_campaign_id
    AND bm.user_id = auth.uid()
  )
);

-- Add policy to allow brand members to delete boost video submissions
CREATE POLICY "Brand members can delete boost video submissions"
ON public.boost_video_submissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bounty_campaigns bc
    JOIN brand_members bm ON bm.brand_id = bc.brand_id
    WHERE bc.id = boost_video_submissions.bounty_campaign_id
    AND bm.user_id = auth.uid()
  )
);

-- Add policy to allow brand members to delete video submissions for their campaigns
CREATE POLICY "Brand members can delete video submissions"
ON public.video_submissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM brand_members bm
    WHERE bm.brand_id = video_submissions.brand_id
    AND bm.user_id = auth.uid()
  )
);