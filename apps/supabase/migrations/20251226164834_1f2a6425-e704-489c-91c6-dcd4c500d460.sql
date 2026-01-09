-- Create a function to get cron jobs from pg_cron extension
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the cron schema exists (pg_cron extension installed)
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    RETURN QUERY
    SELECT 
      j.jobid,
      j.schedule,
      j.command,
      j.nodename,
      j.nodeport,
      j.database,
      j.username,
      j.active,
      j.jobname
    FROM cron.job j
    ORDER BY j.jobid;
  END IF;
END;
$$;