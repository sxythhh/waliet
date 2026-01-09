-- Add audience quality score to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS audience_quality_score integer DEFAULT NULL;

-- Create testimonials table for brands to leave on creator profiles
CREATE TABLE public.creator_testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  content text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(creator_id, brand_id) -- One testimonial per brand per creator
);

-- Enable RLS
ALTER TABLE public.creator_testimonials ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view testimonials (public profiles)
CREATE POLICY "Testimonials are viewable by everyone" 
ON public.creator_testimonials 
FOR SELECT 
USING (true);

-- Policy: Brand members can create testimonials for their brand
CREATE POLICY "Brand members can create testimonials" 
ON public.creator_testimonials 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members 
    WHERE brand_members.brand_id = creator_testimonials.brand_id 
    AND brand_members.user_id = auth.uid()
  )
);

-- Policy: Brand members can update their brand's testimonials
CREATE POLICY "Brand members can update their brand testimonials" 
ON public.creator_testimonials 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members 
    WHERE brand_members.brand_id = creator_testimonials.brand_id 
    AND brand_members.user_id = auth.uid()
  )
);

-- Policy: Brand members can delete their brand's testimonials
CREATE POLICY "Brand members can delete their brand testimonials" 
ON public.creator_testimonials 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members 
    WHERE brand_members.brand_id = creator_testimonials.brand_id 
    AND brand_members.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_creator_testimonials_updated_at
BEFORE UPDATE ON public.creator_testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_creator_testimonials_creator_id ON public.creator_testimonials(creator_id);
CREATE INDEX idx_creator_testimonials_brand_id ON public.creator_testimonials(brand_id);