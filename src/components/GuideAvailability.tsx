import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Trash2, CalendarOff, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnavailabilityRecord {
  id: string;
  unavailable_date: string;
  reason: string;
  created_at: string;
  status: string;
  admin_notes?: string;
}

export default function GuideAvailability() {
  const { user } = useAuth();
  const [records, setRecords] = useState<UnavailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const fetchRecordsCallback = useCallback(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  useEffect(() => {
    fetchRecordsCallback();
  }, [fetchRecordsCallback]);

  // Subscribe to realtime updates for guide_unavailability
  useRealtimeSubscription({
    tables: ['guide_unavailability'],
    onDataChange: fetchRecordsCallback,
  });

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('guide_unavailability')
        .select('id, unavailable_date, reason, created_at, status, admin_notes')
        .eq('guide_id', user?.id)
        .order('unavailable_date', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching unavailability records:', error);
      toast.error('Failed to load availability records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    // Validate reason is in English (basic check for Latin characters)
    const englishPattern = /^[a-zA-Z0-9\s.,!?'"-]+$/;
    if (!englishPattern.test(reason.trim())) {
      toast.error('Please write the reason in English only');
      return;
    }

    setSubmitting(true);

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Check if date already exists
      const existingRecord = records.find(r => r.unavailable_date === formattedDate);
      if (existingRecord) {
        toast.error('You have already marked this date as unavailable');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('guide_unavailability')
        .insert({
          guide_id: user?.id,
          unavailable_date: formattedDate,
          reason: reason.trim()
        });

      if (error) throw error;

      toast.success('Unavailability recorded successfully');
      setSelectedDate(undefined);
      setReason('');
      fetchRecords();
    } catch (error: any) {
      console.error('Error saving unavailability:', error);
      toast.error('Failed to save unavailability record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('guide_unavailability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Record deleted successfully');
      fetchRecords();
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  // Filter to show only future dates
  const futureRecords = records.filter(r => new Date(r.unavailable_date) >= new Date(new Date().setHours(0, 0, 0, 0)));
  const pastRecords = records.filter(r => new Date(r.unavailable_date) < new Date(new Date().setHours(0, 0, 0, 0)));

  if (loading) {
    return (
      <Card className="border-border/50 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Unavailability */}
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="gradient-desert rounded-t-lg">
          <CardTitle className="text-primary-foreground flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Mark Unavailable Day
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Select Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setIsCalendarOpen(false);
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason (English only)</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Personal vacation, Medical appointment, Family event..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[80px] resize-none"
                  maxLength={200}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={submitting || !selectedDate || !reason.trim()}
              className="w-full sm:w-auto gradient-sunset hover:opacity-90"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Unavailable Day
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Upcoming Unavailable Days */}
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-destructive" />
            Upcoming Unavailable Days ({futureRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {futureRecords.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No upcoming unavailable days marked
            </p>
          ) : (
            <div className="space-y-3">
              {futureRecords.map((record) => (
                <div
                  key={record.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    record.status === 'pending' && "bg-yellow-500/10 border-yellow-500/50",
                    record.status === 'approved' && "bg-green-500/10 border-green-500/50",
                    record.status === 'rejected' && "bg-red-500/10 border-red-500/50"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {format(new Date(record.unavailable_date), 'EEEE, MMMM d, yyyy')}
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        record.status === 'pending' && "bg-yellow-500/20 text-yellow-700",
                        record.status === 'approved' && "bg-green-500/20 text-green-700",
                        record.status === 'rejected' && "bg-red-500/20 text-red-700"
                      )}>
                        {record.status === 'pending' ? '⏳ Pending' : 
                         record.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {record.reason}
                    </div>
                    {record.status === 'rejected' && record.admin_notes && (
                      <div className="text-sm text-red-600 mt-1">
                        Rejection reason: {record.admin_notes}
                      </div>
                    )}
                  </div>
                  {record.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(record.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Records (Collapsed) */}
      {pastRecords.length > 0 && (
        <Card className="border-border/50 shadow-lg opacity-60">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Past Unavailable Days ({pastRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastRecords.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2 bg-muted/20 rounded-lg text-sm"
                >
                  <div>
                    <span className="text-muted-foreground">
                      {format(new Date(record.unavailable_date), 'MMM d, yyyy')}
                    </span>
                    <span className="mx-2">-</span>
                    <span className="text-muted-foreground">{record.reason}</span>
                  </div>
                </div>
              ))}
              {pastRecords.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{pastRecords.length - 5} more past records
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
