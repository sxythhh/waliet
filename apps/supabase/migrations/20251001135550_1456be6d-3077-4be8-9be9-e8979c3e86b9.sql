-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view brands
CREATE POLICY "Anyone can view brands"
ON public.brands
FOR SELECT
USING (true);

-- Only authenticated users can create brands (you can adjust this later)
CREATE POLICY "Authenticated users can create brands"
ON public.brands
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only authenticated users can update brands (you can adjust this later)
CREATE POLICY "Authenticated users can update brands"
ON public.brands
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Add brand_id to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN brand_id UUID REFERENCES public.brands(id);

-- Create index for better query performance
CREATE INDEX idx_campaigns_brand_id ON public.campaigns(brand_id);

-- Add trigger for updated_at
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample brands
INSERT INTO public.brands (name, slug, description) VALUES
('Parallel Labs', 'parallel-labs', 'Innovation in technology'),
('TechCorp', 'techcorp', 'Leading tech solutions'),
('DesignStudio', 'designstudio', 'Creative design agency');