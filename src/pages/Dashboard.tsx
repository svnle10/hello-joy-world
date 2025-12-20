import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, ClipboardCheck, LogOut, Settings, Loader2 } from 'lucide-react';
import EmailForm from '@/components/EmailForm';
import DailyPoll from '@/components/DailyPoll';
import AdminPanel from '@/components/AdminPanel';

export default function Dashboard() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('poll');

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-desert sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-sunset flex items-center justify-center shadow-md">
                <span className="text-xl">🏜️</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary-foreground font-arabic">
                  Sun Sky Camp
                </h1>
                <p className="text-xs text-primary-foreground/80 font-arabic">
                  لوحة تحكم المرشدين
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4 ml-2" />
              <span className="font-arabic hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 h-auto p-1 bg-muted/50">
            <TabsTrigger
              value="poll"
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground font-arabic"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">التقرير اليومي</span>
              <span className="sm:hidden">التقرير</span>
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground font-arabic"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">إرسال إيميل</span>
              <span className="sm:hidden">إيميل</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="admin"
                className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground font-arabic col-span-2 lg:col-span-1"
              >
                <Settings className="h-4 w-4" />
                <span>لوحة الإدارة</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="poll" className="animate-fade-in">
            <DailyPoll />
          </TabsContent>

          <TabsContent value="email" className="animate-fade-in">
            <EmailForm />
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