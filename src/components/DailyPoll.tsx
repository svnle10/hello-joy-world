import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSheetsLogger } from '@/hooks/useSheetsLogger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Circle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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
  const { logToSheets } = useSheetsLogger();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completedActivities, setCompletedActivities] = useState<CompletedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayArabic = format(new Date(), 'dd/MM/yyyy', { locale: ar });

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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleActivityClick = async (activity: Activity) => {
    if (!user) return;

    const isCompleted = completedActivities.some(c => c.activity_id === activity.id);
    
    if (isCompleted) {
      toast.info('تم تسجيل هذا النشاط مسبقاً اليوم');
      return;
    }

    setSubmitting(activity.id);

    try {
      const completedAt = new Date().toISOString();

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

      // Log to Google Sheets via n8n
      logToSheets({
        '#Date': today,
        '#Operation_Time': completedAt,
        '#Guide': user.email || '',
        '#Activity': `${activity.name_ar} (${activity.name})`,
      });

      // Update local state
      setCompletedActivities(prev => [
        ...prev,
        { activity_id: activity.id, completed_at: completedAt }
      ]);

      toast.success(`✅ ${activity.name_ar}`);
    } catch (error) {
      console.error('Error submitting activity:', error);
      toast.error('حدث خطأ في التسجيل');
    } finally {
      setSubmitting(null);
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
    <Card className="max-w-lg mx-auto border-primary/20 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-2xl">📋</span>
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-xl font-bold font-arabic flex items-center justify-center gap-2">
          <span>التقرير اليومي</span>
          <span className="text-success">✅</span>
        </CardTitle>
        <CardDescription className="font-arabic text-base">
          نشاط {todayArabic}
        </CardDescription>
        <p className="text-xs text-muted-foreground font-arabic mt-1">
          اختر نشاط واحد أو أكثر
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity, index) => {
          const isCompleted = completedActivities.some(c => c.activity_id === activity.id);
          const completedTime = getCompletedTime(activity.id);
          const isSubmitting = submitting === activity.id;

          return (
            <Button
              key={activity.id}
              variant="ghost"
              className={`w-full justify-start h-auto p-4 transition-all duration-300 ${
                isCompleted
                  ? 'bg-success/10 border-2 border-success/30 hover:bg-success/15'
                  : 'bg-muted/50 border-2 border-transparent hover:bg-muted hover:border-primary/30'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleActivityClick(activity)}
              disabled={isSubmitting || isCompleted}
            >
              <div className="flex items-center gap-3 w-full">
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0 animate-check-bounce" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                
                <span className="text-xl shrink-0">{activity.emoji}</span>
                
                <div className="flex-1 text-right">
                  <p className={`font-arabic text-sm ${isCompleted ? 'text-success font-medium' : 'text-foreground'}`}>
                    {activity.name_ar}
                  </p>
                  {isCompleted && completedTime && (
                    <p className="text-xs text-success/80 font-arabic mt-0.5">
                      ⏰ {completedTime}
                    </p>
                  )}
                </div>

                {!isCompleted && (
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
          <div className="flex items-center justify-between text-sm font-arabic">
            <span className="text-muted-foreground">التقدم</span>
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
  );
}