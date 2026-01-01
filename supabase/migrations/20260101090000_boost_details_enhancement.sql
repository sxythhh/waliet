-- Migration: boost_details_enhancement
-- Description: Add experience level, content type, categories, and skills to boosts

-- 1. Add experience_level column (beginner, intermediate, advanced, any)
ALTER TABLE bounty_campaigns ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'any';

-- 2. Add content_type column (short_form, long_form, both)
ALTER TABLE bounty_campaigns ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'both';

-- 3. Add categories column (array of niches)
ALTER TABLE bounty_campaigns ADD COLUMN IF NOT EXISTS categories TEXT[];

-- 4. Add skills column (array of required skills)
ALTER TABLE bounty_campaigns ADD COLUMN IF NOT EXISTS skills TEXT[];

-- 5. Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_bounty_campaigns_categories ON bounty_campaigns USING GIN(categories);

-- 6. Create index for skills filtering
CREATE INDEX IF NOT EXISTS idx_bounty_campaigns_skills ON bounty_campaigns USING GIN(skills);
