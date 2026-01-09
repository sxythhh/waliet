-- Create brand_broadcasts table for brand-level announcements
CREATE TABLE public.brand_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'campaigns', 'boosts'))
);

-- Junction table for broadcast-campaign targeting
CREATE TABLE public.brand_broadcast_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID NOT NULL REFERENCES public.brand_broadcasts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT broadcast_target_check CHECK (
    (campaign_id IS NOT NULL AND boost_id IS NULL) OR
    (campaign_id IS NULL AND boost_id IS NOT NULL)
  )
);

-- Track read status per creator
CREATE TABLE public.brand_broadcast_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID NOT NULL REFERENCES public.brand_broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(broadcast_id, user_id)
);

-- Enable RLS
ALTER TABLE public.brand_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_broadcast_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_broadcast_reads ENABLE ROW LEVEL SECURITY;

-- Brand members can manage broadcasts
CREATE POLICY "Brand members can view broadcasts"
ON public.brand_broadcasts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = brand_broadcasts.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

CREATE POLICY "Brand members can create broadcasts"
ON public.brand_broadcasts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = brand_broadcasts.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

CREATE POLICY "Brand members can update broadcasts"
ON public.brand_broadcasts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = brand_broadcasts.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

CREATE POLICY "Brand members can delete broadcasts"
ON public.brand_broadcasts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = brand_broadcasts.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Creators can view sent broadcasts for their campaigns/boosts
CREATE POLICY "Creators can view sent broadcasts"
ON public.brand_broadcasts
FOR SELECT
USING (
  status = 'sent' AND (
    -- Target is all creators for this brand
    (target_type = 'all' AND EXISTS (
      SELECT 1 FROM public.campaign_submissions cs
      JOIN public.campaigns c ON c.id = cs.campaign_id
      WHERE c.brand_id = brand_broadcasts.brand_id
      AND cs.creator_id = auth.uid()
      AND cs.status = 'accepted'
    )) OR
    -- Target is specific campaigns
    (target_type = 'campaigns' AND EXISTS (
      SELECT 1 FROM public.brand_broadcast_targets bbt
      JOIN public.campaign_submissions cs ON cs.campaign_id = bbt.campaign_id
      WHERE bbt.broadcast_id = brand_broadcasts.id
      AND cs.creator_id = auth.uid()
      AND cs.status = 'accepted'
    )) OR
    -- Target is specific boosts
    (target_type = 'boosts' AND EXISTS (
      SELECT 1 FROM public.brand_broadcast_targets bbt
      JOIN public.bounty_applications ba ON ba.bounty_campaign_id = bbt.boost_id
      WHERE bbt.broadcast_id = brand_broadcasts.id
      AND ba.user_id = auth.uid()
      AND ba.status = 'accepted'
    ))
  )
);

-- Broadcast targets policies
CREATE POLICY "Brand members can manage targets"
ON public.brand_broadcast_targets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brand_broadcasts bb
    JOIN public.brand_members bm ON bm.brand_id = bb.brand_id
    WHERE bb.id = brand_broadcast_targets.broadcast_id
    AND bm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_broadcasts bb
    JOIN public.brand_members bm ON bm.brand_id = bb.brand_id
    WHERE bb.id = brand_broadcast_targets.broadcast_id
    AND bm.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can view targets for their broadcasts"
ON public.brand_broadcast_targets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_broadcasts bb
    WHERE bb.id = brand_broadcast_targets.broadcast_id
    AND bb.status = 'sent'
  )
);

-- Read tracking policies
CREATE POLICY "Users can mark broadcasts as read"
ON public.brand_broadcast_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reads"
ON public.brand_broadcast_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Brand members can view read stats"
ON public.brand_broadcast_reads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_broadcasts bb
    JOIN public.brand_members bm ON bm.brand_id = bb.brand_id
    WHERE bb.id = brand_broadcast_reads.broadcast_id
    AND bm.user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX brand_broadcasts_brand_id_idx ON public.brand_broadcasts(brand_id);
CREATE INDEX brand_broadcasts_status_idx ON public.brand_broadcasts(status);
CREATE INDEX brand_broadcast_targets_broadcast_idx ON public.brand_broadcast_targets(broadcast_id);
CREATE INDEX brand_broadcast_reads_broadcast_idx ON public.brand_broadcast_reads(broadcast_id);
CREATE INDEX brand_broadcast_reads_user_idx ON public.brand_broadcast_reads(user_id);
