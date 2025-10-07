-- Create content styles table for kanban board
CREATE TABLE IF NOT EXISTS public.content_styles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  phase text NOT NULL DEFAULT 'testing',
  order_index integer NOT NULL DEFAULT 0,
  color text DEFAULT '#8B5CF6',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_styles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Brand members can view their brand's content styles"
  ON public.content_styles
  FOR SELECT
  USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand admins can insert content styles"
  ON public.content_styles
  FOR INSERT
  WITH CHECK (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand admins can update content styles"
  ON public.content_styles
  FOR UPDATE
  USING (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand admins can delete content styles"
  ON public.content_styles
  FOR DELETE
  USING (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_content_styles_brand_id ON public.content_styles(brand_id);
CREATE INDEX idx_content_styles_phase ON public.content_styles(phase);

-- Create trigger for updated_at
CREATE TRIGGER update_content_styles_updated_at
  BEFORE UPDATE ON public.content_styles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();