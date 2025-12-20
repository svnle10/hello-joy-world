import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LogEventType = 'activity_completed' | 'email_sent' | 'user_login';

interface LogData {
  '#Date': string;
  '#Operation_Time': string;
  '#Guide': string;
  '#Activity'?: string;
  '#Customer_Email'?: string;
  '#Pickup_Time'?: string;
  '#Customer_Language'?: string;
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
        body: JSON.stringify(data),
      });
      console.log('Event logged to Google Sheets');
      return true;
    } catch (err) {
      console.error('Error logging to Google Sheets:', err);
      return false;
    }
  }, [webhookUrl]);

  return { logToSheets, webhookUrl, loading };
}
