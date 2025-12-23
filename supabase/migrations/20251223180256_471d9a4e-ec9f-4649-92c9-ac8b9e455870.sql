-- Drop unused tables
DROP TABLE IF EXISTS public.video_analytics;
DROP TABLE IF EXISTS public.shortimize_tracking;

-- Drop related database functions if they exist
DROP FUNCTION IF EXISTS public.match_analytics_to_users(uuid);