-- Fix email_logs RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Guides can create email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Guides can view their own email logs" ON public.email_logs;

-- Recreate policies as PERMISSIVE (default) for proper OR logic
CREATE POLICY "Admins can view all email logs" 
ON public.email_logs 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Guides can view their own email logs" 
ON public.email_logs 
FOR SELECT 
TO authenticated
USING (auth.uid() = guide_id);

CREATE POLICY "Guides can create their own email logs" 
ON public.email_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = guide_id);

-- Fix app_settings RLS policies - remove public access
DROP POLICY IF EXISTS "Everyone can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;

-- Only admins can view and manage app settings
CREATE POLICY "Admins can manage app settings" 
ON public.app_settings 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to view only the sheets webhook settings (needed for logging)
CREATE POLICY "Authenticated users can view webhook settings" 
ON public.app_settings 
FOR SELECT 
TO authenticated
USING (key IN ('sheets_webhook_url', 'sheets_delete_webhook_url'));