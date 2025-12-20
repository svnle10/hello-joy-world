import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, UserPlus, Users, BarChart3, Trash2, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Guide {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  email?: string;
}

interface Report {
  id: string;
  guide_id: string;
  activity_id: string;
  report_date: string;
  completed_at: string;
  profiles?: { full_name: string };
  activity_options?: { name_ar: string; emoji: string };
}

export default function AdminPanel() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // New guide form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch guides with profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setGuides(profilesData || []);

      // Fetch recent reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('daily_reports')
        .select(`
          *,
          activity_options:activity_id(name_ar, emoji)
        `)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (reportsError) throw reportsError;
      
      // Fetch guide names separately
      const guideIds = [...new Set((reportsData || []).map(r => r.guide_id))];
      const { data: guidesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', guideIds);
      
      const guideMap = new Map((guidesData || []).map(g => [g.user_id, g.full_name]));
      
      const enrichedReports = (reportsData || []).map(r => ({
        ...r,
        profiles: { full_name: guideMap.get(r.guide_id) || 'غير معروف' }
      }));
      
      setReports(enrichedReports as Report[]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail || !newPassword || !newName) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    setCreating(true);

    try {
      // Create user via edge function (to be created)
      const { data, error } = await supabase.functions.invoke('create-guide', {
        body: {
          email: newEmail,
          password: newPassword,
          full_name: newName,
        },
      });

      if (error) throw error;

      toast.success('تم إنشاء المرشد بنجاح');
      setIsDialogOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      fetchData();
    } catch (error: any) {
      console.error('Error creating guide:', error);
      toast.error(error.message || 'حدث خطأ في إنشاء المرشد');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="guides" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1">
          <TabsTrigger value="guides" className="flex items-center gap-2 py-2 font-arabic">
            <Users className="h-4 w-4" />
            المرشدين
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 py-2 font-arabic">
            <BarChart3 className="h-4 w-4" />
            التقارير
          </TabsTrigger>
        </TabsList>

        {/* Guides Tab */}
        <TabsContent value="guides">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-arabic">المرشدين السياحيين</CardTitle>
                <CardDescription className="font-arabic">
                  إدارة حسابات المرشدين
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-sunset font-arabic">
                    <UserPlus className="h-4 w-4 ml-2" />
                    إضافة مرشد
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-arabic">إضافة مرشد جديد</DialogTitle>
                    <DialogDescription className="font-arabic">
                      أدخل بيانات المرشد الجديد
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateGuide} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-arabic">الاسم الكامل</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="محمد أحمد"
                        className="font-arabic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-arabic">البريد الإلكتروني</Label>
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="guide@example.com"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-arabic">كلمة المرور</Label>
                      <Input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="كلمة مرور مؤقتة"
                        dir="ltr"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={creating} className="gradient-sunset font-arabic">
                        {creating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'إنشاء الحساب'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-arabic">الاسم</TableHead>
                    <TableHead className="text-right font-arabic">تاريخ الإنشاء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guides.map((guide) => (
                    <TableRow key={guide.id}>
                      <TableCell className="font-arabic font-medium">{guide.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(guide.created_at), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {guides.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground font-arabic py-8">
                        لا يوجد مرشدين حالياً
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="font-arabic">التقارير الأخيرة</CardTitle>
              <CardDescription className="font-arabic">
                آخر 50 نشاط تم تسجيله
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-arabic">المرشد</TableHead>
                    <TableHead className="text-right font-arabic">النشاط</TableHead>
                    <TableHead className="text-right font-arabic">الوقت</TableHead>
                    <TableHead className="text-right font-arabic">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-arabic">
                        {(report.profiles as any)?.full_name || 'غير معروف'}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2 font-arabic">
                          <span>{(report.activity_options as any)?.emoji}</span>
                          <span>{(report.activity_options as any)?.name_ar}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(report.completed_at), 'HH:mm')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(report.report_date), 'dd/MM/yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground font-arabic py-8">
                        لا توجد تقارير حالياً
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}