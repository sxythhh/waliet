-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS on_demographic_submission_created ON demographic_submissions;
DROP FUNCTION IF EXISTS notify_demographic_submission();
