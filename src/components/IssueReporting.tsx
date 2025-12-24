import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Image, Video, X, AlertTriangle, FileText, UserX, CalendarClock } from 'lucide-react';

type IssueType = 'problem' | 'no_show' | 'postponement';

interface Issue {
  id: string;
  booking_reference: string;
  description: string;
  issue_type: IssueType;
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

const ISSUE_TYPE_CONFIG: Record<IssueType, { label: string; icon: React.ReactNode; color: string }> = {
  problem: { 
    label: 'Problem', 
    icon: <AlertTriangle className="h-4 w-4" />, 
    color: 'bg-destructive/10 text-destructive' 
  },
  no_show: { 
    label: 'No Show', 
    icon: <UserX className="h-4 w-4" />, 
    color: 'bg-orange-500/10 text-orange-600' 
  },
  postponement: { 
    label: 'Postponement', 
    icon: <CalendarClock className="h-4 w-4" />, 
    color: 'bg-blue-500/10 text-blue-600' 
  }
};

export default function IssueReporting() {
  const { user, isAdmin } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingReference, setBookingReference] = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState<IssueType>('problem');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deleteIssueId, setDeleteIssueId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | IssueType>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchIssues();
  }, [user, isAdmin]);

  const fetchIssues = async () => {
    if (!user) return;

    try {
      const { data: issuesData, error: issuesError } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (issuesError) throw issuesError;

      const issueIds = issuesData?.map(i => i.id) || [];
      const { data: attachmentsData } = await supabase
        .from('issue_attachments')
        .select('*')
        .in('issue_id', issueIds);

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

      setIssues(issuesWithDetails as Issue[]);
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isSmallEnough = file.size <= 50 * 1024 * 1024;
      if (!isValid) {
        toast.error(`${file.name} - Unsupported file type`);
      }
      if (!isSmallEnough) {
        toast.error(`${file.name} - File too large (max 50MB)`);
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
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .insert({
          guide_id: user.id,
          booking_reference: bookingReference.trim(),
          description: description.trim(),
          issue_type: issueType
        })
        .select()
        .single();

      if (issueError) throw issueError;

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

      toast.success('Issue reported successfully');
      setBookingReference('');
      setDescription('');
      setIssueType('problem');
      setSelectedFiles([]);
      setShowForm(false);
      fetchIssues();
    } catch (error) {
      console.error('Error creating issue:', error);
      toast.error('Failed to report issue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!deleteIssueId) return;

    try {
      const { data: attachments } = await supabase
        .from('issue_attachments')
        .select('file_path')
        .eq('issue_id', deleteIssueId);

      if (attachments && attachments.length > 0) {
        await supabase.storage
          .from('issue-files')
          .remove(attachments.map(a => a.file_path));
      }

      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', deleteIssueId);

      if (error) throw error;

      toast.success('Issue deleted');
      setIssues(prev => prev.filter(i => i.id !== deleteIssueId));
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error('Failed to delete issue');
    } finally {
      setDeleteIssueId(null);
    }
  };

  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const generateSignedUrls = async () => {
      const allAttachments = issues.flatMap(i => i.attachments || []);
      const newUrls = new Map<string, string>();
      
      for (const attachment of allAttachments) {
        if (!signedUrls.has(attachment.file_path)) {
          const { data, error } = await supabase.storage
            .from('issue-files')
            .createSignedUrl(attachment.file_path, 3600);
          
          if (data?.signedUrl) {
            newUrls.set(attachment.file_path, data.signedUrl);
          }
        }
      }
      
      if (newUrls.size > 0) {
        setSignedUrls(prev => new Map([...prev, ...newUrls]));
      }
    };
    
    if (issues.length > 0) {
      generateSignedUrls();
    }
  }, [issues]);

  const getFileUrl = (filePath: string) => {
    return signedUrls.get(filePath) || '';
  };

  const filteredIssues = activeTab === 'all' 
    ? issues 
    : issues.filter(issue => issue.issue_type === activeTab);

  const getCounts = () => ({
    all: issues.length,
    problem: issues.filter(i => i.issue_type === 'problem').length,
    no_show: issues.filter(i => i.issue_type === 'no_show').length,
    postponement: issues.filter(i => i.issue_type === 'postponement').length
  });

  const counts = getCounts();

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
          <FileText className="h-5 w-5 text-primary" />
          Issue Reports
        </h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gradient-desert">
            <Plus className="h-4 w-4 mr-2" />
            Add Report
          </Button>
        )}
      </div>

      {/* New Issue Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report New Issue</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="issueType">Issue Type *</Label>
                <Select value={issueType} onValueChange={(value: IssueType) => setIssueType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="problem">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Problem
                      </div>
                    </SelectItem>
                    <SelectItem value="no_show">
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-orange-600" />
                        No Show
                      </div>
                    </SelectItem>
                    <SelectItem value="postponement">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-blue-600" />
                        Postponement
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookingReference">Booking Reference *</Label>
                <Input
                  id="bookingReference"
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value)}
                  placeholder="e.g., GYG-123456"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Attachments (Images/Videos)</Label>
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
                    <Plus className="h-4 w-4 mr-1" />
                    Add File
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
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Report'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setBookingReference('');
                    setDescription('');
                    setIssueType('problem');
                    setSelectedFiles([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | IssueType)}>
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="all" className="py-2">
            <span className="flex items-center gap-1">
              All
              <span className="bg-muted-foreground/20 text-xs px-1.5 rounded-full">{counts.all}</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="problem" className="py-2">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="hidden sm:inline">Problems</span>
              <span className="bg-destructive/20 text-xs px-1.5 rounded-full">{counts.problem}</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="no_show" className="py-2">
            <span className="flex items-center gap-1">
              <UserX className="h-3 w-3" />
              <span className="hidden sm:inline">No Shows</span>
              <span className="bg-orange-500/20 text-xs px-1.5 rounded-full">{counts.no_show}</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="postponement" className="py-2">
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              <span className="hidden sm:inline">Postponed</span>
              <span className="bg-blue-500/20 text-xs px-1.5 rounded-full">{counts.postponement}</span>
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No issues reported</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => {
            const typeConfig = ISSUE_TYPE_CONFIG[issue.issue_type] || ISSUE_TYPE_CONFIG.problem;
            return (
              <Card key={issue.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-sm font-medium flex items-center gap-1 ${typeConfig.color}`}>
                          {typeConfig.icon}
                          {typeConfig.label}
                        </span>
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
                        {new Date(issue.created_at).toLocaleDateString('en-US', {
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
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteIssueId} onOpenChange={() => setDeleteIssueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Issue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this issue? All attachments will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIssue} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
