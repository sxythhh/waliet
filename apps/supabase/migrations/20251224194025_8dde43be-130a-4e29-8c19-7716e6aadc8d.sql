-- Create campaign_links table for storing link configurations
CREATE TABLE public.campaign_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  bounty_campaign_id UUID REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  short_code TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  dub_link_id TEXT,
  dub_short_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  conversion_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create link_clicks table for tracking individual click events
CREATE TABLE public.link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.campaign_links(id) ON DELETE CASCADE,
  ip_hash TEXT,
  country TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create link_conversions table for tracking conversions/sales
CREATE TABLE public.link_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.campaign_links(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL DEFAULT 'sale',
  value NUMERIC(10,2) DEFAULT 0,
  order_id TEXT,
  metadata JSONB,
  converted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_campaign_links_brand_id ON public.campaign_links(brand_id);
CREATE INDEX idx_campaign_links_campaign_id ON public.campaign_links(campaign_id);
CREATE INDEX idx_campaign_links_bounty_campaign_id ON public.campaign_links(bounty_campaign_id);
CREATE INDEX idx_campaign_links_assigned_to ON public.campaign_links(assigned_to);
CREATE INDEX idx_campaign_links_short_code ON public.campaign_links(short_code);
CREATE INDEX idx_link_clicks_link_id ON public.link_clicks(link_id);
CREATE INDEX idx_link_clicks_clicked_at ON public.link_clicks(clicked_at);
CREATE INDEX idx_link_conversions_link_id ON public.link_conversions(link_id);

-- Enable RLS
ALTER TABLE public.campaign_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_conversions ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaign_links
CREATE POLICY "Brand members can view their brand's links"
ON public.campaign_links FOR SELECT
USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand admins can create links"
ON public.campaign_links FOR INSERT
WITH CHECK (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand admins can update their brand's links"
ON public.campaign_links FOR UPDATE
USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand admins can delete their brand's links"
ON public.campaign_links FOR DELETE
USING (public.is_brand_admin(auth.uid(), brand_id));

-- Creators can view links assigned to them
CREATE POLICY "Creators can view their assigned links"
ON public.campaign_links FOR SELECT
USING (assigned_to = auth.uid());

-- RLS policies for link_clicks (brand members can view, service role inserts)
CREATE POLICY "Brand members can view clicks for their links"
ON public.link_clicks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_links cl
    WHERE cl.id = link_id
    AND public.is_brand_member(auth.uid(), cl.brand_id)
  )
);

-- RLS policies for link_conversions
CREATE POLICY "Brand members can view conversions for their links"
ON public.link_conversions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_links cl
    WHERE cl.id = link_id
    AND public.is_brand_member(auth.uid(), cl.brand_id)
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_campaign_links_updated_at
BEFORE UPDATE ON public.campaign_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique short code
CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.campaign_links WHERE short_code = result) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$;