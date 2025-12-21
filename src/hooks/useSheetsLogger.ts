import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { isValidWebhookUrl } from '@/lib/webhookValidator';

export type LogEventType = 'activity_completed' | 'email_sent' | 'user_login' | 'activity_deleted';

interface LogData {
  '#Date': string;
  '#Operation_Time': string;
  '#Guide': string;
  '#Activity'?: string;
  '#Customer_Email'?: string;
  '#Pickup_Time'?: string;
  '#Customer_Language'?: string;
  '#Action'?: string;
  '#Search_Guide'?: string;
  '#Search_Activity'?: string;
  '#Search_Date'?: string;
}

// Helper to format time as HH:mm
export function formatTimeOnly(date: Date): string {
  return format(date, 'HH:mm');
}

export function useSheetsLogger() {
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [deleteWebhookUrl, setDeleteWebhookUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebhookUrls = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', ['sheets_webhook_url', 'sheets_delete_webhook_url']);

        if (!error && data) {
          data.forEach((setting) => {
            if (setting.key === 'sheets_webhook_url' && setting.value) {
              setWebhookUrl(setting.value);
            }
            if (setting.key === 'sheets_delete_webhook_url' && setting.value) {
              setDeleteWebhookUrl(setting.value);
            }
          });
        }
      } catch (err) {
        console.error('Error fetching sheets webhook URLs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWebhookUrls();
  }, []);

  const logToSheets = useCallback(async (data: LogData): Promise<boolean> => {
    if (!webhookUrl) {
      console.log('Sheets webhook not configured, skipping log');
      return false;
    }

    // Validate URL before making request (SSRF protection)
    const validation = isValidWebhookUrl(webhookUrl);
    if (!validation.valid) {
      console.error('Invalid webhook URL:', validation.error);
      return false;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(data),
      });
      console.log('Event logged to Google Sheets');
      return true;
    } catch (err) {
      console.error('Error logging to Google Sheets:', err);
      return false;
    }
  }, [webhookUrl]);

  const logDeleteToSheets = useCallback(async (data: LogData): Promise<boolean> => {
    if (!deleteWebhookUrl) {
      console.log('Delete webhook not configured, skipping log');
      return false;
    }

    // Validate URL before making request (SSRF protection)
    const validation = isValidWebhookUrl(deleteWebhookUrl);
    if (!validation.valid) {
      console.error('Invalid delete webhook URL:', validation.error);
      return false;
    }

    try {
      await fetch(deleteWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(data),
      });
      console.log('Delete event logged to Google Sheets');
      return true;
    } catch (err) {
      console.error('Error logging delete to Google Sheets:', err);
      return false;
    }
  }, [deleteWebhookUrl]);

  return { logToSheets, logDeleteToSheets, webhookUrl, deleteWebhookUrl, loading };
}
