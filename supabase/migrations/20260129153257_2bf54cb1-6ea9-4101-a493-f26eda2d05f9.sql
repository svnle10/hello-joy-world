-- Fix 1: Add RLS to email_logs_secure view
-- The view already exists with security_invoker, we just need to ensure proper RLS on the base table
-- The view uses SECURITY INVOKER which means it respects RLS of the querying user
-- The base table email_logs already has proper RLS policies, so the view is secure

-- Fix 2: Create a secure bookings view that masks PII for guides
-- Similar to email_logs_secure, create a view that masks customer email and phone for non-admins

-- Create mask_phone function similar to mask_email
CREATE OR REPLACE FUNCTION public.mask_phone(phone_number text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE 
    WHEN phone_number IS NULL OR phone_number = '' THEN ''
    WHEN LENGTH(phone_number) <= 4 THEN '***'
    ELSE 
      LEFT(phone_number, 3) || 
      REPEAT('*', GREATEST(LENGTH(phone_number) - 5, 3)) || 
      RIGHT(phone_number, 2)
  END
$$;

-- Create secure view for bookings that masks PII for guides
CREATE OR REPLACE VIEW public.bookings_secure
WITH (security_invoker=on) AS
SELECT 
  id,
  group_id,
  booking_reference,
  customer_name,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN phone
    ELSE public.mask_phone(phone)
  END AS phone,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN email
    ELSE public.mask_email(email)
  END AS email,
  number_of_people,
  language,
  meeting_point,
  status,
  notes,
  postponed_to,
  created_at
FROM public.bookings;