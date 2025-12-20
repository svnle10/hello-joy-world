import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Send, Mail, Clock, Globe, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.object({
  language: z.string().min(1, 'يرجى اختيار اللغة'),
  email: z.string().email('البريد الإلكتروني غير صالح').max(255, 'البريد الإلكتروني طويل جداً'),
  pickupTime: z.string()
    .regex(/^\d{2}:\d{2}$/, 'يرجى إدخال الوقت بصيغة صحيحة')
    .refine(val => val >= '12:30' && val <= '16:50', 'الوقت يجب أن يكون بين 12:30 و 16:50'),
});

const languages = [
  { value: 'english', label: 'English', flag: '🇬🇧' },
  { value: 'french', label: 'Français', flag: '🇫🇷' },
  { value: 'spanish', label: 'Español', flag: '🇪🇸' },
  { value: 'german', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'arabic', label: 'العربية', flag: '🇸🇦' },
];

export default function EmailForm() {
  const { user } = useAuth();
  const [language, setLanguage] = useState('');
  const [email, setEmail] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [loadingWebhook, setLoadingWebhook] = useState(true);

  useEffect(() => {
    const fetchWebhookUrl = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('webhook_url')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!error && data) {
        setWebhookUrl(data.webhook_url);
      }
      setLoadingWebhook(false);
    };

    fetchWebhookUrl();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = emailSchema.safeParse({ language, email, pickupTime });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً');
      return;
    }

    if (!webhookUrl) {
      toast.error('لم يتم تكوين رابط الإرسال الخاص بك. تواصل مع المدير.');
      return;
    }

    setIsLoading(true);

    try {
      // Send to n8n webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "What is the customer's language": language,
          "what is the customer's email": email.trim(),
          "what is the customer's pickup time": pickupTime,
        }),
      });

      if (!response.ok) {
        throw new Error('فشل إرسال البيانات');
      }

      // Log the email in database
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          guide_id: user.id,
          customer_email: email.trim(),
          customer_language: language,
          pickup_time: pickupTime,
        });

      if (logError) {
        console.error('Error logging email:', logError);
      }

      toast.success('تم إرسال البيانات بنجاح! ✉️');
      
      // Reset form
      setLanguage('');
      setEmail('');
      setPickupTime('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('حدث خطأ أثناء الإرسال');
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
        <CardTitle className="text-xl font-bold font-arabic">
          إرسال إيميل للزبون
        </CardTitle>
        <CardDescription className="font-arabic">
          للزبائن الذين لا يتوفر لديهم واتساب
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!webhookUrl ? (
          <div className="text-center py-6">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-muted-foreground font-arabic">
              لم يتم تكوين رابط الإرسال الخاص بك بعد.
            </p>
            <p className="text-sm text-muted-foreground font-arabic mt-2">
              تواصل مع المدير لإضافة الرابط.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-arabic">
                <Globe className="h-4 w-4 text-muted-foreground" />
                لغة الزبون
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="اختر اللغة..." />
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
              <Label htmlFor="email" className="flex items-center gap-2 font-arabic">
                <Mail className="h-4 w-4 text-muted-foreground" />
                البريد الإلكتروني للزبون
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
              <Label htmlFor="pickupTime" className="flex items-center gap-2 font-arabic">
                <Clock className="h-4 w-4 text-muted-foreground" />
                وقت الاستلام
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
              <p className="text-xs text-muted-foreground font-arabic">
                اختر الوقت بين 12:30 و 16:50 مساءً (PM)
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 gradient-sunset hover:opacity-90 transition-opacity font-arabic text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-5 w-5 ml-2" />
                  إرسال
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}