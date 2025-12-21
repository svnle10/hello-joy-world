-- Allow authenticated users to read webhook settings only (needed for sheets logging)
CREATE POLICY "Authenticated users can read webhook settings"
ON public.app_settings
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND key IN ('sheets_webhook_url', 'sheets_delete_webhook_url')
);