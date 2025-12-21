-- Create a function to automatically delete email logs older than 90 days
CREATE OR REPLACE FUNCTION public.cleanup_old_email_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.email_logs
  WHERE sent_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Grant execute permission to postgres (for cron jobs)
GRANT EXECUTE ON FUNCTION public.cleanup_old_email_logs() TO postgres;

-- Add a comment explaining the retention policy
COMMENT ON FUNCTION public.cleanup_old_email_logs() IS 'Automatically deletes email logs older than 90 days for data retention compliance. Should be called periodically via pg_cron or external scheduler.';