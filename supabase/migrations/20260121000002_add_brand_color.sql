-- Add brand_color column to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#8B5CF6';

-- Update types regeneration hint: run `supabase gen types typescript --local > src/integrations/supabase/types.ts`
