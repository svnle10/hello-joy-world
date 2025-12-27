import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, Activity, Mail, TrendingUp, UserX, AlertTriangle, Clock, XCircle, CalendarX } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalGuides: number;
  totalAdmins: number;
  guidesWorkedToday: number;
  totalEmailsToday: number;
  unavailableGuidesToday: number;
  problemsCount: number;
  postponementsCount: number;
  noShowsCount: number;
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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalGuides: 0,
    totalAdmins: 0,
    guidesWorkedToday: 0,
    totalEmailsToday: 0,
    unavailableGuidesToday: 0,
    problemsCount: 0,
    postponementsCount: 0,
    noShowsCount: 0,
  });
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [guidesNotVoted, setGuidesNotVoted] = useState<GuideInfo[]>([]);
  const [unavailableGuides, setUnavailableGuides] = useState<UnavailableGuide[]>([]);
  const [todayIssues, setTodayIssues] = useState<IssueInfo[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch unavailable guides for today
      const { data: unavailableData } = await supabase
        .from("guide_unavailability")
        .select("guide_id, reason")
        .eq("unavailable_date", today);

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
              المرشدين
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
              الأدمن
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
              صوتوا اليوم
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
              الإيميلات
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
              غير متاحين
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
              المشاكل
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
              التأجيلات
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
              عدم الحضور
            </CardTitle>
            <XCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.noShowsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              7-Day Activity Trend
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
              Today's Activity Distribution
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
                No activity data for today
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports by Activity Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Reports by Activity</CardTitle>
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
                No activity data for today
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Guides Who Haven't Voted */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              المرشدون المعينون الذين لم يصوتوا اليوم
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
                🎉 جميع المرشدين المعينين صوتوا اليوم!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unavailable Guides Today */}
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <CalendarX className="h-5 w-5" />
              المرشدون غير المتاحين اليوم
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
                ✅ جميع المرشدين متاحون اليوم
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Issues */}
        <Card className="lg:col-span-2 border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              المشاكل والتقارير اليوم
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
                        {issue.issue_type === 'problem' ? 'مشكلة' : 
                         issue.issue_type === 'postponement' ? 'تأجيل' : 'عدم حضور'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(issue.created_at), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm font-medium">الحجز: {issue.booking_reference}</p>
                    <p className="text-sm text-muted-foreground truncate">{issue.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">بواسطة: {issue.guide_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                ✅ لا توجد مشاكل أو تقارير اليوم
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
