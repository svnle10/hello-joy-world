-- Add a function to mask email addresses for display
CREATE OR REPLACE FUNCTION public.mask_email(email_address text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE 
    WHEN email_address IS NULL OR email_address = '' THEN ''
    WHEN position('@' in email_address) = 0 THEN '***'
    ELSE 
      LEFT(SPLIT_PART(email_address, '@', 1), 2) || 
      '***@' || 
      SPLIT_PART(email_address, '@', 2)
  END
$$;

-- Create a secure view for email_logs that masks emails for non-admins
CREATE OR REPLACE VIEW public.email_logs_secure AS
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

-- Enable RLS on the view (views inherit table RLS by default when queried)
-- The underlying table RLS policies will apply

-- Grant access to the view
GRANT SELECT ON public.email_logs_secure TO authenticated;