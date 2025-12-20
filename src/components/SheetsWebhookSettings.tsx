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
      toast.error('Error loading settings');
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

      toast.success('Settings saved successfully');
    } catch (error: unknown) {
      console.error('Error saving webhook settings:', error);
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async (url: string, type: 'add' | 'delete') => {
    if (!url) {
      toast.error('Please enter a webhook URL first');
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
          '#Guide': 'Test',
          '#Activity': type === 'add' ? 'Test Add' : 'Test Delete',
        }),
      });
      
      toast.success('Test sent! Check Google Sheets');
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Failed to test webhook');
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
            <CardTitle className="text-lg">Google Sheets Logging</CardTitle>
            <CardDescription>
              Webhook URLs for logging and deleting in the spreadsheet
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
              <Label>Add Data Webhook</Label>
            </div>
            <Input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/add..."
              dir="ltr"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Used for adding activities, emails, and logins
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => testWebhook(webhookUrl, 'add')}
              disabled={!webhookUrl}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Test Add
            </Button>
          </div>

          {/* Delete Webhook */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <Label>Delete Data Webhook</Label>
            </div>
            <Input
              type="url"
              value={deleteWebhookUrl}
              onChange={(e) => setDeleteWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/delete..."
              dir="ltr"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Used when cancelling or deleting an activity
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => testWebhook(deleteWebhookUrl, 'delete')}
              disabled={!deleteWebhookUrl}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Test Delete
            </Button>
          </div>

          {/* Save Button */}
          <Button 
            type="submit" 
            disabled={saving}
            className="w-full gradient-desert"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>

          {(webhookUrl || deleteWebhookUrl) && (
            <div className="p-3 bg-success/10 rounded-lg border border-success/20">
              <p className="text-xs text-success flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Activities will be logged with guide name, not email
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
