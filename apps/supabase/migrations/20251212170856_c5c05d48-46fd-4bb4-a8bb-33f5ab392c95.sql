-- Create bounty bookmarks table
CREATE TABLE public.bounty_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bounty_campaign_id UUID NOT NULL REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bounty_campaign_id)
);

-- Enable RLS
ALTER TABLE public.bounty_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own bounty bookmarks"
ON public.bounty_bookmarks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bounty bookmarks"
ON public.bounty_bookmarks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bounty bookmarks"
ON public.bounty_bookmarks
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_bounty_bookmarks_user_id ON public.bounty_bookmarks(user_id);
CREATE INDEX idx_bounty_bookmarks_bounty_id ON public.bounty_bookmarks(bounty_campaign_id);