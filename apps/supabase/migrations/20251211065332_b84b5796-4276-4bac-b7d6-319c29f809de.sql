-- Add DELETE policy for campaign_video_metrics for admins
CREATE POLICY "Admins can delete campaign metrics"
ON public.campaign_video_metrics
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));