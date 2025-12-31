import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSheetsLogger, formatTimeOnly } from '@/hooks/useSheetsLogger';
import { useN8nWebhooks } from '@/hooks/useN8nWebhooks';
import { isValidWebhookUrl } from '@/lib/webhookValidator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Send, Mail, Clock, Globe, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.object({
  language: z.string().min(1, 'Please select a language'),
  email: z.string().email('Invalid email address').max(255, 'Email is too long'),
  pickupTime: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Please enter a valid time format')
    .refine(val => val >= '12:30' && val <= '16:50', 'Time must be between 12:30 and 16:50'),
});

const languages = [
  { value: 'English', label: 'English', flag: '🇬🇧' },
  { value: 'French', label: 'Français', flag: '🇫🇷' },
  { value: 'Spanish', label: 'Español', flag: '🇪🇸' },
];

export default function EmailForm() {
  const { user } = useAuth();
  const { logToSheets } = useSheetsLogger();
  const { logEmailSent } = useN8nWebhooks();
  const [language, setLanguage] = useState('');
  const [email, setEmail] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [loadingWebhook, setLoadingWebhook] = useState(true);
  const [guideName, setGuideName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('webhook_url, full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!error && data) {
        setWebhookUrl(data.webhook_url);
        setGuideName(data.full_name || '');
      }
      setLoadingWebhook(false);
    };

    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = emailSchema.safeParse({ language, email, pickupTime });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!user) {
      toast.error('Please login first');
      return;
    }

    if (!webhookUrl) {
      toast.error('Your webhook URL is not configured. Contact admin.');
      return;
    }

    setIsLoading(true);

    try {
      // Call edge function instead of direct webhook call
      const { data, error } = await supabase.functions.invoke('send-email-webhook', {
        body: {
          language: language,
          email: email.trim(),
          pickupTime: pickupTime,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to send data');
      }

      const now = new Date();
      const timeOnly = formatTimeOnly(now);

      // Log to Google Sheets (first webhook - Sheets Logging)
      logToSheets({
        '#Date': now.toISOString().split('T')[0],
        '#Operation_Time': timeOnly,
        '#Guide': data?.guideName || guideName || user.email || '',
        '#Customer_Email': email.trim(),
        '#Pickup_Time': pickupTime,
        '#Customer_Language': language,
      });

      // Log to n8n Email Logs webhook (second webhook)
      logEmailSent({
        date: now.toISOString().split('T')[0],
        time: timeOnly,
        guide: data?.guideName || guideName || user.email || '',
        customer_email: email.trim(),
        pickup_time: pickupTime,
        customer_language: language,
      });

      toast.success('Data sent successfully! ✉️');
      
      // Reset form
      setLanguage('');
      setEmail('');
      setPickupTime('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('An error occurred while sending');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingWebhook) {
    return (
      <Card className="max-w-lg mx-auto border-primary/20 shadow-xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto border-primary/20 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl font-bold">
          Send Email to Customer
        </CardTitle>
        <CardDescription>
          For customers without WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!webhookUrl ? (
          <div className="text-center py-6">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-muted-foreground">
              Your webhook URL is not configured yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact admin to add the URL.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Customer Language
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select language..." />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Customer Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-left"
                dir="ltr"
              />
            </div>

            {/* Pickup Time */}
            <div className="space-y-2">
              <Label htmlFor="pickupTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Pickup Time
              </Label>
              <Input
                id="pickupTime"
                type="time"
                min="12:30"
                max="16:50"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                required
                className="h-12 text-left"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                Select time between 12:30 and 16:50 PM
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 gradient-sunset hover:opacity-90 transition-opacity text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}