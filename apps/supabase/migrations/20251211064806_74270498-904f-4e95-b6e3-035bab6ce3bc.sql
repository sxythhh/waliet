-- Add INSERT policy for campaign_video_metrics for admins
CREATE POLICY "Admins can insert campaign metrics"
ON public.campaign_video_metrics
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));