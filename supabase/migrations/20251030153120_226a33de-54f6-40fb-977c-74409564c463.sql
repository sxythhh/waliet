-- Create bounty_campaigns table
CREATE TABLE public.bounty_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  monthly_retainer NUMERIC NOT NULL CHECK (monthly_retainer >= 0),
  videos_per_month INTEGER NOT NULL CHECK (videos_per_month > 0),
  content_style_requirements TEXT NOT NULL,
  max_accepted_creators INTEGER NOT NULL CHECK (max_accepted_creators > 0),
  accepted_creators_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_creators_count >= 0 AND accepted_creators_count <= max_accepted_creators),
  start_date DATE,
  end_date DATE,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Create bounty_applications table
CREATE TABLE public.bounty_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID NOT NULL REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  application_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bounty_campaign_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_bounty_campaigns_brand_id ON public.bounty_campaigns(brand_id);
CREATE INDEX idx_bounty_campaigns_status ON public.bounty_campaigns(status);
CREATE INDEX idx_bounty_applications_bounty_id ON public.bounty_applications(bounty_campaign_id);
CREATE INDEX idx_bounty_applications_user_id ON public.bounty_applications(user_id);
CREATE INDEX idx_bounty_applications_status ON public.bounty_applications(status);

-- Add updated_at triggers
CREATE TRIGGER update_bounty_campaigns_updated_at
  BEFORE UPDATE ON public.bounty_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bounty_applications_updated_at
  BEFORE UPDATE ON public.bounty_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.bounty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounty_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bounty_campaigns
CREATE POLICY "Anyone can view active bounty campaigns"
  ON public.bounty_campaigns
  FOR SELECT
  USING (status IN ('active', 'ended'));

CREATE POLICY "Brand admins can manage their bounty campaigns"
  ON public.bounty_campaigns
  FOR ALL
  USING (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can create bounty campaigns"
  ON public.bounty_campaigns
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for bounty_applications
CREATE POLICY "Users can view their own applications"
  ON public.bounty_applications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Brand admins can view applications to their bounties"
  ON public.bounty_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bounty_campaigns bc
      WHERE bc.id = bounty_applications.bounty_campaign_id
      AND (is_brand_admin(auth.uid(), bc.brand_id) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Users can create applications"
  ON public.bounty_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending applications"
  ON public.bounty_applications
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'withdrawn'));

CREATE POLICY "Brand admins can update applications to their bounties"
  ON public.bounty_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bounty_campaigns bc
      WHERE bc.id = bounty_applications.bounty_campaign_id
      AND (is_brand_admin(auth.uid(), bc.brand_id) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Function to update accepted_creators_count when application is accepted/rejected
CREATE OR REPLACE FUNCTION public.update_bounty_accepted_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When accepting an application
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE public.bounty_campaigns
    SET accepted_creators_count = accepted_creators_count + 1
    WHERE id = NEW.bounty_campaign_id;
  END IF;
  
  -- When rejecting a previously accepted application
  IF NEW.status != 'accepted' AND OLD.status = 'accepted' THEN
    UPDATE public.bounty_campaigns
    SET accepted_creators_count = GREATEST(0, accepted_creators_count - 1)
    WHERE id = NEW.bounty_campaign_id;
  END IF;
  
  -- Set reviewed_at and reviewed_by when status changes from pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    NEW.reviewed_at = now();
    NEW.reviewed_by = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_bounty_accepted_count
  BEFORE UPDATE ON public.bounty_applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.update_bounty_accepted_count();