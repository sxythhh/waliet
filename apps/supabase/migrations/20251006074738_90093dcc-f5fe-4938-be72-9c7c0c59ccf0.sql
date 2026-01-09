-- Drop the trigger and function that's causing the update to fail
DROP TRIGGER IF EXISTS on_application_approved ON public.campaign_submissions;
DROP FUNCTION IF EXISTS public.notify_application_approval();