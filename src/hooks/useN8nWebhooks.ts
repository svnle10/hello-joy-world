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
      // Important: webhook URLs are protected in the database (guides can't read them).
      // So we always go through the backend function which reads settings securely
      // and forwards the payload to the correct n8n webhook.

      const typeMap: Record<WebhookType, 'daily_report' | 'email_log' | 'issue' | 'unavailability' | 'group' | 'booking' | 'assignment' | 'user_login'> = {
        daily_reports: 'daily_report',
        email_logs: 'email_log',
        issues: 'issue',
        guide_unavailability: 'unavailability',
        groups: 'group',
        bookings: 'booking',
        daily_assignments: 'assignment',
        user_logins: 'user_login',
      };

      const actionMap = {
        add: 'create',
        update: 'update',
        delete: 'delete',
      } as const;

      const mappedType = typeMap[type];
      const mappedAction = actionMap[action];

      console.log('[n8n Webhook] invoke log-to-n8n:', { type: mappedType, action: mappedAction, data });

      const { data: resp, error } = await supabase.functions.invoke('log-to-n8n', {
        body: {
          type: mappedType,
          action: mappedAction,
          data,
        },
      });

      if (error) {
        console.error('[n8n Webhook] log-to-n8n error:', error);
        return false;
      }

      if (resp?.success) {
        console.log('[n8n Webhook] ✅ forwarded successfully');
        return true;
      }

      console.log('[n8n Webhook] ⚠️ not forwarded (likely not configured):', resp);
      return false;
    } catch (err) {
      console.error('[n8n Webhook] ❌ unexpected error:', err);
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
