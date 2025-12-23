import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, ClipboardCheck, LogOut, Settings, Loader2, AlertTriangle } from 'lucide-react';
import EmailForm from '@/components/EmailForm';
import DailyPoll from '@/components/DailyPoll';
import AdminPanel from '@/components/AdminPanel';
import IssueReporting from '@/components/IssueReporting';

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
                <h1 className="text-lg font-bold text-primary-foreground">
                  Sun Sky Camp
                </h1>
                <p className="text-xs text-primary-foreground/80">
                  Guide Dashboard
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4 h-auto p-1 bg-muted/50">
            <TabsTrigger
              value="poll"
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Daily Report</span>
              <span className="sm:hidden">Report</span>
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Send Email</span>
              <span className="sm:hidden">Email</span>
            </TabsTrigger>
            <TabsTrigger
              value="issues"
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">المشاكل</span>
              <span className="sm:hidden">مشاكل</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="admin"
                className="flex items-center gap-2 py-3 data-[state=active]:gradient-desert data-[state=active]:text-primary-foreground"
              >
                <Settings className="h-4 w-4" />
                <span>Admin Panel</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="poll" className="animate-fade-in">
            <DailyPoll />
          </TabsContent>

          <TabsContent value="email" className="animate-fade-in">
            <EmailForm />
          </TabsContent>

          <TabsContent value="issues" className="animate-fade-in">
            <IssueReporting />
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