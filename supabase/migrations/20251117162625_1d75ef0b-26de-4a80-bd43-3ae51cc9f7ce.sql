-- Add RLS policy to allow admins to delete demographic submissions
CREATE POLICY "Admins can delete demographic submissions"
ON public.demographic_submissions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to manually clean up videos for existing approved/rejected submissions
CREATE OR REPLACE FUNCTION public.cleanup_demographic_videos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
DECLARE
  submission_record RECORD;
  file_path text;
BEGIN
  -- Loop through all approved or rejected submissions that still have screenshot URLs
  FOR submission_record IN 
    SELECT id, screenshot_url, status
    FROM public.demographic_submissions
    WHERE status IN ('approved', 'rejected')
    AND screenshot_url IS NOT NULL
  LOOP
    -- Extract the file path from the URL
    file_path := substring(submission_record.screenshot_url from 'verification-screenshots/(.+)$');
    
    IF file_path IS NOT NULL THEN
      -- Delete the file from storage
      DELETE FROM storage.objects 
      WHERE bucket_id = 'verification-screenshots' 
      AND name = file_path;
      
      -- Clear the URL from the record
      UPDATE public.demographic_submissions
      SET screenshot_url = NULL
      WHERE id = submission_record.id;
      
      RAISE NOTICE 'Deleted video for submission %', submission_record.id;
    END IF;
  END LOOP;
END;
$$;

-- Add trigger to delete video file from storage when submission is deleted
CREATE OR REPLACE FUNCTION public.delete_demographics_video_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
DECLARE
  file_path text;
BEGIN
  -- Only proceed if screenshot_url exists
  IF OLD.screenshot_url IS NOT NULL THEN
    -- Extract the file path from the URL
    file_path := substring(OLD.screenshot_url from 'verification-screenshots/(.+)$');
    
    IF file_path IS NOT NULL THEN
      -- Delete the file from storage
      DELETE FROM storage.objects 
      WHERE bucket_id = 'verification-screenshots' 
      AND name = file_path;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger for deletion
DROP TRIGGER IF EXISTS delete_demographics_video_on_submission_delete ON public.demographic_submissions;
CREATE TRIGGER delete_demographics_video_on_submission_delete
  BEFORE DELETE ON public.demographic_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_demographics_video_on_delete();