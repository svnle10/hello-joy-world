import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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
  const logToSheets = useCallback(async (data: LogData): Promise<boolean> => {
    try {
      const { data: response, error } = await supabase.functions.invoke('log-to-sheets', {
        body: { action: 'log', data }
      });

      if (error) {
        console.error('Error logging to Google Sheets:', error);
        return false;
      }

      if (response?.success) {
        console.log('Event logged to Google Sheets');
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error logging to Google Sheets:', err);
      return false;
    }
  }, []);

  const logDeleteToSheets = useCallback(async (data: LogData): Promise<boolean> => {
    try {
      const { data: response, error } = await supabase.functions.invoke('log-to-sheets', {
        body: { action: 'delete', data }
      });

      if (error) {
        console.error('Error logging delete to Google Sheets:', error);
        return false;
      }

      if (response?.success) {
        console.log('Delete event logged to Google Sheets');
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error logging delete to Google Sheets:', err);
      return false;
    }
  }, []);

  // Keep these for backwards compatibility but they're no longer exposed to clients
  return { logToSheets, logDeleteToSheets, webhookUrl: null, deleteWebhookUrl: null, loading: false };
}
