-- Create blueprint_templates table for admin-managed templates
CREATE TABLE public.blueprint_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  content text,
  platforms text[] DEFAULT '{}',
  hooks jsonb DEFAULT '[]',
  talking_points jsonb DEFAULT '[]',
  dos_and_donts jsonb DEFAULT '{"dos": [], "donts": []}',
  call_to_action text,
  hashtags text[] DEFAULT '{}',
  brand_voice text,
  target_personas jsonb DEFAULT '[]',
  assets jsonb DEFAULT '[]',
  example_videos jsonb DEFAULT '[]',
  content_guidelines text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blueprint_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view active templates
CREATE POLICY "Anyone can view active templates"
ON public.blueprint_templates
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage templates
CREATE POLICY "Admins can manage templates"
ON public.blueprint_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_blueprint_templates_updated_at
  BEFORE UPDATE ON public.blueprint_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();