import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Send, Mail, Clock, Globe } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.object({
  language: z.string().min(1, 'يرجى اختيار اللغة'),
  email: z.string().email('البريد الإلكتروني غير صالح').max(255, 'البريد الإلكتروني طويل جداً'),
  pickupTime: z.string()
    .regex(/^\d{1,2}$/, 'أدخل الوقت كرقم فقط (مثال: 3 أو 15)')
    .transform(val => parseInt(val))
    .refine(val => val >= 0 && val <= 23, 'الوقت يجب أن يكون بين 0 و 23'),
});

const languages = [
  { value: 'english', label: 'English', flag: '🇬🇧' },
  { value: 'french', label: 'Français', flag: '🇫🇷' },
  { value: 'spanish', label: 'Español', flag: '🇪🇸' },
  { value: 'german', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'arabic', label: 'العربية', flag: '🇸🇦' },
];

interface EmailFormProps {
  n8nWebhookUrl?: string;
}

export default function EmailForm({ n8nWebhookUrl }: EmailFormProps) {
  const { user } = useAuth();
  const [language, setLanguage] = useState('');
  const [email, setEmail] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);

    try {
      // Send to n8n webhook if configured
      const webhookUrl = n8nWebhookUrl || import.meta.env.VITE_N8N_WEBHOOK_URL;
      
      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            language,
            email: email.trim(),
            pickupTime: pickupTime,
          }),
        });

        if (!response.ok) {
          throw new Error('فشل إرسال البيانات إلى n8n');
        }
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
              type="text"
              placeholder="مثال: 3 أو 15 (بدون PM أو AM)"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value.replace(/\D/g, '').slice(0, 2))}
              required
              className="h-12 text-left"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground font-arabic">
              أدخل الوقت كرقم فقط (من 0 إلى 23)
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
      </CardContent>
    </Card>
  );
}