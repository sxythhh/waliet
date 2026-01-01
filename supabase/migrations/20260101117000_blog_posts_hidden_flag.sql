-- Add hidden_from_listing flag to blog_posts for SEO-only articles
-- These articles will be accessible via direct URL but won't appear on the resources page

ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS hidden_from_listing BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_hidden_from_listing
ON blog_posts(hidden_from_listing)
WHERE hidden_from_listing = false;

-- Add comment for documentation
COMMENT ON COLUMN blog_posts.hidden_from_listing IS 'When true, article is accessible via direct URL but hidden from resources listing. Useful for SEO-only pages.';
