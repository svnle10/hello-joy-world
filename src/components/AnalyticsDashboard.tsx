import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, Activity, Mail, TrendingUp, UserX, AlertTriangle, Clock, XCircle, CalendarX, CheckCircle, X, Loader2 } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Stats {
  totalGuides: number;
  totalAdmins: number;
  guidesWorkedToday: number;
  totalEmailsToday: number;
  unavailableGuidesToday: number;
  problemsCount: number;
  postponementsCount: number;
  noShowsCount: number;
  pendingRequests: number;
}

interface ActivityData {
  name: string;
  count: number;
}

interface DailyTrend {
  date: string;
  reports: number;
  emails: number;
}

interface GuideInfo {
  user_id: string;
  full_name: string;
}

interface UnavailableGuide {
  guide_id: string;
  reason: string;
  full_name?: string;
}

interface IssueInfo {
  id: string;
  issue_type: string;
  booking_reference: string;
  description: string;
  guide_name?: string;
  created_at: string;
}

interface PendingRequest {
  id: string;
  guide_id: string;
  unavailable_date: string;
  reason: string;
  created_at: string;
  full_name?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

const AnalyticsDashboard = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    totalGuides: 0,
    totalAdmins: 0,
    guidesWorkedToday: 0,
    totalEmailsToday: 0,
    unavailableGuidesToday: 0,
    problemsCount: 0,
    postponementsCount: 0,
    noShowsCount: 0,
    pendingRequests: 0,
  });
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [guidesNotVoted, setGuidesNotVoted] = useState<GuideInfo[]>([]);
  const [unavailableGuides, setUnavailableGuides] = useState<UnavailableGuide[]>([]);
  const [todayIssues, setTodayIssues] = useState<IssueInfo[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch guides count
      const { count: guidesCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "guide");

      // Fetch admins count
      const { count: adminsCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      // Fetch unique guides who worked today
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: todayReports } = await supabase
        .from("daily_reports")
        .select("guide_id")
        .eq("report_date", today);
      
      const votedGuideIds = new Set((todayReports || []).map(r => r.guide_id));
      const uniqueGuidesToday = votedGuideIds.size;

      // Fetch today's assignments (guides who should work today)
      const { data: todayAssignments } = await supabase
        .from("daily_assignments")
        .select("guide_id, group_number")
        .eq("assignment_date", today);

      const assignedGuideIds = (todayAssignments || []).map(a => a.guide_id);

      // Fetch profiles for assigned guides
      const { data: guideProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", assignedGuideIds.length > 0 ? assignedGuideIds : ['none']);

      // Filter assigned guides who haven't voted today
      const notVotedGuides = (guideProfiles || []).filter(
        g => !votedGuideIds.has(g.user_id)
      );
      setGuidesNotVoted(notVotedGuides);

      // Fetch today's emails
      const todayStart = startOfDay(new Date()).toISOString();
      const { count: emailsToday } = await supabase
        .from("email_logs")
        .select("*", { count: "exact", head: true })
        .gte("sent_at", todayStart);

      // Fetch unavailable guides for today (only approved)
      const { data: unavailableData } = await supabase
        .from("guide_unavailability")
        .select("guide_id, reason, status")
        .eq("unavailable_date", today)
        .eq("status", "approved");

      // Get profiles for unavailable guides
      const unavailableGuideIds = (unavailableData || []).map(u => u.guide_id);
      const { data: unavailableProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", unavailableGuideIds.length > 0 ? unavailableGuideIds : ['none']);

      const unavailableWithNames = (unavailableData || []).map(u => ({
        ...u,
        full_name: unavailableProfiles?.find(p => p.user_id === u.guide_id)?.full_name || 'Unknown'
      }));
      setUnavailableGuides(unavailableWithNames);

      // Fetch pending leave requests
      const { data: pendingData } = await supabase
        .from("guide_unavailability")
        .select("id, guide_id, unavailable_date, reason, created_at")
        .eq("status", "pending")
        .order("unavailable_date", { ascending: true });

      // Get profiles for pending requests
      const pendingGuideIds = (pendingData || []).map(p => p.guide_id);
      const { data: pendingProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", pendingGuideIds.length > 0 ? pendingGuideIds : ['none']);

      const pendingWithNames: PendingRequest[] = (pendingData || []).map(p => ({
        ...p,
        full_name: pendingProfiles?.find(profile => profile.user_id === p.guide_id)?.full_name || 'Unknown'
      }));
      setPendingRequests(pendingWithNames);

      // Fetch today's issues (problems, no-shows, postponements)
      const { data: issuesData } = await supabase
        .from("issues")
        .select("id, issue_type, booking_reference, description, guide_id, created_at")
        .gte("created_at", todayStart);

      // Get profiles for issue reporters
      const issueGuideIds = [...new Set((issuesData || []).map(i => i.guide_id))];
      const { data: issueProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", issueGuideIds.length > 0 ? issueGuideIds : ['none']);

      const issuesWithNames: IssueInfo[] = (issuesData || []).map(issue => ({
        id: issue.id,
        issue_type: issue.issue_type,
        booking_reference: issue.booking_reference,
        description: issue.description,
        guide_name: issueProfiles?.find(p => p.user_id === issue.guide_id)?.full_name || 'Unknown',
        created_at: issue.created_at
      }));
      setTodayIssues(issuesWithNames);

      // Count issues by type
      const problemsCount = issuesWithNames.filter(i => i.issue_type === 'problem').length;
      const postponementsCount = issuesWithNames.filter(i => i.issue_type === 'postponement').length;
      const noShowsCount = issuesWithNames.filter(i => i.issue_type === 'no_show').length;

      setStats({
        totalGuides: guidesCount || 0,
        totalAdmins: adminsCount || 0,
        guidesWorkedToday: uniqueGuidesToday,
        totalEmailsToday: emailsToday || 0,
        unavailableGuidesToday: unavailableData?.length || 0,
        problemsCount,
        postponementsCount,
        noShowsCount,
        pendingRequests: pendingData?.length || 0,
      });

      // Fetch activity distribution
      const { data: activities } = await supabase
        .from("activity_options")
        .select("id, name")
        .eq("is_active", true);

      const { data: reports } = await supabase
        .from("daily_reports")
        .select("activity_id")
        .eq("report_date", today);

      if (activities && reports) {
        const activityCounts = activities.map((activity) => ({
          name: activity.name,
          count: reports.filter((r) => r.activity_id === activity.id).length,
        }));
        setActivityData(activityCounts.filter((a) => a.count > 0));
      }

      // Fetch 7-day trend
      const trendData: DailyTrend[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayStart = startOfDay(date).toISOString();
        const dayEnd = startOfDay(subDays(date, -1)).toISOString();

        const { count: dayReports } = await supabase
          .from("daily_reports")
          .select("*", { count: "exact", head: true })
          .eq("report_date", dateStr);

        const { count: dayEmails } = await supabase
          .from("email_logs")
          .select("*", { count: "exact", head: true })
          .gte("sent_at", dayStart)
          .lt("sent_at", dayEnd);

        trendData.push({
          date: format(date, "EEE"),
          reports: dayReports || 0,
          emails: dayEmails || 0,
        });
      }
      setDailyTrend(trendData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from("guide_unavailability")
        .update({
          status: "approved",
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(t('analytics.approved'));
      fetchAnalytics();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error(t('analytics.approve_failed'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setProcessingId(selectedRequest.id);
    try {
      const { error } = await supabase
        .from("guide_unavailability")
        .update({
          status: "rejected",
          admin_notes: rejectReason || undefined,
          responded_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success(t('analytics.rejected'));
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchAnalytics();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error(t('analytics.reject_failed'));
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (request: PendingRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('analytics.total_guides')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGuides}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('analytics.total_admins')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAdmins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('analytics.voted_today')}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.guidesWorkedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('analytics.emails_today')}
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmailsToday}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              {t('analytics.unavailable')}
            </CardTitle>
            <CalendarX className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.unavailableGuidesToday}</div>
          </CardContent>
        </Card>

        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              {t('analytics.problems')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.problemsCount}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">
              {t('analytics.postponements')}
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.postponementsCount}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/50 bg-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">
              {t('analytics.no_shows')}
            </CardTitle>
            <XCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.noShowsCount}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              {t('analytics.pending_requests')}
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pendingRequests}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Leave Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Clock className="h-5 w-5" />
              {t('analytics.pending_leave')}
              <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-700">
                {pendingRequests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background border border-blue-500/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{request.full_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(request.unavailable_date), 'EEEE, MMM d, yyyy')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('analytics.requested_at')}: {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mx-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-500 hover:bg-green-500/10"
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mx-1" />
                          {t('analytics.approve')}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-500 hover:bg-red-500/10"
                      onClick={() => openRejectDialog(request)}
                      disabled={processingId === request.id}
                    >
                      <X className="h-4 w-4 mx-1" />
                      {t('analytics.reject')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('analytics.reject_request')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('analytics.reject_confirm')} <strong>{selectedRequest?.full_name}</strong> {t('analytics.for_day')}{' '}
              <strong>{selectedRequest && format(new Date(selectedRequest.unavailable_date), 'MMM d, yyyy')}</strong>?
            </p>
            <Textarea
              placeholder={t('analytics.reject_reason')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingId !== null}
            >
              {processingId !== null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('analytics.confirm_reject')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('analytics.trend_7day')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Line
                  type="monotone"
                  dataKey="reports"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Reports"
                />
                <Line
                  type="monotone"
                  dataKey="emails"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  name="Emails"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('analytics.activity_distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={activityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {activityData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {t('analytics.no_activity_data')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports by Activity Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.reports_by_activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {t('analytics.no_activity_data')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Guides Who Haven't Voted */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              {t('analytics.not_voted')}
              <Badge variant="secondary" className="ml-2">
                {guidesNotVoted.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {guidesNotVoted.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {guidesNotVoted.map((guide) => (
                  <Badge 
                    key={guide.user_id} 
                    variant="outline"
                    className="text-sm py-1.5 px-3"
                  >
                    {guide.full_name}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                {t('analytics.all_voted')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unavailable Guides Today */}
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <CalendarX className="h-5 w-5" />
              {t('analytics.unavailable_guides')}
              <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-700">
                {unavailableGuides.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unavailableGuides.length > 0 ? (
              <div className="space-y-2">
                {unavailableGuides.map((guide, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10"
                  >
                    <span className="font-medium">{guide.full_name}</span>
                    <Badge variant="outline" className="text-yellow-700 border-yellow-500/50">
                      {guide.reason}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                {t('analytics.all_available')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Issues */}
        <Card className="lg:col-span-2 border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t('analytics.today_issues')}
              <Badge variant="secondary" className="ml-2 bg-red-500/20 text-red-700">
                {todayIssues.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayIssues.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {todayIssues.map((issue) => (
                  <div 
                    key={issue.id}
                    className={`p-3 rounded-lg border ${
                      issue.issue_type === 'problem' 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : issue.issue_type === 'postponement'
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-purple-500/10 border-purple-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge 
                        variant="outline" 
                        className={
                          issue.issue_type === 'problem' 
                            ? 'text-red-700 border-red-500/50' 
                            : issue.issue_type === 'postponement'
                            ? 'text-orange-700 border-orange-500/50'
                            : 'text-purple-700 border-purple-500/50'
                        }
                      >
                        {issue.issue_type === 'problem' ? t('analytics.problem') : 
                         issue.issue_type === 'postponement' ? t('analytics.postponement') : t('analytics.no_show')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(issue.created_at), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{t('analytics.booking')}: {issue.booking_reference}</p>
                    <p className="text-sm text-muted-foreground truncate">{issue.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('analytics.by')}: {issue.guide_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                {t('analytics.no_issues')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
