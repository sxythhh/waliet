-- Add category column to warmap_events table
ALTER TABLE warmap_events 
ADD COLUMN IF NOT EXISTS category TEXT;