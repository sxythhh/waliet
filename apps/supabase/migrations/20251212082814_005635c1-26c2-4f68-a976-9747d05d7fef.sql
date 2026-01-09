-- Create campaign_bookmarks table
CREATE TABLE public.campaign_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, campaign_id)
);

-- Enable RLS
ALTER TABLE public.campaign_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookmarks
CREATE POLICY "Users can view own bookmarks"
ON public.campaign_bookmarks
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own bookmarks
CREATE POLICY "Users can create own bookmarks"
ON public.campaign_bookmarks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
ON public.campaign_bookmarks
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_campaign_bookmarks_user_id ON public.campaign_bookmarks(user_id);
CREATE INDEX idx_campaign_bookmarks_campaign_id ON public.campaign_bookmarks(campaign_id);