-- Make courses global (not brand-specific)
ALTER TABLE public.courses ALTER COLUMN brand_id DROP NOT NULL;

-- Add index for better performance when querying all courses
CREATE INDEX IF NOT EXISTS idx_courses_order ON public.courses(order_index);