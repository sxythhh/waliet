-- Create auto-rejection rules table
CREATE TABLE public.auto_rejection_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'duplicate_video',
    'wrong_platform',
    'blacklisted_hashtag',
    'minimum_views',
    'minimum_duration',
    'maximum_duration',
    'missing_hashtag',
    'missing_mention'
  )),
  rule_value TEXT, -- JSON or simple value depending on rule type
  rejection_message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT rule_campaign_or_boost CHECK (
    (campaign_id IS NOT NULL AND boost_id IS NULL) OR
    (campaign_id IS NULL AND boost_id IS NOT NULL) OR
    (campaign_id IS NULL AND boost_id IS NULL)
  )
);

-- Track auto-rejections for analytics
CREATE TABLE public.auto_rejection_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.auto_rejection_rules(id) ON DELETE CASCADE,
  submission_id UUID, -- Reference to campaign_submissions or video_submissions
  submission_type TEXT NOT NULL CHECK (submission_type IN ('campaign', 'boost')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rejection_reason TEXT NOT NULL,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_rejection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_rejection_log ENABLE ROW LEVEL SECURITY;

-- Rules policies
CREATE POLICY "Brand members can manage rejection rules"
ON public.auto_rejection_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = auto_rejection_rules.brand_id
    AND brand_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = auto_rejection_rules.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Log policies
CREATE POLICY "Brand members can view rejection logs"
ON public.auto_rejection_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.auto_rejection_rules arr
    JOIN public.brand_members bm ON bm.brand_id = arr.brand_id
    WHERE arr.id = auto_rejection_log.rule_id
    AND bm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own rejection logs"
ON public.auto_rejection_log
FOR SELECT
USING (auth.uid() = user_id);

-- System can manage logs
CREATE POLICY "System can manage rejection logs"
ON public.auto_rejection_log
FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes
CREATE INDEX auto_rejection_rules_brand_idx ON public.auto_rejection_rules(brand_id);
CREATE INDEX auto_rejection_rules_campaign_idx ON public.auto_rejection_rules(campaign_id);
CREATE INDEX auto_rejection_rules_boost_idx ON public.auto_rejection_rules(boost_id);
CREATE INDEX auto_rejection_rules_type_idx ON public.auto_rejection_rules(rule_type);
CREATE INDEX auto_rejection_log_rule_idx ON public.auto_rejection_log(rule_id);
CREATE INDEX auto_rejection_log_user_idx ON public.auto_rejection_log(user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_auto_rejection_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auto_rejection_rules_timestamp
BEFORE UPDATE ON public.auto_rejection_rules
FOR EACH ROW EXECUTE FUNCTION public.update_auto_rejection_rules_updated_at();
