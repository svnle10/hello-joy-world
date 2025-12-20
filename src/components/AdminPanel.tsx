import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSheetsLogger, formatTimeOnly } from '@/hooks/useSheetsLogger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, UserPlus, Users, BarChart3, Trash2, Pencil, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import SheetsWebhookSettings from './SheetsWebhookSettings';

interface Guide {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  webhook_url: string | null;
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
  const { logDeleteToSheets } = useSheetsLogger();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [deletingReport, setDeletingReport] = useState<string | null>(null);
  
  // New guide form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newWebhook, setNewWebhook] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Edit guide form
  const [editName, setEditName] = useState('');
  const [editWebhook, setEditWebhook] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-guide', {
        body: {
          email: newEmail,
          password: newPassword,
          full_name: newName,
          webhook_url: newWebhook || null,
        },
      });

      if (error) throw error;

      toast.success('تم إنشاء المرشد بنجاح');
      setIsDialogOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewWebhook('');
      fetchData();
    } catch (error: any) {
      console.error('Error creating guide:', error);
      toast.error(error.message || 'حدث خطأ في إنشاء المرشد');
    } finally {
      setCreating(false);
    }
  };

  const handleEditGuide = (guide: Guide) => {
    setSelectedGuide(guide);
    setEditName(guide.full_name);
    setEditWebhook(guide.webhook_url || '');
    setEditPhone(guide.phone || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGuide || !editName) {
      toast.error('يرجى ملء الاسم');
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName,
          webhook_url: editWebhook || null,
          phone: editPhone || null,
        })
        .eq('id', selectedGuide.id);

      if (error) throw error;

      toast.success('تم تحديث بيانات المرشد');
      setIsEditDialogOpen(false);
      setSelectedGuide(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating guide:', error);
      toast.error(error.message || 'حدث خطأ في تحديث البيانات');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteGuide = async (guide: Guide) => {
    setDeleting(guide.id);

    try {
      const { error } = await supabase.functions.invoke('create-guide', {
        body: {
          action: 'delete',
          user_id: guide.user_id,
        },
      });

      if (error) throw error;

      toast.success('تم حذف المرشد بنجاح');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting guide:', error);
      toast.error(error.message || 'حدث خطأ في حذف المرشد');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteReport = async (report: Report) => {
    setDeletingReport(report.id);

    try {
      // Delete from database
      const { error: deleteError } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', report.id);

      if (deleteError) throw deleteError;

      const now = new Date();
      const timeOnly = formatTimeOnly(now);
      const guideName = (report.profiles as any)?.full_name || 'غير معروف';
      const activityName = (report.activity_options as any)?.name_ar || 'غير معروف';

      // Log deletion to Google Sheets
      logDeleteToSheets({
        '#Date': now.toISOString().split('T')[0],
        '#Operation_Time': timeOnly,
        '#Guide': guideName,
        '#Activity': `حذف من الإدارة: ${activityName}`,
      });

      // Update local state
      setReports(prev => prev.filter(r => r.id !== report.id));
      toast.success('تم حذف التقرير بنجاح');
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast.error(error.message || 'حدث خطأ في حذف التقرير');
    } finally {
      setDeletingReport(null);
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
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="guides" className="flex items-center gap-2 py-2 font-arabic">
            <Users className="h-4 w-4" />
            المرشدين
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 py-2 font-arabic">
            <BarChart3 className="h-4 w-4" />
            التقارير
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 py-2 font-arabic">
            <Settings className="h-4 w-4" />
            الإعدادات
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
                      <Label className="font-arabic">الاسم الكامل *</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="محمد أحمد"
                        className="font-arabic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-arabic">البريد الإلكتروني *</Label>
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="guide@gmail.com"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-arabic">كلمة المرور *</Label>
                      <Input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="كلمة مرور مؤقتة"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-arabic">رابط Webhook (اختياري)</Label>
                      <Input
                        type="url"
                        value={newWebhook}
                        onChange={(e) => setNewWebhook(e.target.value)}
                        placeholder="https://n8n.example.com/form/..."
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
                    <TableHead className="text-right font-arabic">الهاتف</TableHead>
                    <TableHead className="text-right font-arabic">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-right font-arabic">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guides.map((guide) => (
                    <TableRow key={guide.id}>
                      <TableCell className="font-arabic font-medium">{guide.full_name}</TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">
                        {guide.phone || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(guide.created_at), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditGuide(guide)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                disabled={deleting === guide.id}
                              >
                                {deleting === guide.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-arabic">حذف المرشد</AlertDialogTitle>
                                <AlertDialogDescription className="font-arabic">
                                  هل أنت متأكد من حذف "{guide.full_name}"؟ لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse gap-2">
                                <AlertDialogCancel className="font-arabic">إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteGuide(guide)}
                                  className="bg-destructive hover:bg-destructive/90 font-arabic"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {guides.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground font-arabic py-8">
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
                    <TableHead className="text-right font-arabic">الإجراءات</TableHead>
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
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              disabled={deletingReport === report.id}
                            >
                              {deletingReport === report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-arabic">حذف التقرير</AlertDialogTitle>
                              <AlertDialogDescription className="font-arabic">
                                هل أنت متأكد من حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse gap-2">
                              <AlertDialogCancel className="font-arabic">إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteReport(report)}
                                className="bg-destructive hover:bg-destructive/90 font-arabic"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground font-arabic py-8">
                        لا توجد تقارير حالياً
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-4">
            <SheetsWebhookSettings />
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-arabic">تعديل بيانات المرشد</DialogTitle>
            <DialogDescription className="font-arabic">
              تعديل بيانات "{selectedGuide?.full_name}"
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateGuide} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-arabic">الاسم الكامل</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="font-arabic"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-arabic">رقم الهاتف</Label>
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+212 600 000 000"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-arabic">رابط Webhook</Label>
              <Input
                type="url"
                value={editWebhook}
                onChange={(e) => setEditWebhook(e.target.value)}
                placeholder="https://n8n.example.com/form/..."
                dir="ltr"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updating} className="gradient-sunset font-arabic">
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'حفظ التغييرات'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
