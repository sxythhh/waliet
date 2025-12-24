-- Allow brand members to view payout requests for their campaigns/boosts
CREATE POLICY "Brand members can view payout requests for their campaigns"
ON public.submission_payout_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.submission_payout_items spi
    JOIN public.video_submissions vs ON vs.id = spi.submission_id
    JOIN public.brand_members bm ON bm.brand_id = vs.brand_id
    WHERE spi.payout_request_id = submission_payout_requests.id
    AND bm.user_id = auth.uid()
  )
);

-- Allow brand admins to update payout requests for their campaigns/boosts
CREATE POLICY "Brand admins can update payout requests for their campaigns"
ON public.submission_payout_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.submission_payout_items spi
    JOIN public.video_submissions vs ON vs.id = spi.submission_id
    JOIN public.brand_members bm ON bm.brand_id = vs.brand_id
    WHERE spi.payout_request_id = submission_payout_requests.id
    AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin')
  )
);