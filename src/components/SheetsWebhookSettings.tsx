import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, FileSpreadsheet, CheckCircle2, Trash2 } from 'lucide-react';

interface WebhookSetting {
  id: string;
  key: string;
  value: string | null;
}

export default function SheetsWebhookSettings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [deleteWebhookUrl, setDeleteWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WebhookSetting[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['sheets_webhook_url', 'sheets_delete_webhook_url']);

      if (error) throw error;
      
      if (data) {
        setSettings(data);
        data.forEach((setting) => {
          if (setting.key === 'sheets_webhook_url') {
            setWebhookUrl(setting.value || '');
          }
          if (setting.key === 'sheets_delete_webhook_url') {
            setDeleteWebhookUrl(setting.value || '');
          }
        });
      }
    } catch (error) {
      console.error('Error fetching webhook settings:', error);
      toast.error('حدث خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Update add webhook
      const addSetting = settings.find(s => s.key === 'sheets_webhook_url');
      if (addSetting) {
        const { error: addError } = await supabase
          .from('app_settings')
          .update({ value: webhookUrl || null })
          .eq('id', addSetting.id);
        if (addError) throw addError;
      }

      // Update delete webhook
      const deleteSetting = settings.find(s => s.key === 'sheets_delete_webhook_url');
      if (deleteSetting) {
        const { error: deleteError } = await supabase
          .from('app_settings')
          .update({ value: deleteWebhookUrl || null })
          .eq('id', deleteSetting.id);
        if (deleteError) throw deleteError;
      }

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error: unknown) {
      console.error('Error saving webhook settings:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async (url: string, type: 'add' | 'delete') => {
    if (!url) {
      toast.error('يرجى إدخال رابط webhook أولاً');
      return;
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          '#Date': new Date().toISOString().split('T')[0],
          '#Operation_Time': new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          '#Guide': 'اختبار',
          '#Activity': type === 'add' ? 'اختبار الإضافة' : 'اختبار الحذف',
        }),
      });
      
      toast.success('تم إرسال اختبار! تحقق من Google Sheets');
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('فشل اختبار الرابط');
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <FileSpreadsheet className="h-5 w-5 text-success" />
          </div>
          <div>
            <CardTitle className="font-arabic text-lg">تسجيل Google Sheets</CardTitle>
            <CardDescription className="font-arabic">
              روابط webhook للتسجيل والحذف في جدول البيانات
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Add Webhook */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <Label className="font-arabic">رابط إضافة البيانات (Webhook)</Label>
            </div>
            <Input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/add..."
              dir="ltr"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground font-arabic">
              يُستخدم لإضافة الأنشطة والإيميلات وتسجيلات الدخول
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => testWebhook(webhookUrl, 'add')}
              disabled={!webhookUrl}
              className="font-arabic"
            >
              <CheckCircle2 className="h-4 w-4 ml-2" />
              اختبار الإضافة
            </Button>
          </div>

          {/* Delete Webhook */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <Label className="font-arabic">رابط حذف البيانات (Webhook)</Label>
            </div>
            <Input
              type="url"
              value={deleteWebhookUrl}
              onChange={(e) => setDeleteWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/delete..."
              dir="ltr"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground font-arabic">
              يُستخدم عند إلغاء أو حذف نشاط (يمكنك البحث عن الصف وحذفه)
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => testWebhook(deleteWebhookUrl, 'delete')}
              disabled={!deleteWebhookUrl}
              className="font-arabic"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              اختبار الحذف
            </Button>
          </div>

          {/* Save Button */}
          <Button 
            type="submit" 
            disabled={saving}
            className="w-full gradient-desert font-arabic"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 ml-2" />
                حفظ الإعدادات
              </>
            )}
          </Button>

          {(webhookUrl || deleteWebhookUrl) && (
            <div className="p-3 bg-success/10 rounded-lg border border-success/20">
              <p className="text-xs text-success font-arabic flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                سيتم تسجيل الأنشطة باسم المرشد وليس البريد الإلكتروني
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
