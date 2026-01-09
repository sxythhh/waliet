-- Add Shortimize collection name to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS shortimize_collection_name text;

-- Add Shortimize collection name to bounty_campaigns table  
ALTER TABLE public.bounty_campaigns
ADD COLUMN IF NOT EXISTS shortimize_collection_name text;

-- Add shortimize_video_id to campaign_videos to track the video ID returned by Shortimize
ALTER TABLE public.campaign_videos
ADD COLUMN IF NOT EXISTS shortimize_video_id text;

-- Add shortimize_video_id to boost_video_submissions
ALTER TABLE public.boost_video_submissions
ADD COLUMN IF NOT EXISTS shortimize_video_id text;

-- Add is_flagged column to boost_video_submissions if it doesn't exist (referenced in VideoSubmissionsTab)
ALTER TABLE public.boost_video_submissions
ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;