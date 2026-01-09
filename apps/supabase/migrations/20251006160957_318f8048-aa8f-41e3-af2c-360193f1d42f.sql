-- Add assigned_to and link fields to warmap_events
ALTER TABLE public.warmap_events
ADD COLUMN assigned_to TEXT[] DEFAULT '{}',
ADD COLUMN link TEXT;