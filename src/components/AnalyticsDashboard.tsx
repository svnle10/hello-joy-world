import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, Activity, Mail, TrendingUp, UserX } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalGuides: number;
  totalAdmins: number;
  guidesWorkedToday: number;
  totalEmailsToday: number;
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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalGuides: 0,
    totalAdmins: 0,
    guidesWorkedToday: 0,
    totalEmailsToday: 0,
  });
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [guidesNotVoted, setGuidesNotVoted] = useState<GuideInfo[]>([]);
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

      // Fetch all guides with their names
      const { data: guideRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "guide");

      const allGuideIds = (guideRoles || []).map(r => r.user_id);

      // Fetch profiles for all guides
      const { data: guideProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", allGuideIds);

      // Filter guides who haven't voted today
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

      setStats({
        totalGuides: guidesCount || 0,
        totalAdmins: adminsCount || 0,
        guidesWorkedToday: uniqueGuidesToday,
        totalEmailsToday: emailsToday || 0,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Guides
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
              Total Admins
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
              Guides Voted Today
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
              Emails Today
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmailsToday}</div>
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

        {/* Guides Who Haven't Voted */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Guides Who Haven't Voted Today
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
                🎉 All guides have voted today!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
