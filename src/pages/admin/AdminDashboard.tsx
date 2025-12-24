import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Users, GraduationCap, UserCheck, School, Clock, CheckCircle, 
  XCircle, TrendingUp, Bell, Calendar, FileText, AlertTriangle
} from "lucide-react";

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
  pendingAdmissions: number;
  todayAttendance: number;
}

interface Activity {
  id: string;
  title: string;
  time: string;
  type: "success" | "warning" | "info" | "error";
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalClasses: 0,
    pendingAdmissions: 0,
    todayAttendance: 0,
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "admin") { 
      navigate("/dashboard"); 
      return; 
    }

    await fetchStats();
    setLoading(false);
  };

  const fetchStats = async () => {
    // Fetch all counts in parallel
    const [studentsRes, teachersRes, parentsRes, classesRes, admissionsRes] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("teachers").select("id", { count: "exact", head: true }),
      supabase.from("parents").select("id", { count: "exact", head: true }),
      supabase.from("classes").select("id", { count: "exact", head: true }),
      supabase.from("admissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const { count: attendanceCount } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", today)
      .eq("status", "present");

    setStats({
      totalStudents: studentsRes.count || 0,
      totalTeachers: teachersRes.count || 0,
      totalParents: parentsRes.count || 0,
      totalClasses: classesRes.count || 0,
      pendingAdmissions: admissionsRes.count || 0,
      todayAttendance: attendanceCount || 0,
    });
  };

  const statCards = [
    { icon: GraduationCap, label: "Total Students", value: stats.totalStudents, color: "text-primary", bgColor: "bg-primary/10", trend: "+12 this month" },
    { icon: UserCheck, label: "Total Teachers", value: stats.totalTeachers, color: "text-info", bgColor: "bg-info/10", trend: "Active faculty" },
    { icon: Users, label: "Total Parents", value: stats.totalParents, color: "text-warning", bgColor: "bg-warning/10", trend: "Registered" },
    { icon: School, label: "Total Classes", value: stats.totalClasses, color: "text-success", bgColor: "bg-success/10", trend: "All grades" },
    { icon: Clock, label: "Pending Admissions", value: stats.pendingAdmissions, color: "text-destructive", bgColor: "bg-destructive/10", trend: "Needs review" },
    { icon: CheckCircle, label: "Today's Attendance", value: `${stats.todayAttendance}`, color: "text-success", bgColor: "bg-success/10", trend: "Present today" },
  ];

  const recentActivities: Activity[] = [
    { id: "1", title: "New admission application received", time: "5 minutes ago", type: "info" },
    { id: "2", title: "Teacher John marked attendance for Class 10A", time: "15 minutes ago", type: "success" },
    { id: "3", title: "Results published for Mid-term Exams", time: "1 hour ago", type: "success" },
    { id: "4", title: "Parent meeting scheduled for next week", time: "2 hours ago", type: "warning" },
    { id: "5", title: "3 students marked absent today", time: "3 hours ago", type: "error" },
  ];

  const notifications = [
    { id: "1", title: "System backup completed", priority: "low" },
    { id: "2", title: "New teacher registration pending approval", priority: "high" },
    { id: "3", title: "Academic year setup reminder", priority: "normal" },
    { id: "4", title: "Fee collection due date approaching", priority: "high" },
  ];

  const quickActions = [
    { label: "Add Student", link: "/admin/students", icon: GraduationCap },
    { label: "Add Teacher", link: "/admin/teachers", icon: UserCheck },
    { label: "View Admissions", link: "/admin/admissions", icon: FileText },
    { label: "Create Announcement", link: "/admin/announcements", icon: Bell },
  ];

  if (loading) {
    return (
      <AdminLayout title="Dashboard" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Dashboard" description="Welcome to the Super Admin Panel">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <Card key={i} className="card-hover">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="font-heading text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className={`text-xs mt-1 ${stat.color}`}>{stat.trend}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action, i) => (
          <Button
            key={i}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate(action.link)}
          >
            <action.icon className="w-6 h-6 text-primary" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  activity.type === "success" ? "bg-success" : 
                  activity.type === "warning" ? "bg-warning" : 
                  activity.type === "error" ? "bg-destructive" : "bg-info"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notifications Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>System alerts and reminders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <div className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                  notification.priority === "high" ? "bg-destructive/10 text-destructive" : 
                  notification.priority === "low" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                }`}>
                  {notification.priority.toUpperCase()}
                </div>
                <p className="text-sm">{notification.title}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Attendance Summary
            </CardTitle>
            <CardDescription>Today's overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Present</span>
                <span className="font-semibold text-success">{stats.todayAttendance}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Absent</span>
                <span className="font-semibold text-destructive">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Late</span>
                <span className="font-semibold text-warning">5</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{ width: "92%" }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">92% attendance rate today</p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Pending Tasks
            </CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.pendingAdmissions > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-warning" />
                    <span className="text-sm font-medium">{stats.pendingAdmissions} pending admission applications</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate("/admin/admissions")}>
                    Review
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-lg bg-info/10 border border-info/20">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-info" />
                  <span className="text-sm font-medium">Set up next academic year</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/admin/settings")}>
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
