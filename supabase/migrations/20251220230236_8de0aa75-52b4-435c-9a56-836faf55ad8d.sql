-- Drop the previous view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.email_logs_secure;

-- Recreate the view with SECURITY INVOKER (default, but being explicit)
CREATE VIEW public.email_logs_secure 
WITH (security_invoker = true)
AS
SELECT 
  id,
  guide_id,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN customer_email
    ELSE public.mask_email(customer_email)
  END as customer_email,
  customer_language,
  pickup_time,
  sent_at
FROM public.email_logs;

-- Grant access to the view
GRANT SELECT ON public.email_logs_secure TO authenticated;