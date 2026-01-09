-- Add tags and content_type columns to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'guide';

-- Add comment for content_type values
COMMENT ON COLUMN public.blog_posts.content_type IS 'Content type: guide, case_study, or news';