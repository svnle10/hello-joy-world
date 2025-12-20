-- Fix 1: Drop the overly permissive policy on app_settings and create admin-only access
DROP POLICY IF EXISTS "Authenticated users can view webhook settings" ON public.app_settings;

-- Create a new policy that only allows admins to view webhook settings
CREATE POLICY "Only admins can view webhook settings" 
ON public.app_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: email_logs_secure is a VIEW, not a table, so RLS policies don't apply the same way
-- The view already uses SECURITY INVOKER which means it inherits RLS from the underlying email_logs table
-- We need to grant proper access to the view for authenticated users
-- The view is already set up correctly - it will use the caller's permissions on email_logs

-- Add a comment to document that this is intentional
COMMENT ON VIEW public.email_logs_secure IS 'Secure view for email logs with masked customer emails. Uses SECURITY INVOKER to inherit RLS from email_logs table.';