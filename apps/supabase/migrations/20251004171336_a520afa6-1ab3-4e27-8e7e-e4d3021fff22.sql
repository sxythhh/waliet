-- Function to delete demographics video after review
CREATE OR REPLACE FUNCTION public.delete_demographics_video()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  file_path text;
BEGIN
  -- Only proceed if status changed to approved or rejected
  IF (NEW.status IN ('approved', 'rejected')) AND (OLD.status = 'pending') AND (NEW.screenshot_url IS NOT NULL) THEN
    -- Extract the file path from the URL
    -- URL format: https://.../storage/v1/object/public/verification-screenshots/[file_path]
    file_path := substring(NEW.screenshot_url from 'verification-screenshots/(.+)$');
    
    IF file_path IS NOT NULL THEN
      -- Delete the file from storage
      DELETE FROM storage.objects 
      WHERE bucket_id = 'verification-screenshots' 
      AND name = file_path;
      
      -- Clear the URL from the record
      NEW.screenshot_url := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to delete video after approval/rejection
DROP TRIGGER IF EXISTS delete_demographics_video_trigger ON public.demographic_submissions;
CREATE TRIGGER delete_demographics_video_trigger
  BEFORE UPDATE ON public.demographic_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_demographics_video();