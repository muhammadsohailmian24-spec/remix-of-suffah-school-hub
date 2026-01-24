import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import AdminLayout from "@/components/admin/AdminLayout";
import StudentSearchDialog from "@/components/admin/StudentSearchDialog";
import {
  Users, GraduationCap, UserCheck, Clock, CheckCircle, 
  XCircle, TrendingUp, Bell, Calendar, FileText, AlertTriangle, 
  UserX, Search, CreditCard, ClipboardList, Megaphone, 
  BarChart3, ArrowRight, Wallet, Receipt, BookOpen, School,
  Settings, FolderOpen, PieChart
} from "lucide-react";

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  feesCollected: number;
  feesPending: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  totalMarked: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    feesCollected: 0,
    feesPending: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayLate: 0,
    totalMarked: 0,
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
      classesRes, 
      attendanceRes,
      pendingFeesRes,
      collectedFeesRes,
    ] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("teachers").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("classes").select("id", { count: "exact", head: true }),
      supabase.from("attendance").select("status").eq("date", today),
      supabase.from("student_fees").select("final_amount").in("status", ["pending", "partial"]),
      supabase.from("fee_payments").select("amount").gte("payment_date", monthStart),
    ]);

    const attendanceData = attendanceRes.data || [];
    const pendingFeesData = pendingFeesRes.data || [];
    const collectedFeesData = collectedFeesRes.data || [];
    
    const totalPendingFees = pendingFeesData.reduce((sum, fee) => sum + Number(fee.final_amount || 0), 0);
    const totalCollectedFees = collectedFeesData.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
    
    const todayPresent = attendanceData.filter(a => a.status === "present").length;
    const todayAbsent = attendanceData.filter(a => a.status === "absent").length;
    const todayLate = attendanceData.filter(a => a.status === "late").length;
    
    setStats({
      totalStudents: studentsRes.count || 0,
      totalTeachers: teachersRes.count || 0,
      totalClasses: classesRes.count || 0,
      feesCollected: totalCollectedFees,
      feesPending: totalPendingFees,
      todayPresent,
      todayAbsent,
      todayLate,
      totalMarked: todayPresent + todayAbsent + todayLate,
    });
  };

  // Main stat cards matching legacy system
  const mainStatCards = [
    { 
      icon: GraduationCap, 
      label: "Total Students", 
      value: stats.totalStudents, 
      color: "text-primary", 
      bgColor: "bg-primary/10", 
      link: "/admin/students",
    },
    { 
      icon: UserCheck, 
      label: "Total Teachers", 
      value: stats.totalTeachers, 
      color: "text-info", 
      bgColor: "bg-info/10", 
      link: "/admin/teachers",
    },
    { 
      icon: School, 
      label: "Total Classes", 
      value: stats.totalClasses, 
      color: "text-secondary", 
      bgColor: "bg-secondary/10", 
      link: "/admin/classes",
    },
    { 
      icon: Wallet, 
      label: "Fees Collected", 
      value: `PKR ${stats.feesCollected.toLocaleString()}`, 
      color: "text-success", 
      bgColor: "bg-success/10", 
      link: "/admin/fees",
      subtitle: "This month"
    },
    { 
      icon: CreditCard, 
      label: "Fees Pending", 
      value: `PKR ${stats.feesPending.toLocaleString()}`, 
      color: "text-destructive", 
      bgColor: "bg-destructive/10", 
      link: "/admin/fees?filter=pending",
    },
  ];

  // Quick navigation buttons matching legacy system
  const quickNavButtons = [
    { label: "Students", link: "/admin/students", icon: GraduationCap, color: "bg-primary" },
    { label: "Teachers", link: "/admin/teachers", icon: UserCheck, color: "bg-info" },
    { label: "Classes", link: "/admin/classes", icon: School, color: "bg-secondary" },
    { label: "Subjects", link: "/admin/subjects", icon: BookOpen, color: "bg-accent" },
    { label: "Attendance", link: "/admin/attendance", icon: ClipboardList, color: "bg-warning" },
    { label: "Exams", link: "/admin/exams", icon: FileText, color: "bg-primary" },
    { label: "Results", link: "/admin/results", icon: BarChart3, color: "bg-info" },
    { label: "Fee Management", link: "/admin/fees", icon: Wallet, color: "bg-success" },
    { label: "Reports", link: "/admin/reports", icon: PieChart, color: "bg-secondary" },
    { label: "Settings", link: "/admin/settings", icon: Settings, color: "bg-muted" },
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

  const attendanceRate = stats.totalMarked > 0 
    ? Math.round((stats.todayPresent / stats.totalMarked) * 100) 
    : 0;

  return (
    <AdminLayout title="Admin Dashboard" description="School Management System Overview">
      {/* Search Bar */}
      <div className="mb-6">
        <div 
          className="relative cursor-pointer max-w-md"
          onClick={() => setSearchDialogOpen(true)}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search student by name or admission number..."
            className="pl-10 cursor-pointer"
            readOnly
          />
        </div>
      </div>

      <StudentSearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />

      {/* Main Stats Grid - 5 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {mainStatCards.map((stat, i) => (
          <Link key={i} to={stat.link}>
            <Card className="card-hover cursor-pointer h-full group transition-all hover:shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="font-heading text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                {stat.subtitle && (
                  <div className="text-xs text-muted-foreground mt-1">{stat.subtitle}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Today's Attendance Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Today's Attendance Summary
          </CardTitle>
          <CardDescription>Real-time attendance overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Total Marked */}
            <div className="text-center p-4 rounded-xl bg-accent/50">
              <div className="text-3xl font-bold text-foreground">{stats.totalMarked}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Marked</div>
            </div>
            
            {/* Present */}
            <div className="text-center p-4 rounded-xl bg-success/10 border border-success/20">
              <div className="text-3xl font-bold text-success">{stats.todayPresent}</div>
              <div className="text-sm text-muted-foreground mt-1">Present</div>
            </div>
            
            {/* Absent */}
            <div className="text-center p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <div className="text-3xl font-bold text-destructive">{stats.todayAbsent}</div>
              <div className="text-sm text-muted-foreground mt-1">Absent</div>
            </div>
            
            {/* Late */}
            <div className="text-center p-4 rounded-xl bg-warning/10 border border-warning/20">
              <div className="text-3xl font-bold text-warning">{stats.todayLate}</div>
              <div className="text-sm text-muted-foreground mt-1">Late</div>
            </div>
            
            {/* Attendance Rate */}
            <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="text-3xl font-bold text-primary">{attendanceRate}%</div>
              <div className="text-sm text-muted-foreground mt-1">Attendance Rate</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Attendance Progress</span>
              <span className="font-medium">{attendanceRate}%</span>
            </div>
            <Progress value={attendanceRate} className="h-3" />
          </div>
          
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => navigate("/admin/attendance")}
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Mark Attendance / View Details
          </Button>
        </CardContent>
      </Card>

      {/* Quick Navigation Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
          <CardDescription>Click any button to open the related module</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {quickNavButtons.map((btn, i) => (
              <Button
                key={i}
                variant="outline"
                className={`h-auto py-4 flex flex-col items-center gap-2 hover:text-white transition-all ${btn.color} hover:${btn.color}`}
                onClick={() => navigate(btn.link)}
              >
                <div className={`w-10 h-10 rounded-lg ${btn.color}/10 flex items-center justify-center`}>
                  <btn.icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{btn.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
