import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Image, Video, X, AlertTriangle, FileText } from 'lucide-react';

interface Issue {
  id: string;
  booking_reference: string;
  description: string;
  created_at: string;
  guide_id: string;
  guide_name?: string;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
}

export default function IssueReporting() {
  const { user, isAdmin } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingReference, setBookingReference] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deleteIssueId, setDeleteIssueId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchIssues();
  }, [user, isAdmin]);

  const fetchIssues = async () => {
    if (!user) return;

    try {
      // Fetch issues
      const { data: issuesData, error: issuesError } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (issuesError) throw issuesError;

      // Fetch attachments for all issues
      const issueIds = issuesData?.map(i => i.id) || [];
      const { data: attachmentsData } = await supabase
        .from('issue_attachments')
        .select('*')
        .in('issue_id', issueIds);

      // If admin, fetch guide names
      let issuesWithDetails = issuesData || [];
      if (isAdmin && issuesData && issuesData.length > 0) {
        const guideIds = [...new Set(issuesData.map(i => i.guide_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', guideIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]));
        issuesWithDetails = issuesData.map(issue => ({
          ...issue,
          guide_name: profileMap.get(issue.guide_id) || 'Unknown',
          attachments: attachmentsData?.filter(a => a.issue_id === issue.id) || []
        }));
      } else {
        issuesWithDetails = (issuesData || []).map(issue => ({
          ...issue,
          attachments: attachmentsData?.filter(a => a.issue_id === issue.id) || []
        }));
      }

      setIssues(issuesWithDetails);
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error('فشل في تحميل المشاكل');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isSmallEnough = file.size <= 50 * 1024 * 1024; // 50MB
      if (!isValid) {
        toast.error(`${file.name} - نوع ملف غير مدعوم`);
      }
      if (!isSmallEnough) {
        toast.error(`${file.name} - حجم الملف كبير جداً (الحد الأقصى 50MB)`);
      }
      return isValid && isSmallEnough;
    });
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!bookingReference.trim() || !description.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);

    try {
      // Create issue
      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .insert({
          guide_id: user.id,
          booking_reference: bookingReference.trim(),
          description: description.trim()
        })
        .select()
        .single();

      if (issueError) throw issueError;

      // Upload files if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const filePath = `${user.id}/${issue.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('issue-files')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          // Save attachment record
          await supabase
            .from('issue_attachments')
            .insert({
              issue_id: issue.id,
              file_path: filePath,
              file_name: file.name,
              file_type: file.type
            });
        }
      }

      toast.success('تم تسجيل المشكلة بنجاح');
      setBookingReference('');
      setDescription('');
      setSelectedFiles([]);
      setShowForm(false);
      fetchIssues();
    } catch (error) {
      console.error('Error creating issue:', error);
      toast.error('فشل في تسجيل المشكلة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!deleteIssueId) return;

    try {
      // Get attachments to delete from storage
      const { data: attachments } = await supabase
        .from('issue_attachments')
        .select('file_path')
        .eq('issue_id', deleteIssueId);

      // Delete files from storage
      if (attachments && attachments.length > 0) {
        await supabase.storage
          .from('issue-files')
          .remove(attachments.map(a => a.file_path));
      }

      // Delete issue (cascade will delete attachments)
      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', deleteIssueId);

      if (error) throw error;

      toast.success('تم حذف المشكلة');
      setIssues(prev => prev.filter(i => i.id !== deleteIssueId));
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error('فشل في حذف المشكلة');
    } finally {
      setDeleteIssueId(null);
    }
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('issue-files').getPublicUrl(filePath);
    return data.publicUrl;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          توثيق المشاكل
        </h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gradient-desert">
            <Plus className="h-4 w-4 ml-2" />
            إضافة مشكلة
          </Button>
        )}
      </div>

      {/* New Issue Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تسجيل مشكلة جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bookingReference">Booking Reference *</Label>
                <Input
                  id="bookingReference"
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value)}
                  placeholder="مثال: GYG-123456"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف المشكلة *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب وصفاً تفصيلياً للمشكلة..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>المرفقات (صور/فيديوهات)</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative bg-muted rounded-lg p-2 flex items-center gap-2"
                    >
                      {file.type.startsWith('image/') ? (
                        <Image className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate max-w-[120px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة ملف
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={submitting} className="gradient-desert">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    'حفظ المشكلة'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setBookingReference('');
                    setDescription('');
                    setSelectedFiles([]);
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Issues List */}
      {issues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد مشاكل مسجلة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <Card key={issue.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                        {issue.booking_reference}
                      </span>
                      {isAdmin && issue.guide_name && (
                        <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-sm">
                          {issue.guide_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(issue.created_at).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {(issue.guide_id === user?.id || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteIssueId(issue.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <p className="text-foreground whitespace-pre-wrap mb-4">
                  {issue.description}
                </p>

                {issue.attachments && issue.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {issue.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={getFileUrl(attachment.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group"
                      >
                        {attachment.file_type.startsWith('image/') ? (
                          <img
                            src={getFileUrl(attachment.file_path)}
                            alt={attachment.file_name}
                            className="w-20 h-20 object-cover rounded-lg border hover:border-primary transition-colors"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-muted rounded-lg border flex items-center justify-center hover:border-primary transition-colors">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteIssueId} onOpenChange={() => setDeleteIssueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المشكلة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه المشكلة؟ سيتم حذف جميع المرفقات أيضاً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIssue} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
