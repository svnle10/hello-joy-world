import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Sun, Mountain, Phone, Mail, Eye, EyeOff, Users, Shield } from 'lucide-react';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import companyLogo from '@/assets/company-logo.png';

const phoneSchema = z.object({
  phone: z.string().min(10, 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل').regex(/^\+?[0-9]+$/, 'رقم هاتف غير صالح'),
});

const emailSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

type UserRole = 'guide' | 'admin';

export default function Auth() {
  const { user, loading, signInWithPhone, signInWithEmail, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'role' | 'input' | 'otp'>('role');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

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

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('input');
  };

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = emailSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithEmail(email, password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('بيانات الدخول غير صحيحة');
      } else {
        toast.error('حدث خطأ أثناء تسجيل الدخول');
      }
    } else {
      toast.success('تم تسجيل الدخول بنجاح');
    }
    setIsLoading(false);
  };

  const handleTabChange = (value: string) => {
    setAuthMethod(value as 'phone' | 'email');
    setOtp('');
  };

  const handleBackToRoles = () => {
    setStep('role');
    setSelectedRole(null);
    setPhone('');
    setEmail('');
    setPassword('');
    setOtp('');
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
          <div className="mx-auto">
            <img 
              src={companyLogo} 
              alt="Sun Sky Camp Logo" 
              className="h-24 w-24 mx-auto rounded-full object-cover"
            />
          </div>
          <CardTitle className="text-2xl font-bold">
            Sun Sky Camp
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {step === 'role' && 'اختر نوع الحساب'}
            {step === 'input' && (selectedRole === 'guide' ? 'تسجيل دخول المرشد السياحي' : 'تسجيل دخول المسؤول')}
            {step === 'otp' && 'أدخل رمز التحقق'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'role' && (
            <div className="space-y-4">
              <Button
                onClick={() => handleRoleSelect('guide')}
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 hover:border-primary transition-all"
              >
                <Users className="h-8 w-8 text-primary" />
                <span className="text-lg font-medium">مرشد سياحي</span>
              </Button>
              <Button
                onClick={() => handleRoleSelect('admin')}
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-amber-500/10 hover:border-amber-500 transition-all"
              >
                <Shield className="h-8 w-8 text-amber-500" />
                <span className="text-lg font-medium">مسؤول (Admin)</span>
              </Button>
            </div>
          )}

          {step === 'otp' && (
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
                  setStep('input');
                  setOtp('');
                }}
              >
                تغيير رقم الهاتف
              </Button>
            </form>
          )}

          {step === 'input' && (
            <>
              <Tabs value={authMethod} onValueChange={handleTabChange} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    الهاتف
                  </TabsTrigger>
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    البريد
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="phone">
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
                </TabsContent>

                <TabsContent value="email">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={selectedRole === 'admin' ? 'admin@example.com' : 'guide@example.com'}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="text-left pr-10"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="text-left pr-10"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full gradient-sunset hover:opacity-90 transition-opacity"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'تسجيل الدخول'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <Button
                type="button"
                variant="ghost"
                className="w-full mt-4"
                onClick={handleBackToRoles}
              >
                العودة لاختيار نوع الحساب
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
