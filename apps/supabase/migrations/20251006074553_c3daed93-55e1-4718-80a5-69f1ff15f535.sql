-- Create function to send application approval email
CREATE OR REPLACE FUNCTION public.notify_application_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  supabase_url text;
BEGIN
  -- Only send email when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get Supabase URL from environment
    supabase_url := current_setting('app.settings.supabase_url', true);
    
    -- Call the edge function to send approval email
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-application-approval',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'submissionId', NEW.id::text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on campaign_submissions
DROP TRIGGER IF EXISTS on_application_approved ON public.campaign_submissions;
CREATE TRIGGER on_application_approved
  AFTER UPDATE ON public.campaign_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_approval();