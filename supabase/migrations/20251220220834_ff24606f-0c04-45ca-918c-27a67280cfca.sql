-- Allow guides to delete their own daily reports
CREATE POLICY "Guides can delete their own reports" 
ON public.daily_reports 
FOR DELETE 
USING (auth.uid() = guide_id);

-- Allow admins to delete any reports
CREATE POLICY "Admins can delete all reports" 
ON public.daily_reports 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add delete webhook URL setting
INSERT INTO public.app_settings (key, value) 
VALUES ('sheets_delete_webhook_url', NULL)
ON CONFLICT DO NOTHING;