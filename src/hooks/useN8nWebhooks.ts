import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type WebhookType = 
  | 'daily_reports'
  | 'email_logs'
  | 'issues'
  | 'guide_unavailability'
  | 'groups'
  | 'bookings'
  | 'daily_assignments'
  | 'user_logins';

const WEBHOOK_KEY_MAP: Record<WebhookType, string> = {
  daily_reports: 'webhook_daily_reports',
  email_logs: 'webhook_email_logs',
  issues: 'webhook_issues',
  guide_unavailability: 'webhook_guide_unavailability',
  groups: 'webhook_groups',
  bookings: 'webhook_bookings',
  daily_assignments: 'webhook_daily_assignments',
  user_logins: 'webhook_user_logins',
};

export function useN8nWebhooks() {
  const sendToWebhook = useCallback(async (
    type: WebhookType,
    data: Record<string, unknown>,
    action: 'add' | 'update' | 'delete' = 'add'
  ): Promise<boolean> => {
    try {
      const settingKey = WEBHOOK_KEY_MAP[type];
      
      // Fetch the webhook URL from app_settings
      const { data: settings, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', settingKey)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching ${type} webhook URL:`, error);
        return false;
      }

      const webhookUrl = settings?.value;
      
      if (!webhookUrl) {
        console.log(`No webhook URL configured for ${type}`);
        return false;
      }

      // Send data to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors', // Required for cross-origin requests
        body: JSON.stringify({
          ...data,
          action,
          timestamp: new Date().toISOString(),
        }),
      });

      console.log(`Data sent to ${type} webhook`);
      return true;
    } catch (err) {
      console.error(`Error sending to ${type} webhook:`, err);
      return false;
    }
  }, []);

  // Convenience methods for common operations
  const logDailyReport = useCallback((data: Record<string, unknown>) => 
    sendToWebhook('daily_reports', data, 'add'), [sendToWebhook]);

  const deleteDailyReport = useCallback((data: Record<string, unknown>) => 
    sendToWebhook('daily_reports', data, 'delete'), [sendToWebhook]);

  const logEmailSent = useCallback((data: Record<string, unknown>) => 
    sendToWebhook('email_logs', data, 'add'), [sendToWebhook]);

  const logIssue = useCallback((data: Record<string, unknown>) => 
    sendToWebhook('issues', data, 'add'), [sendToWebhook]);

  const logGuideUnavailability = useCallback((data: Record<string, unknown>) => 
    sendToWebhook('guide_unavailability', data, 'add'), [sendToWebhook]);

  const logGroup = useCallback((data: Record<string, unknown>, action: 'add' | 'update' | 'delete' = 'add') => 
    sendToWebhook('groups', data, action), [sendToWebhook]);

  const logBooking = useCallback((data: Record<string, unknown>, action: 'add' | 'update' | 'delete' = 'add') => 
    sendToWebhook('bookings', data, action), [sendToWebhook]);

  const logDailyAssignment = useCallback((data: Record<string, unknown>, action: 'add' | 'update' | 'delete' = 'add') => 
    sendToWebhook('daily_assignments', data, action), [sendToWebhook]);

  const logUserLogin = useCallback((data: Record<string, unknown>) => 
    sendToWebhook('user_logins', data, 'add'), [sendToWebhook]);

  return {
    sendToWebhook,
    logDailyReport,
    deleteDailyReport,
    logEmailSent,
    logIssue,
    logGuideUnavailability,
    logGroup,
    logBooking,
    logDailyAssignment,
    logUserLogin,
  };
}
