import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, Check, X, Trash2, MessageSquare, Calendar, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VacationRequest {
  id: string;
  guide_id: string;
  unavailable_date: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  responded_at: string | null;
  responded_by: string | null;
  guide_name?: string;
}

export default function VacationRequestsManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [responseAction, setResponseAction] = useState<'approved' | 'rejected'>('approved');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      // Fetch all unavailability requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('guide_unavailability')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch guide names
      const guideIds = [...new Set((requestsData || []).map(r => r.guide_id))];
      const { data: guidesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', guideIds);

      const guideMap = new Map((guidesData || []).map(g => [g.user_id, g.full_name]));

      const enrichedRequests = (requestsData || []).map(r => ({
        ...r,
        guide_name: guideMap.get(r.guide_id) || 'Unknown'
      }));

      setRequests(enrichedRequests);
    } catch (error: any) {
      console.error('Error fetching vacation requests:', error);
      toast.error('Failed to load vacation requests');
    } finally {
      setLoading(false);
    }
  };

  const openResponseDialog = (request: VacationRequest, action: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setResponseAction(action);
    setAdminNotes(request.admin_notes || '');
    setResponseDialogOpen(true);
  };

  const handleResponse = async () => {
    if (!selectedRequest || !user) return;

    setProcessingId(selectedRequest.id);

    try {
      const { error } = await supabase
        .from('guide_unavailability')
        .update({
          status: responseAction,
          admin_notes: adminNotes.trim() || null,
          responded_by: user.id,
          responded_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success(`Request ${responseAction === 'approved' ? 'approved' : 'rejected'} successfully`);
      setResponseDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error responding to request:', error);
      toast.error('Failed to respond to request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setProcessingId(id);

    try {
      const { error } = await supabase
        .from('guide_unavailability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Request deleted successfully');
      fetchRequests();
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/50">⏳ Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/50">✓ Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/50">✗ Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Vacation Requests
            </CardTitle>
            <CardDescription>
              Manage guide vacation and unavailability requests
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
              className={cn(filter === 'pending' && 'gradient-sunset')}
            >
              Pending ({pendingCount})
            </Button>
            <Button
              variant={filter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('approved')}
            >
              Approved ({approvedCount})
            </Button>
            <Button
              variant={filter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('rejected')}
            >
              Rejected ({rejectedCount})
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({requests.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No {filter === 'all' ? '' : filter} vacation requests found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guide</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Admin Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{request.guide_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(request.unavailable_date), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={request.reason}>
                      {request.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(request.created_at), 'MMM d, HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={request.admin_notes || ''}>
                      {request.admin_notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openResponseDialog(request, 'approved')}
                              disabled={processingId === request.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openResponseDialog(request, 'rejected')}
                              disabled={processingId === request.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {request.status !== 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openResponseDialog(request, request.status as 'approved' | 'rejected')}
                            disabled={processingId === request.id}
                            className="text-muted-foreground hover:text-foreground"
                            title="Edit Response"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={processingId === request.id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete"
                            >
                              {processingId === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Request</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this vacation request from {request.guide_name}?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(request.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseAction === 'approved' ? '✓ Approve' : '✗ Reject'} Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <div className="mt-2 space-y-1">
                  <p><strong>Guide:</strong> {selectedRequest.guide_name}</p>
                  <p><strong>Date:</strong> {format(new Date(selectedRequest.unavailable_date), 'EEEE, MMMM d, yyyy')}</p>
                  <p><strong>Reason:</strong> {selectedRequest.reason}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Notes (optional)</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={responseAction === 'rejected' 
                  ? "Explain why this request is rejected..."
                  : "Add any notes for the guide..."
                }
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResponse}
              disabled={processingId !== null}
              className={responseAction === 'approved' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {processingId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : responseAction === 'approved' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {responseAction === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
