-- Insert default webhook URLs into app_settings
INSERT INTO public.app_settings (key, value) VALUES
  ('webhook_daily_reports', 'https://n8n.srv1179760.hstgr.cloud/webhook/Daily-Reports'),
  ('webhook_email_logs', 'https://n8n.srv1179760.hstgr.cloud/webhook/Email-Logs'),
  ('webhook_issues', 'https://n8n.srv1179760.hstgr.cloud/webhook/Issues'),
  ('webhook_guide_unavailability', 'https://n8n.srv1179760.hstgr.cloud/webhook/Guide-Unavailability'),
  ('webhook_groups', 'https://n8n.srv1179760.hstgr.cloud/webhook/Groups'),
  ('webhook_bookings', 'https://n8n.srv1179760.hstgr.cloud/webhook/Bookings'),
  ('webhook_daily_assignments', 'https://n8n.srv1179760.hstgr.cloud/webhook/Daily-Assignments'),
  ('webhook_user_logins', 'https://n8n.srv1179760.hstgr.cloud/webhook/User-Logins')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();