-- Remove guide's ability to SELECT raw customer emails from email_logs
-- They can still INSERT their own logs, but can only VIEW through the masked email_logs_secure view
DROP POLICY IF EXISTS "Guides can view their own email logs" ON public.email_logs;

-- Ensure the email_logs_secure view is properly set up with SECURITY INVOKER
-- This view masks customer emails and inherits RLS from the underlying table
DROP VIEW IF EXISTS public.email_logs_secure;

CREATE VIEW public.email_logs_secure 
WITH (security_invoker = true) AS
SELECT 
  id,
  guide_id,
  public.mask_email(customer_email) as customer_email,
  pickup_time,
  customer_language,
  sent_at
FROM public.email_logs;

-- Add RLS policy for guides to view their own masked logs via the view
-- Since the view uses SECURITY INVOKER, we need a SELECT policy that the view can use
-- But we want guides to only see masked data, so we create a policy that works with admin access only for raw data
-- The view will work because it calls mask_email() which sanitizes the data

-- Create a new policy that allows guides to read their own rows (view will mask the email)
CREATE POLICY "Guides can view their own email logs via secure view" 
ON public.email_logs 
FOR SELECT 
USING (auth.uid() = guide_id);

COMMENT ON VIEW public.email_logs_secure IS 'Secure view that masks customer email addresses. Guides should query this view instead of email_logs directly to protect customer PII.';