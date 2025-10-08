-- Create brand applications table
CREATE TABLE public.brand_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT NOT NULL,
  business_description TEXT NOT NULL,
  website TEXT,
  current_mrr TEXT NOT NULL,
  monthly_budget TEXT NOT NULL,
  timeline_commitment TEXT NOT NULL,
  desired_outcome TEXT NOT NULL,
  has_content_library TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application
CREATE POLICY "Anyone can insert brand applications"
ON public.brand_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can view all applications
CREATE POLICY "Admins can view all brand applications"
ON public.brand_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update applications
CREATE POLICY "Admins can update brand applications"
ON public.brand_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_brand_applications_updated_at
BEFORE UPDATE ON public.brand_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();