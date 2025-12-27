import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Sun, Mountain, Phone } from 'lucide-react';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const phoneSchema = z.object({
  phone: z.string().min(10, 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل').regex(/^\+?[0-9]+$/, 'رقم هاتف غير صالح'),
});

export default function Auth() {
  const { user, loading, signInWithPhone, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-desert">
        <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = phoneSchema.safeParse({ phone });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithPhone(phone);
    
    if (error) {
      toast.error('حدث خطأ أثناء إرسال رمز التحقق');
    } else {
      toast.success('تم إرسال رمز التحقق إلى هاتفك');
      setStep('otp');
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('يرجى إدخال رمز التحقق كاملاً');
      return;
    }

    setIsLoading(true);
    const { error } = await verifyOtp(phone, otp);
    
    if (error) {
      toast.error('رمز التحقق غير صحيح');
    } else {
      toast.success('تم تسجيل الدخول بنجاح');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-desert relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 right-10 opacity-20">
        <Sun className="h-32 w-32 text-primary-foreground" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 opacity-10">
        <Mountain className="h-48 w-full text-primary-foreground" />
      </div>
      
      <Card className="w-full max-w-md glass border-primary/20 shadow-2xl animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full gradient-sunset flex items-center justify-center shadow-lg">
            <span className="text-3xl">🏜️</span>
          </div>
          <CardTitle className="text-2xl font-bold">
            Sun Sky Camp
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {step === 'phone' ? 'تسجيل دخول المرشد السياحي' : 'أدخل رمز التحقق'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+212612345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="text-left pr-10"
                    dir="ltr"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  أدخل رقم هاتفك مع رمز البلد (مثال: +212)
                </p>
              </div>
              <Button
                type="submit"
                className="w-full gradient-sunset hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'إرسال رمز التحقق'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-4">
                <Label className="text-center block">رمز التحقق</Label>
                <div className="flex justify-center" dir="ltr">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  تم إرسال رمز التحقق إلى {phone}
                </p>
              </div>
              <Button
                type="submit"
                className="w-full gradient-sunset hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'تأكيد'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                }}
              >
                تغيير رقم الهاتف
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
