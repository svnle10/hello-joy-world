import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, TestTube, Link, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface WebhookConfig {
  key: string;
  label: string;
  labelAr: string;
  value: string;
}

const WEBHOOK_KEYS: { key: string; label: string; labelAr: string }[] = [
  { key: 'webhook_daily_reports', label: 'Daily Reports', labelAr: 'التقارير اليومية' },
  { key: 'webhook_email_logs', label: 'Email Logs', labelAr: 'سجلات البريد' },
  { key: 'webhook_issues', label: 'Issues', labelAr: 'المشاكل' },
  { key: 'webhook_guide_unavailability', label: 'Guide Unavailability', labelAr: 'عدم توفر المرشد' },
  { key: 'webhook_groups', label: 'Groups', labelAr: 'المجموعات' },
  { key: 'webhook_bookings', label: 'Bookings', labelAr: 'الحجوزات' },
  { key: 'webhook_daily_assignments', label: 'Daily Assignments', labelAr: 'التعيينات اليومية' },
  { key: 'webhook_user_logins', label: 'User Logins', labelAr: 'تسجيلات الدخول' },
];

export default function WebhookSettings() {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', WEBHOOK_KEYS.map(w => w.key));

      if (error) throw error;

      const webhookData = WEBHOOK_KEYS.map(wk => ({
        ...wk,
        value: data?.find(d => d.key === wk.key)?.value || ''
      }));

      setWebhooks(webhookData);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل في تحميل إعدادات الـ Webhooks' : 'Failed to load webhook settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setWebhooks(prev => prev.map(w => w.key === key ? { ...w, value } : w));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const webhook of webhooks) {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: webhook.key, value: webhook.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        if (error) throw error;
      }

      toast({
        title: isRTL ? 'تم الحفظ' : 'Saved',
        description: isRTL ? 'تم حفظ إعدادات الـ Webhooks بنجاح' : 'Webhook settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving webhooks:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل في حفظ الإعدادات' : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async (key: string, url: string) => {
    if (!url) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'الرجاء إدخال رابط الـ Webhook أولاً' : 'Please enter a webhook URL first',
        variant: 'destructive',
      });
      return;
    }

    setTestingKey(key);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          message: 'Test from Lovable App',
        }),
      });

      toast({
        title: isRTL ? 'تم الإرسال' : 'Request Sent',
        description: isRTL ? 'تم إرسال الطلب، تحقق من n8n' : 'Request sent, check n8n history',
      });
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل في اختبار الـ Webhook' : 'Failed to test webhook',
        variant: 'destructive',
      });
    } finally {
      setTestingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          {isRTL ? 'إعدادات الـ Webhooks (n8n)' : 'Webhook Settings (n8n)'}
        </CardTitle>
        <CardDescription>
          {isRTL 
            ? 'روابط الـ webhooks لإرسال البيانات إلى Google Sheets عبر n8n'
            : 'Webhook URLs for sending data to Google Sheets via n8n'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {webhooks.map((webhook) => (
          <div key={webhook.key} className="space-y-2">
            <Label htmlFor={webhook.key}>
              {isRTL ? webhook.labelAr : webhook.label}
            </Label>
            <div className="flex gap-2">
              <Input
                id={webhook.key}
                value={webhook.value}
                onChange={(e) => handleChange(webhook.key, e.target.value)}
                placeholder="https://n8n.example.com/webhook/..."
                dir="ltr"
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => testWebhook(webhook.key, webhook.value)}
                disabled={testingKey === webhook.key}
                title={isRTL ? 'اختبار' : 'Test'}
              >
                {testingKey === webhook.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {isRTL 
              ? 'البيانات سيتم إرسالها تلقائياً عند حدوث أي تغيير'
              : 'Data will be sent automatically when changes occur'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
