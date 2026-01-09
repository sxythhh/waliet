
-- Create blueprints table
CREATE TABLE public.blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT,
  assets JSONB DEFAULT '[]'::jsonb,
  platforms TEXT[] DEFAULT ARRAY[]::text[],
  target_personas JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Brand members can view their brand's blueprints"
ON public.blueprints
FOR SELECT
USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand admins can insert blueprints"
ON public.blueprints
FOR INSERT
WITH CHECK (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand admins can update blueprints"
ON public.blueprints
FOR UPDATE
USING (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand admins can delete blueprints"
ON public.blueprints
FOR DELETE
USING (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Index for faster brand lookups
CREATE INDEX idx_blueprints_brand_id ON public.blueprints(brand_id);

-- Trigger for updated_at
CREATE TRIGGER update_blueprints_updated_at
BEFORE UPDATE ON public.blueprints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
