-- Add assets column to course_modules table
ALTER TABLE course_modules 
ADD COLUMN assets JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN course_modules.assets IS 'Array of asset objects with title and url properties';