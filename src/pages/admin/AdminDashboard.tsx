import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import AdminLayout from "@/components/admin/AdminLayout";
import StudentSearchDialog from "@/components/admin/StudentSearchDialog";
import {
  Users, GraduationCap, Search, CreditCard, 
  BarChart3, ArrowRight, Wallet, Receipt, School, FileText,
  Settings, Shield, Printer, Plus, UserPlus, DollarSign,
  FileCheck, Award, ClipboardList
} from "lucide-react";

interface Stats {
  totalStudents: number;
  newStudents: number;
  leftStudents: number;
  totalClasses: number;
  feesCollected: number;
  feesPending: number;
  pendingChallans: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    newStudents: 0,
    leftStudents: 0,
    totalClasses: 0,
    feesCollected: 0,
    feesPending: 0,
    pendingChallans: 0,
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
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Fetch all counts in parallel - student-centric and fee-centric data
    const [
      allStudentsRes,
      newStudentsRes,
      leftStudentsRes,
      classesRes, 
      pendingFeesRes,
      collectedFeesRes,
      pendingChallansRes,
    ] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active").gte("admission_date", monthStart),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "left"),
      supabase.from("classes").select("id", { count: "exact", head: true }),
      supabase.from("student_fees").select("final_amount").in("status", ["pending", "partial"]),
      supabase.from("fee_payments").select("amount").gte("payment_date", monthStart),
      supabase.from("student_fees").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const pendingFeesData = pendingFeesRes.data || [];
    const collectedFeesData = collectedFeesRes.data || [];
    
    const totalPendingFees = pendingFeesData.reduce((sum, fee) => sum + Number(fee.final_amount || 0), 0);
    const totalCollectedFees = collectedFeesData.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
    
    setStats({
      totalStudents: allStudentsRes.count || 0,
      newStudents: newStudentsRes.count || 0,
      leftStudents: leftStudentsRes.count || 0,
      totalClasses: classesRes.count || 0,
      feesCollected: totalCollectedFees,
      feesPending: totalPendingFees,
      pendingChallans: pendingChallansRes.count || 0,
    });
  };

  // Main stat cards - Student & Fee centric (Legacy style)
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
      icon: UserPlus, 
      label: "New Admissions", 
      value: stats.newStudents, 
      color: "text-success", 
      bgColor: "bg-success/10", 
      link: "/admin/students?filter=new",
      subtitle: "This month"
    },
    { 
      icon: School, 
      label: "Classes", 
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

  // Quick Actions - Desktop-style menu buttons (Legacy VB6 style)
  const quickActions = [
    { 
      label: "Add New Student", 
      icon: UserPlus, 
      action: () => navigate("/admin/students?action=add"),
      color: "bg-primary hover:bg-primary/90 text-primary-foreground"
    },
    { 
      label: "Generate Challan", 
      icon: Receipt, 
      action: () => navigate("/admin/fees?action=challan"),
      color: "bg-success hover:bg-success/90 text-success-foreground"
    },
    { 
      label: "Collect Fee", 
      icon: DollarSign, 
      action: () => navigate("/admin/fees?action=collect"),
      color: "bg-info hover:bg-info/90 text-white"
    },
    { 
      label: "Print Reports", 
      icon: Printer, 
      action: () => navigate("/admin/reports"),
      color: "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
    },
  ];

  // Module Navigation - Legacy-style menu bar
  const moduleButtons = [
    { label: "Students", link: "/admin/students", icon: Users, description: "Add/Edit student records" },
    { label: "Classes", link: "/admin/classes", icon: School, description: "Manage classes & sections" },
    { label: "Fees", link: "/admin/fees", icon: CreditCard, description: "Fee challans & collection" },
    { label: "Examinations", link: "/admin/exams", icon: FileText, description: "Enter marks & results" },
    { label: "Certificates", link: "/admin/certificates", icon: Award, description: "Generate certificates" },
    { label: "Reports", link: "/admin/reports", icon: BarChart3, description: "View & print reports" },
    { label: "Administrator", link: "/admin/settings", icon: Shield, description: "Users & settings" },
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
    <AdminLayout title="Admin Dashboard" description="School Management System">
      {/* Search Bar - Legacy style prominent search */}
      <div className="mb-6">
        <div 
          className="relative cursor-pointer max-w-lg"
          onClick={() => setSearchDialogOpen(true)}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search student by name, admission number, or father name..."
            className="pl-11 h-12 text-base cursor-pointer border-2 border-primary/20 focus:border-primary"
            readOnly
          />
        </div>
      </div>

      <StudentSearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />

      {/* Quick Action Buttons - Desktop toolbar style */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, i) => (
              <Button
                key={i}
                onClick={action.action}
                className={`${action.color} gap-2 h-11`}
              >
                <action.icon className="w-5 h-5" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid - 5 Cards (Student & Fee focused) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {mainStatCards.map((stat, i) => (
          <Link key={i} to={stat.link}>
            <Card className="cursor-pointer h-full group transition-all hover:shadow-lg hover:border-primary/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="font-heading text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                {stat.subtitle && (
                  <div className="text-xs text-muted-foreground/70 mt-1">{stat.subtitle}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Fee Summary - Most Important Section */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-success" />
              Fee Collection Summary
            </CardTitle>
            <CardDescription>This month's collection status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-success/10">
                <span className="text-sm font-medium">Collected</span>
                <span className="text-lg font-bold text-success">PKR {stats.feesCollected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10">
                <span className="text-sm font-medium">Pending</span>
                <span className="text-lg font-bold text-destructive">PKR {stats.feesPending.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-warning/10">
                <span className="text-sm font-medium">Pending Challans</span>
                <span className="text-lg font-bold text-warning">{stats.pendingChallans}</span>
              </div>
              <Separator />
              <Button 
                className="w-full" 
                onClick={() => navigate("/admin/fees")}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Go to Fee Management
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="w-5 h-5 text-primary" />
              Student Summary
            </CardTitle>
            <CardDescription>Current student status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                <span className="text-sm font-medium">Active Students</span>
                <span className="text-lg font-bold text-primary">{stats.totalStudents}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-success/10">
                <span className="text-sm font-medium">New This Month</span>
                <span className="text-lg font-bold text-success">{stats.newStudents}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                <span className="text-sm font-medium">Left School</span>
                <span className="text-lg font-bold text-muted-foreground">{stats.leftStudents}</span>
              </div>
              <Separator />
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate("/admin/students")}
              >
                <Users className="w-4 h-4 mr-2" />
                Go to Student Management
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Navigation - Desktop-style menu */}
      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>Click to open any module - no restrictions, navigate freely</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {moduleButtons.map((btn, i) => (
              <Link key={i} to={btn.link}>
                <Card className="cursor-pointer h-full hover:shadow-md hover:border-primary/50 transition-all group">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <btn.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="font-medium text-sm mb-1">{btn.label}</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">{btn.description}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
