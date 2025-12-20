import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export default function SheetsWebhookSettings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingId, setSettingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSetting();
  }, []);

  const fetchSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'sheets_webhook_url')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setWebhookUrl(data.value || '');
        setSettingId(data.id);
      }
    } catch (error) {
      console.error('Error fetching webhook setting:', error);
      toast.error('حدث خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settingId) {
      toast.error('لم يتم العثور على الإعداد');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: webhookUrl || null })
        .eq('id', settingId);

      if (error) throw error;

      toast.success('تم حفظ الرابط بنجاح');
    } catch (error: unknown) {
      console.error('Error saving webhook setting:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast.error('يرجى إدخال رابط webhook أولاً');
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          event_type: 'test',
          message: 'Test from Sun Sky Camp App',
          timestamp: new Date().toISOString(),
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
              تسجيل جميع الأحداث تلقائياً في جدول بيانات
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-arabic">رابط n8n Webhook</Label>
            <Input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/..."
              dir="ltr"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground font-arabic">
              أنشئ workflow في n8n يستقبل البيانات ويحفظها في Google Sheets
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={saving}
              className="flex-1 gradient-desert font-arabic"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={testWebhook}
              disabled={!webhookUrl}
              className="font-arabic"
            >
              <CheckCircle2 className="h-4 w-4 ml-2" />
              اختبار
            </Button>
          </div>

          {webhookUrl && (
            <div className="p-3 bg-success/10 rounded-lg border border-success/20">
              <p className="text-xs text-success font-arabic flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                سيتم تسجيل: الأنشطة اليومية، إرسال الإيميلات، تسجيل الدخول
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
