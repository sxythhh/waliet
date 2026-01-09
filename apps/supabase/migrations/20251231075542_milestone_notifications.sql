-- Create milestone configurations table
CREATE TABLE public.milestone_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('views', 'earnings', 'submissions')),
  threshold NUMERIC NOT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT milestone_campaign_or_boost CHECK (
    (campaign_id IS NOT NULL AND boost_id IS NULL) OR
    (campaign_id IS NULL AND boost_id IS NOT NULL) OR
    (campaign_id IS NULL AND boost_id IS NULL)
  )
);

-- Track achieved milestones per user
CREATE TABLE public.milestone_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_config_id UUID NOT NULL REFERENCES public.milestone_configs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  achieved_value NUMERIC NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(milestone_config_id, user_id, campaign_id),
  UNIQUE(milestone_config_id, user_id, boost_id)
);

-- Enable RLS
ALTER TABLE public.milestone_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_achievements ENABLE ROW LEVEL SECURITY;

-- Milestone configs policies
CREATE POLICY "Brand members can manage milestone configs"
ON public.milestone_configs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = milestone_configs.brand_id
    AND brand_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = milestone_configs.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements"
ON public.milestone_achievements
FOR SELECT
USING (auth.uid() = user_id);

-- Brand members can view all achievements in their brand
CREATE POLICY "Brand members can view achievements"
ON public.milestone_achievements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.milestone_configs mc
    JOIN public.brand_members bm ON bm.brand_id = mc.brand_id
    WHERE mc.id = milestone_achievements.milestone_config_id
    AND bm.user_id = auth.uid()
  )
);

-- System can insert achievements (via trigger/function)
CREATE POLICY "System can manage achievements"
ON public.milestone_achievements
FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes
CREATE INDEX milestone_configs_brand_idx ON public.milestone_configs(brand_id);
CREATE INDEX milestone_configs_campaign_idx ON public.milestone_configs(campaign_id);
CREATE INDEX milestone_configs_boost_idx ON public.milestone_configs(boost_id);
CREATE INDEX milestone_achievements_user_idx ON public.milestone_achievements(user_id);
CREATE INDEX milestone_achievements_config_idx ON public.milestone_achievements(milestone_config_id);

-- Default milestone templates for new brands
CREATE OR REPLACE FUNCTION public.create_default_milestones()
RETURNS TRIGGER AS $$
BEGIN
  -- View milestones
  INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template) VALUES
    (NEW.id, 'views', 10000, 'Congratulations! You''ve reached 10K views! Keep up the great work.'),
    (NEW.id, 'views', 50000, 'Amazing! You''ve hit 50K views! You''re crushing it.'),
    (NEW.id, 'views', 100000, 'Incredible! 100K views milestone achieved! You''re a star.'),
    (NEW.id, 'views', 500000, 'Phenomenal! 500K views! You''re making a huge impact.'),
    (NEW.id, 'views', 1000000, 'LEGENDARY! 1 MILLION VIEWS! You''ve made history!');

  -- Earnings milestones
  INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template) VALUES
    (NEW.id, 'earnings', 100, 'You''ve earned your first $100! Great start.'),
    (NEW.id, 'earnings', 500, 'Nice work! You''ve earned $500 with us.'),
    (NEW.id, 'earnings', 1000, 'You''ve hit $1,000 in earnings! Amazing.'),
    (NEW.id, 'earnings', 5000, 'Wow! $5,000 earned. You''re a top performer!'),
    (NEW.id, 'earnings', 10000, 'Incredible! $10,000 earned! You''re elite.');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger can be added to brands table if desired
-- CREATE TRIGGER create_brand_milestones
-- AFTER INSERT ON public.brands
-- FOR EACH ROW EXECUTE FUNCTION public.create_default_milestones();
