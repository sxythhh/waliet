-- Create function to notify Discord on demographic submission
CREATE OR REPLACE FUNCTION notify_demographic_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  social_account RECORD;
  webhook_url text;
BEGIN
  -- Get user profile
  SELECT username, email INTO user_profile
  FROM profiles
  WHERE id = (SELECT user_id FROM social_accounts WHERE id = NEW.social_account_id);
  
  -- Get social account details
  SELECT platform, username INTO social_account
  FROM social_accounts
  WHERE id = NEW.social_account_id;
  
  -- Call the edge function
  SELECT INTO webhook_url
    net.http_post(
      url := 'https://upiypxzjaagithghxayv.supabase.co/functions/v1/notify-demographic-submission',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'username', user_profile.username,
        'email', user_profile.email,
        'platform', social_account.platform,
        'social_account_username', social_account.username,
        'video_url', NEW.screenshot_url,
        'submitted_at', NEW.submitted_at
      )
    );
  
  RETURN NEW;
END;
$$;

-- Create trigger for demographic submissions
DROP TRIGGER IF EXISTS on_demographic_submission_created ON demographic_submissions;
CREATE TRIGGER on_demographic_submission_created
  AFTER INSERT ON demographic_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_demographic_submission();
