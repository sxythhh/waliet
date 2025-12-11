-- Change hashtag column to support multiple hashtags (array)
ALTER TABLE public.campaigns 
DROP COLUMN IF EXISTS hashtag;

ALTER TABLE public.campaigns 
ADD COLUMN hashtags text[] DEFAULT '{}'::text[];