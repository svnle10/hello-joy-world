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
        profiles: { full_name: guideMap.get(r.guide_id) || 'Unknown' }
      }));
      
      setReports(enrichedReports as Report[]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail || !newPassword || !newName) {
      toast.error('Please fill in all required fields');
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

      toast.success('Guide created successfully');
      setIsDialogOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewWebhook('');
      fetchData();
    } catch (error: any) {
      console.error('Error creating guide:', error);
      toast.error(error.message || 'Error creating guide');
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
      toast.error('Please fill in the name');
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

      toast.success('Guide updated successfully');
      setIsEditDialogOpen(false);
      setSelectedGuide(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating guide:', error);
      toast.error(error.message || 'Error updating guide');
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

      toast.success('Guide deleted successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting guide:', error);
      toast.error(error.message || 'Error deleting guide');
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
      const guideName = (report.profiles as any)?.full_name || 'Unknown';
      const activityName = (report.activity_options as any)?.name_ar || 'Unknown';

      // Log deletion to Google Sheets
      logDeleteToSheets({
        '#Date': now.toISOString().split('T')[0],
        '#Operation_Time': timeOnly,
        '#Guide': guideName,
        '#Activity': `Admin Delete: ${activityName}`,
      });

      // Update local state
      setReports(prev => prev.filter(r => r.id !== report.id));
      toast.success('Report deleted successfully');
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast.error(error.message || 'Error deleting report');
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
          <TabsTrigger value="guides" className="flex items-center gap-2 py-2">
            <Users className="h-4 w-4" />
            Guides
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 py-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 py-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Guides Tab */}
        <TabsContent value="guides">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tour Guides</CardTitle>
                <CardDescription>
                  Manage guide accounts
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-sunset">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Guide
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Guide</DialogTitle>
                    <DialogDescription>
                      Enter the new guide's information
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateGuide} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="guide@gmail.com"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <Input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Temporary password"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook URL (optional)</Label>
                      <Input
                        type="url"
                        value={newWebhook}
                        onChange={(e) => setNewWebhook(e.target.value)}
                        placeholder="https://n8n.example.com/form/..."
                        dir="ltr"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={creating} className="gradient-sunset">
                        {creating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Create Account'
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
                    <TableHead className="text-left">Name</TableHead>
                    <TableHead className="text-left">Phone</TableHead>
                    <TableHead className="text-left">Created</TableHead>
                    <TableHead className="text-left">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guides.map((guide) => (
                    <TableRow key={guide.id}>
                      <TableCell className="font-medium">{guide.full_name}</TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">
                        {guide.phone || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(guide.created_at), 'dd/MM/yyyy')}
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
                                <AlertDialogTitle>Delete Guide</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{guide.full_name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteGuide(guide)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
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
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No guides yet
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
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Last 50 recorded activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Guide</TableHead>
                    <TableHead className="text-left">Activity</TableHead>
                    <TableHead className="text-left">Time</TableHead>
                    <TableHead className="text-left">Date</TableHead>
                    <TableHead className="text-left">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        {(report.profiles as any)?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
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
                              <AlertDialogTitle>Delete Report</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this report? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteReport(report)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No reports yet
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
            <DialogTitle>Edit Guide</DialogTitle>
            <DialogDescription>
              Edit "{selectedGuide?.full_name}"
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateGuide} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+1 234 567 890"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                type="url"
                value={editWebhook}
                onChange={(e) => setEditWebhook(e.target.value)}
                placeholder="https://n8n.example.com/form/..."
                dir="ltr"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updating} className="gradient-sunset">
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
