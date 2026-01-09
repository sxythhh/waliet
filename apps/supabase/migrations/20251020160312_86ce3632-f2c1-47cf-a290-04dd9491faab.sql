-- Add platform column to campaign_videos table
ALTER TABLE campaign_videos 
ADD COLUMN platform TEXT CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'x'));