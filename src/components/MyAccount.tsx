import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Phone, Mail, Lock, Eye, EyeOff, Loader2, Save, Pencil, X } from 'lucide-react';

export default function MyAccount() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<{ full_name: string; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit mode states
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  
  // Edit values
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  
  // Saving states
  const [savingName, setSavingName] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      if (data) {
        setNewName(data.full_name);
        setNewPhone(data.phone || '');
      }
      setNewEmail(user.email || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast.error(t('account.name_required'));
      return;
    }
    
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName.trim() })
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, full_name: newName.trim() } : null);
      setEditingName(false);
      toast.success(t('account.name_updated'));
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error(t('account.update_failed'));
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePhone = async () => {
    if (!newPhone.trim()) {
      toast.error(t('account.phone_required'));
      return;
    }
    
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: newPhone.trim() })
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, phone: newPhone.trim() } : null);
      setEditingPhone(false);
      toast.success(t('account.phone_updated'));
    } catch (error) {
      console.error('Error updating phone:', error);
      toast.error(t('account.update_failed'));
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!newEmail.trim()) {
      toast.error(t('account.email_required'));
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error(t('account.invalid_email'));
      return;
    }
    
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) throw error;
      
      setEditingEmail(false);
      toast.success(t('account.email_verification_sent'));
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast.error(t('account.update_failed'));
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error(t('account.password_min_length'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error(t('account.passwords_dont_match'));
      return;
    }

    setChangingPassword(true);
    
    try {
      // First verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        phone: user?.phone || '',
        password: currentPassword,
      });

      if (signInError) {
        toast.error(t('account.current_password_incorrect'));
        setChangingPassword(false);
        return;
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success(t('account.password_changed'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(t('account.password_change_failed'));
    } finally {
      setChangingPassword(false);
    }
  };

  const cancelEdit = (field: 'name' | 'phone' | 'email') => {
    if (field === 'name') {
      setNewName(profile?.full_name || '');
      setEditingName(false);
    } else if (field === 'phone') {
      setNewPhone(profile?.phone || '');
      setEditingPhone(false);
    } else {
      setNewEmail(user?.email || '');
      setEditingEmail(false);
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
    <div className="space-y-6">
      {/* Personal Information Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            {t('account.personal_info')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                {t('account.full_name')}
              </Label>
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleSaveName()}
                    disabled={savingName}
                  >
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => cancelEdit('name')}
                    disabled={savingName}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-foreground">
                    {profile?.full_name || '-'}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingName(true)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {t('account.phone')}
              </Label>
              {editingPhone ? (
                <div className="flex gap-2">
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="flex-1"
                    dir="ltr"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleSavePhone()}
                    disabled={savingPhone}
                  >
                    {savingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => cancelEdit('phone')}
                    disabled={savingPhone}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-foreground" dir="ltr">
                    {profile?.phone || user?.phone || '-'}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingPhone(true)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {t('account.email')}
              </Label>
              {editingEmail ? (
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1"
                    dir="ltr"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleSaveEmail()}
                    disabled={savingEmail}
                  >
                    {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => cancelEdit('email')}
                    disabled={savingEmail}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-foreground" dir="ltr">
                    {user?.email || '-'}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingEmail(true)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              )}
              {editingEmail && (
                <p className="text-xs text-muted-foreground">{t('account.email_verification_note')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            {t('account.change_password')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('account.current_password')}</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('account.current_password_placeholder')}
                  required
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('account.new_password')}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('account.new_password_placeholder')}
                  required
                  minLength={6}
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('account.confirm_password')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('account.confirm_password_placeholder')}
                  required
                  minLength={6}
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full gradient-desert text-primary-foreground"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 me-2" />
                  {t('account.save_password')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}