import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useN8nWebhooks } from '@/hooks/useN8nWebhooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Sun, Mountain, Phone, Mail, Eye, EyeOff, Users, Shield } from 'lucide-react';
import { z } from 'zod';
import companyLogo from '@/assets/company-logo.png';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const cleanPhoneNumber = (phone: string) => {
  return phone.replace(/[\s\-\(\)]/g, '');
};

type UserRole = 'guide' | 'admin';

export default function Auth() {
  const { user, loading, signInWithPhone, signInWithEmail } = useAuth();
  const { t, dir } = useLanguage();
  const { logUserLogin } = useN8nWebhooks();
  const [phone, setPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPhonePassword, setShowPhonePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'role' | 'input'>('role');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const phoneSchema = z.object({
    phone: z.string().min(10, t('auth.invalid_phone')),
  });

  const emailSchema = z.object({
    email: z.string().email(t('auth.invalid_phone')),
    password: z.string().min(6, t('auth.invalid_phone')),
  });

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

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanedPhone = cleanPhoneNumber(phone);
    
    const validation = phoneSchema.safeParse({ phone: cleanedPhone });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!/^\+?[0-9]+$/.test(cleanedPhone)) {
      toast.error(t('auth.invalid_phone'));
      return;
    }

    if (phonePassword.length < 6) {
      toast.error(t('auth.invalid_phone'));
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithPhone(cleanedPhone, phonePassword);
    
    if (error) {
      toast.error(t('auth.invalid_credentials'));
    } else {
      // Log to n8n User Logins webhook
      logUserLogin({
        login_method: 'phone',
        phone: cleanedPhone,
        role: selectedRole,
      });
      toast.success(t('poll.success'));
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
      toast.error(t('auth.invalid_credentials'));
    } else {
      // Log to n8n User Logins webhook
      logUserLogin({
        login_method: 'email',
        email: email,
        role: selectedRole,
      });
      toast.success(t('poll.success'));
    }
    setIsLoading(false);
  };

  const handleTabChange = (value: string) => {
    setAuthMethod(value as 'phone' | 'email');
  };

  const handleBackToRoles = () => {
    setStep('role');
    setSelectedRole(null);
    setPhone('');
    setPhonePassword('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-desert relative overflow-hidden" dir={dir}>
      {/* Language Switcher */}
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-10 end-10 opacity-20">
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
            {t('auth.title')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('auth.subtitle')}
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
                <span className="text-lg font-medium">{t('analytics.total_guides')}</span>
              </Button>
              <Button
                onClick={() => handleRoleSelect('admin')}
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-amber-500/10 hover:border-amber-500 transition-all"
              >
                <Shield className="h-8 w-8 text-amber-500" />
                <span className="text-lg font-medium">{t('analytics.total_admins')}</span>
              </Button>
            </div>
          )}

          {step === 'input' && (
            <>
              <Tabs value={authMethod} onValueChange={handleTabChange} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {t('auth.phone')}
                  </TabsTrigger>
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('email.customer_email').split(' ')[0]}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="phone">
                  <form onSubmit={handlePhoneLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('auth.phone')}</Label>
                      <div className="relative">
                        <Phone className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder={t('auth.phone_placeholder')}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="text-left pe-10"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phonePassword">{t('auth.password')}</Label>
                      <div className="relative">
                        <Input
                          id="phonePassword"
                          type={showPhonePassword ? 'text' : 'password'}
                          placeholder={t('auth.password_placeholder')}
                          value={phonePassword}
                          onChange={(e) => setPhonePassword(e.target.value)}
                          required
                          className="text-left pe-10"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPhonePassword(!showPhonePassword)}
                          className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPhonePassword ? (
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
                        t('auth.login')
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="email">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('email.customer_email')}</Label>
                      <div className="relative">
                        <Mail className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={selectedRole === 'admin' ? 'admin@example.com' : 'guide@example.com'}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="text-left pe-10"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('auth.password_placeholder')}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="text-left pe-10"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                        t('auth.login')
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
                {t('common.cancel')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
