import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSheetsLogger, formatTimeOnly } from '@/hooks/useSheetsLogger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Circle, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Activity {
  id: string;
  name: string;
  name_ar: string;
  emoji: string;
  sort_order: number;
}

interface CompletedActivity {
  activity_id: string;
  completed_at: string;
}

export default function DailyPoll() {
  const { user } = useAuth();
  const { logToSheets, logDeleteToSheets } = useSheetsLogger();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completedActivities, setCompletedActivities] = useState<CompletedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [guideName, setGuideName] = useState<string>('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFormatted = format(new Date(), 'dd/MM/yyyy');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activity_options')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch today's completed activities
      const { data: completedData, error: completedError } = await supabase
        .from('daily_reports')
        .select('activity_id, completed_at')
        .eq('guide_id', user.id)
        .eq('report_date', today);

      if (completedError) throw completedError;
      setCompletedActivities(completedData || []);

      // Fetch guide name from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData?.full_name) {
        setGuideName(profileData.full_name);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleActivityClick = async (activity: Activity) => {
    if (!user) return;

    const isCompleted = completedActivities.some(c => c.activity_id === activity.id);
    
    if (isCompleted) {
      // Show delete confirmation
      setActivityToDelete(activity);
      setDeleteDialogOpen(true);
      return;
    }

    setSubmitting(activity.id);

    try {
      const now = new Date();
      const completedAt = now.toISOString();
      const timeOnly = formatTimeOnly(now);

      // Insert into database
      const { error: insertError } = await supabase
        .from('daily_reports')
        .insert({
          guide_id: user.id,
          activity_id: activity.id,
          report_date: today,
          completed_at: completedAt,
        });

      if (insertError) throw insertError;

      // Log to Google Sheets via n8n with guide name and formatted time
      logToSheets({
        '#Date': today,
        '#Operation_Time': timeOnly,
        '#Guide': guideName || user.email || '',
        '#Activity': `${activity.name} (${activity.name_ar})`,
      });

      // Update local state
      setCompletedActivities(prev => [
        ...prev,
        { activity_id: activity.id, completed_at: completedAt }
      ]);

      toast.success(`✅ ${activity.name}`);
    } catch (error) {
      console.error('Error submitting activity:', error);
      toast.error('Error recording activity');
    } finally {
      setSubmitting(null);
    }
  };

  const handleDeleteActivity = async () => {
    if (!user || !activityToDelete) return;

    setDeleting(activityToDelete.id);
    setDeleteDialogOpen(false);

    try {
      const now = new Date();
      const timeOnly = formatTimeOnly(now);

      // Delete from database
      const { error: deleteError } = await supabase
        .from('daily_reports')
        .delete()
        .eq('guide_id', user.id)
        .eq('activity_id', activityToDelete.id)
        .eq('report_date', today);

      if (deleteError) throw deleteError;

      // Log deletion to Google Sheets with matching data for n8n to find and delete
      logDeleteToSheets({
        '#Date': today,
        '#Operation_Time': timeOnly,
        '#Guide': guideName || user.email || '',
        '#Activity': `${activityToDelete.name} (${activityToDelete.name_ar})`,
        '#Action': 'DELETE',
        '#Search_Guide': guideName || user.email || '',
        '#Search_Activity': `${activityToDelete.name} (${activityToDelete.name_ar})`,
        '#Search_Date': today,
      });

      // Update local state
      setCompletedActivities(prev => 
        prev.filter(c => c.activity_id !== activityToDelete.id)
      );

      toast.success(`Cancelled: ${activityToDelete.name}`);
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Error cancelling activity');
    } finally {
      setDeleting(null);
      setActivityToDelete(null);
    }
  };

  const getCompletedTime = (activityId: string) => {
    const completed = completedActivities.find(c => c.activity_id === activityId);
    if (!completed) return null;
    return format(new Date(completed.completed_at), 'HH:mm');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="max-w-lg mx-auto border-primary/20 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">📋</span>
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <span>Daily Report</span>
            <span className="text-success">✅</span>
          </CardTitle>
          <CardDescription className="text-base">
            Activity for {todayFormatted}
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            Click on an activity to record or cancel it
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {activities.map((activity, index) => {
            const isCompleted = completedActivities.some(c => c.activity_id === activity.id);
            const completedTime = getCompletedTime(activity.id);
            const isSubmitting = submitting === activity.id;
            const isDeleting = deleting === activity.id;

            return (
              <Button
                key={activity.id}
                variant="ghost"
                className={`w-full justify-start h-auto p-4 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-success/10 border-2 border-success/30 hover:bg-destructive/10 hover:border-destructive/30'
                    : 'bg-muted/50 border-2 border-transparent hover:bg-muted hover:border-primary/30'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleActivityClick(activity)}
                disabled={isSubmitting || isDeleting}
              >
                <div className="flex items-center gap-3 w-full">
                  {isSubmitting || isDeleting ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0 animate-check-bounce" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  
                  <span className="text-xl shrink-0">{activity.emoji}</span>
                  
                  <div className="flex-1 text-left">
                    <p className={`text-sm ${isCompleted ? 'text-success font-medium' : 'text-foreground'}`}>
                      {activity.name}
                    </p>
                    {isCompleted && completedTime && (
                      <p className="text-xs text-success/80 mt-0.5">
                        ⏰ {completedTime}
                      </p>
                    )}
                  </div>

                  {isCompleted ? (
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  ) : (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      0
                    </span>
                  )}
                </div>
              </Button>
            );
          })}

          {/* Progress indicator */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-primary font-medium">
                {completedActivities.length} / {activities.length}
              </span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full gradient-desert transition-all duration-500"
                style={{
                  width: `${(completedActivities.length / activities.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancel Activity?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to cancel "{activityToDelete?.name}"?
              <br />
              It will be deleted from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteActivity}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
