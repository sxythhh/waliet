-- Create brand_course_access table to manage which courses each brand can access
CREATE TABLE IF NOT EXISTS public.brand_course_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  has_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, course_id)
);

-- Enable RLS
ALTER TABLE public.brand_course_access ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view brand course access (needed for training portal)
CREATE POLICY "Anyone can view brand course access"
ON public.brand_course_access
FOR SELECT
USING (true);

-- Only admins can manage brand course access
CREATE POLICY "Admins can manage brand course access"
ON public.brand_course_access
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_brand_course_access_updated_at
BEFORE UPDATE ON public.brand_course_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();