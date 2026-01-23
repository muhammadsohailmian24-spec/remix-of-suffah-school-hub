import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import AdminLayout from "@/components/admin/AdminLayout";
import AbsentStudentsList from "@/components/AbsentStudentsList";
import StudentSearchDialog from "@/components/admin/StudentSearchDialog";
import {
  Users, GraduationCap, UserCheck, Clock, CheckCircle, 
  XCircle, TrendingUp, Bell, Calendar, FileText, AlertTriangle, 
  UserX, Search, CreditCard, ClipboardList, Megaphone, 
  BarChart3, ArrowRight, Wallet, Receipt, BookOpen, School
} from "lucide-react";

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
  pendingAdmissions: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  dueFees: number;
  dueFeesCount: number;
  activeExams: number;
  monthExpenses: number;
}

interface Activity {
  id: string;
  title: string;
  time: string;
  type: "success" | "warning" | "info" | "error";
  link?: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalClasses: 0,
    pendingAdmissions: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayLate: 0,
    dueFees: 0,
    dueFeesCount: 0,
    activeExams: 0,
    monthExpenses: 0,
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
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Fetch all counts in parallel
    const [
      studentsRes, 
      teachersRes, 
      parentsRes, 
      classesRes, 
      admissionsRes, 
      attendanceRes,
      dueFeesRes,
      activeExamsRes,
      expensesRes
    ] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("teachers").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("parents").select("id", { count: "exact", head: true }),
      supabase.from("classes").select("id", { count: "exact", head: true }),
      supabase.from("admissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("attendance").select("status").eq("date", today),
      supabase.from("student_fees").select("final_amount, status").in("status", ["pending", "partial"]),
      supabase.from("exams").select("id", { count: "exact", head: true }).gte("exam_date", today),
      supabase.from("expenses").select("amount").gte("date", monthStart),
    ]);

    const attendanceData = attendanceRes.data || [];
    const dueFeesData = dueFeesRes.data || [];
    const expensesData = expensesRes.data || [];
    
    const totalDueFees = dueFeesData.reduce((sum, fee) => sum + Number(fee.final_amount || 0), 0);
    const totalExpenses = expensesData.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    
    setStats({
      totalStudents: studentsRes.count || 0,
      totalTeachers: teachersRes.count || 0,
      totalParents: parentsRes.count || 0,
      totalClasses: classesRes.count || 0,
      pendingAdmissions: admissionsRes.count || 0,
      todayPresent: attendanceData.filter(a => a.status === "present").length,
      todayAbsent: attendanceData.filter(a => a.status === "absent").length,
      todayLate: attendanceData.filter(a => a.status === "late").length,
      dueFees: totalDueFees,
      dueFeesCount: dueFeesData.length,
      activeExams: activeExamsRes.count || 0,
      monthExpenses: totalExpenses,
    });
  };

  // Clickable stat cards configuration
  const mainStatCards = [
    { 
      icon: GraduationCap, 
      label: "Total Students", 
      value: stats.totalStudents, 
      color: "text-primary", 
      bgColor: "bg-primary/10", 
      link: "/admin/students",
      description: "Active enrolled students"
    },
    { 
      icon: CreditCard, 
      label: "Due Fees", 
      value: `PKR ${stats.dueFees.toLocaleString()}`, 
      color: "text-destructive", 
      bgColor: "bg-destructive/10", 
      link: "/admin/fees?filter=pending",
      description: `${stats.dueFeesCount} student(s) pending`
    },
    { 
      icon: UserX, 
      label: "Absent Today", 
      value: stats.todayAbsent, 
      color: "text-warning", 
      bgColor: "bg-warning/10", 
      link: "/admin/attendance",
      description: "Students marked absent"
    },
    { 
      icon: BookOpen, 
      label: "Active Exams", 
      value: stats.activeExams, 
      color: "text-info", 
      bgColor: "bg-info/10", 
      link: "/admin/exams",
      description: "Upcoming/ongoing exams"
    },
    { 
      icon: FileText, 
      label: "Pending Admissions", 
      value: stats.pendingAdmissions, 
      color: "text-secondary", 
      bgColor: "bg-secondary/10", 
      link: "/admin/admissions",
      description: "Applications to review"
    },
    { 
      icon: Wallet, 
      label: "Month Expenses", 
      value: `PKR ${stats.monthExpenses.toLocaleString()}`, 
      color: "text-muted-foreground", 
      bgColor: "bg-muted", 
      link: "/admin/expenses",
      description: "This month's spending"
    },
  ];

  // Quick action buttons
  const quickActions = [
    { label: "Mark Attendance", link: "/admin/attendance", icon: ClipboardList, color: "bg-primary hover:bg-primary/90" },
    { label: "Enter Marks", link: "/admin/results", icon: BarChart3, color: "bg-info hover:bg-info/90" },
    { label: "Collect Fee", link: "/admin/fees", icon: Receipt, color: "bg-success hover:bg-success/90" },
    { label: "Generate Reports", link: "/admin/reports", icon: FileText, color: "bg-secondary hover:bg-secondary/90" },
  ];

  // Secondary stats row
  const secondaryStats = [
    { icon: UserCheck, label: "Teachers", value: stats.totalTeachers, link: "/admin/teachers" },
    { icon: Users, label: "Parents", value: stats.totalParents, link: "/admin/parents" },
    { icon: School, label: "Classes", value: stats.totalClasses, link: "/admin/classes" },
    { icon: CheckCircle, label: "Present Today", value: stats.todayPresent, link: "/admin/attendance" },
  ];

  // Generate real-time activities based on actual data
  const recentActivities: Activity[] = [];
  
  if (stats.pendingAdmissions > 0) {
    recentActivities.push({ 
      id: "pending", 
      title: `${stats.pendingAdmissions} pending admission application(s)`, 
      time: "Requires attention", 
      type: "info",
      link: "/admin/admissions"
    });
  }
  
  if (stats.todayPresent > 0) {
    recentActivities.push({ 
      id: "present", 
      title: `${stats.todayPresent} students marked present today`, 
      time: "Today", 
      type: "success",
      link: "/admin/attendance"
    });
  }
  
  if (stats.todayAbsent > 0) {
    recentActivities.push({ 
      id: "absent", 
      title: `${stats.todayAbsent} students marked absent today`, 
      time: "Today", 
      type: "error",
      link: "/admin/attendance"
    });
  }

  if (stats.dueFeesCount > 0) {
    recentActivities.push({ 
      id: "fees", 
      title: `PKR ${stats.dueFees.toLocaleString()} fees pending collection`, 
      time: "Action needed", 
      type: "warning",
      link: "/admin/fees"
    });
  }
  
  if (recentActivities.length === 0) {
    recentActivities.push({ 
      id: "no-activity", 
      title: "No recent activity to display", 
      time: "Check back later", 
      type: "info" 
    });
  }

  if (loading) {
    return (
      <AdminLayout title="Dashboard" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  const totalAttendance = stats.todayPresent + stats.todayAbsent + stats.todayLate;
  const attendanceRate = totalAttendance > 0 
    ? Math.round((stats.todayPresent / totalAttendance) * 100) 
    : 0;

  return (
    <AdminLayout title="Admin Dashboard" description="School Management Overview">
      {/* Search Bar */}
      <div className="mb-6">
        <div 
          className="relative cursor-pointer max-w-md"
          onClick={() => setSearchDialogOpen(true)}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search student by name or ID..."
            className="pl-10 cursor-pointer"
            readOnly
          />
        </div>
      </div>

      <StudentSearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />

      {/* Main Stats Grid - Clickable Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {mainStatCards.map((stat, i) => (
          <Link key={i} to={stat.link}>
            <Card className="card-hover cursor-pointer h-full group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="font-heading text-2xl font-bold">{stat.value}</div>
                <div className="text-sm font-medium text-foreground">{stat.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.description}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {secondaryStats.map((stat, i) => (
          <Link key={i} to={stat.link}>
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <div className="font-heading text-xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks at your fingertips</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <Button
                key={i}
                className={`h-auto py-4 flex flex-col items-center gap-2 text-white ${action.color}`}
                onClick={() => navigate(action.link)}
              >
                <action.icon className="w-6 h-6" />
                <span className="font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Absent Students */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-destructive" />
                  Today's Absent Students
                  {stats.todayAbsent > 0 && (
                    <Badge variant="destructive" className="ml-2">{stats.todayAbsent}</Badge>
                  )}
                </CardTitle>
                <CardDescription>Students marked absent today</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/attendance")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AbsentStudentsList date={new Date()} showTitle={false} maxItems={5} />
            {stats.todayAbsent > 5 && (
              <Button 
                variant="link" 
                className="w-full mt-4"
                onClick={() => navigate("/admin/attendance")}
              >
                View all {stats.todayAbsent} absent students →
              </Button>
            )}
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
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-primary">{attendanceRate}%</div>
                <div className="text-sm text-muted-foreground">Attendance Rate</div>
              </div>
              
              <Progress value={attendanceRate} className="h-3" />
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <div className="text-lg font-bold text-success">{stats.todayPresent}</div>
                  <div className="text-xs text-muted-foreground">Present</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <div className="text-lg font-bold text-destructive">{stats.todayAbsent}</div>
                  <div className="text-xs text-muted-foreground">Absent</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-warning/10">
                  <div className="text-lg font-bold text-warning">{stats.todayLate}</div>
                  <div className="text-xs text-muted-foreground">Late</div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate("/admin/attendance")}
              >
                Manage Attendance
              </Button>
            </div>
          </CardContent>
        </Card>

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
              <div 
                key={activity.id} 
                className={`flex items-center gap-4 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors ${activity.link ? 'cursor-pointer' : ''}`}
                onClick={() => activity.link && navigate(activity.link)}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  activity.type === "success" ? "bg-success" : 
                  activity.type === "warning" ? "bg-warning" : 
                  activity.type === "error" ? "bg-destructive" : "bg-info"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                {activity.link && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Tasks & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Pending Tasks
            </CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.pendingAdmissions > 0 && (
              <div 
                className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/20 transition-colors"
                onClick={() => navigate("/admin/admissions")}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-warning" />
                  <div>
                    <p className="text-sm font-medium">{stats.pendingAdmissions} Admissions</p>
                    <p className="text-xs text-muted-foreground">Pending review</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            
            {stats.dueFeesCount > 0 && (
              <div 
                className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors"
                onClick={() => navigate("/admin/fees")}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">{stats.dueFeesCount} Fees Pending</p>
                    <p className="text-xs text-muted-foreground">Collection needed</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            
            {stats.todayAbsent > 0 && (
              <div 
                className="flex items-center justify-between p-3 rounded-lg bg-info/10 border border-info/20 cursor-pointer hover:bg-info/20 transition-colors"
                onClick={() => navigate("/admin/attendance")}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-info" />
                  <div>
                    <p className="text-sm font-medium">Notify Parents</p>
                    <p className="text-xs text-muted-foreground">{stats.todayAbsent} absent today</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            
            {stats.pendingAdmissions === 0 && stats.dueFeesCount === 0 && stats.todayAbsent === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
                <p className="text-sm">All caught up! No pending tasks.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
