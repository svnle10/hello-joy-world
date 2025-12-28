import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, ClipboardCheck, LogOut, Settings, Loader2, AlertTriangle, Users, CalendarOff, UserCircle } from 'lucide-react';
import EmailForm from '@/components/EmailForm';
import DailyPoll from '@/components/DailyPoll';
import AdminPanel from '@/components/AdminPanel';
import IssueReporting from '@/components/IssueReporting';
import GuideGroups from '@/components/GuideGroups';
import GuideAvailability from '@/components/GuideAvailability';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import MyAccount from '@/components/MyAccount';

export default function Dashboard() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { t, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState(() => isAdmin ? 'issues' : 'poll');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Header */}
      <header className="gradient-desert sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-sunset flex items-center justify-center shadow-md">
                <span className="text-xl">🏜️</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary-foreground">
                  Sun Sky Camp
                </h1>
                <p className="text-xs text-primary-foreground/80">
                  {t('dashboard.title')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4 me-2" />
                <span className="hidden sm:inline">{t('dashboard.logout')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full h-auto p-1 bg-muted/50 ${isAdmin ? 'grid-cols-3' : 'grid-cols-6'}`}>
            {!isAdmin && (
              <TabsTrigger
                value="poll"
                className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
              >
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden sm:inline">{t('dashboard.daily_report')}</span>
                <span className="sm:hidden">{t('dashboard.daily_report').split(' ')[0]}</span>
              </TabsTrigger>
            )}
            {!isAdmin && (
              <TabsTrigger
                value="groups"
                className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t('dashboard.my_groups')}</span>
                <span className="sm:hidden">{t('dashboard.my_groups').split(' ')[0]}</span>
              </TabsTrigger>
            )}
            {!isAdmin && (
              <TabsTrigger
                value="availability"
                className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
              >
                <CalendarOff className="h-4 w-4" />
                <span className="hidden sm:inline">{t('dashboard.availability')}</span>
                <span className="sm:hidden">{t('dashboard.availability').split(' ')[0]}</span>
              </TabsTrigger>
            )}
            {!isAdmin && (
              <TabsTrigger
                value="email"
                className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">{t('dashboard.send_email')}</span>
                <span className="sm:hidden">{t('dashboard.send_email').split(' ')[0]}</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="issues"
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{t('dashboard.issues')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
            >
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dashboard.my_account')}</span>
              <span className="sm:hidden">{t('dashboard.my_account').split(' ')[0]}</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="admin"
                className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
              >
                <Settings className="h-4 w-4" />
                <span>{t('dashboard.admin_panel')}</span>
              </TabsTrigger>
            )}
          </TabsList>

          {!isAdmin && (
            <TabsContent value="poll" className="animate-fade-in">
              <DailyPoll />
            </TabsContent>
          )}

          {!isAdmin && (
            <TabsContent value="groups" className="animate-fade-in">
              <GuideGroups />
            </TabsContent>
          )}

          {!isAdmin && (
            <TabsContent value="availability" className="animate-fade-in">
              <GuideAvailability />
            </TabsContent>
          )}

          {!isAdmin && (
            <TabsContent value="email" className="animate-fade-in">
              <EmailForm />
            </TabsContent>
          )}

          <TabsContent value="issues" className="animate-fade-in">
            <IssueReporting />
          </TabsContent>

          <TabsContent value="account" className="animate-fade-in">
            <MyAccount />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="animate-fade-in">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
