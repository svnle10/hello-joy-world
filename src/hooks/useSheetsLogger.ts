import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LogEventType = 'activity_completed' | 'email_sent' | 'user_login';

interface LogData {
  event_type: LogEventType;
  guide_email?: string;
  guide_name?: string;
  activity_name?: string;
  activity_name_ar?: string;
  customer_email?: string;
  customer_language?: string;
  pickup_time?: string;
  completed_at?: string;
  date?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export function useSheetsLogger() {
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebhookUrl = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'sheets_webhook_url')
          .maybeSingle();

        if (!error && data?.value) {
          setWebhookUrl(data.value);
        }
      } catch (err) {
        console.error('Error fetching sheets webhook URL:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWebhookUrl();
  }, []);

  const logToSheets = useCallback(async (data: LogData): Promise<boolean> => {
    if (!webhookUrl) {
      console.log('Sheets webhook not configured, skipping log');
      return false;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          ...data,
          timestamp: data.timestamp || new Date().toISOString(),
        }),
      });
      console.log('Event logged to Google Sheets:', data.event_type);
      return true;
    } catch (err) {
      console.error('Error logging to Google Sheets:', err);
      return false;
    }
  }, [webhookUrl]);

  return { logToSheets, webhookUrl, loading };
}
