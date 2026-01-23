import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Users, Calendar, CreditCard, BarChart3, 
  GraduationCap, Award, ClipboardList, Receipt, Wallet,
  Download, ArrowRight
} from "lucide-react";

interface ReportCategory {
  title: string;
  description: string;
  icon: typeof FileText;
  color: string;
  bgColor: string;
  reports: {
    name: string;
    link: string;
    description: string;
  }[];
}

const ReportsHub = () => {
  const navigate = useNavigate();

  const reportCategories: ReportCategory[] = [
    {
      title: "Attendance Reports",
      description: "Daily, monthly, and class-wise attendance reports",
      icon: Calendar,
      color: "text-info",
      bgColor: "bg-info/10",
      reports: [
        { name: "Monthly Class Report", link: "/admin/attendance", description: "Class-wise monthly attendance" },
        { name: "Individual Report", link: "/admin/attendance", description: "Student-wise attendance record" },
        { name: "Summary Report", link: "/admin/attendance", description: "Overall attendance statistics" },
      ]
    },
    {
      title: "Results & Academics",
      description: "Exam results, progress reports, and position lists",
      icon: Award,
      color: "text-success",
      bgColor: "bg-success/10",
      reports: [
        { name: "Progress Report", link: "/admin/results", description: "Individual student progress cards" },
        { name: "DMC / Marks Certificate", link: "/admin/exams", description: "Detailed marks certificates" },
        { name: "Award List", link: "/admin/exams", description: "Exam-wise award lists" },
        { name: "Position List", link: "/admin/results", description: "Class/section rankings" },
      ]
    },
    {
      title: "Fee Reports",
      description: "Fee collection, dues, and payment receipts",
      icon: CreditCard,
      color: "text-warning",
      bgColor: "bg-warning/10",
      reports: [
        { name: "Monthly Collection", link: "/admin/fee-analytics", description: "Month-wise fee collection" },
        { name: "Due List", link: "/admin/fees", description: "Pending fee list by class" },
        { name: "Fee Receipts", link: "/admin/fees", description: "Payment receipts history" },
        { name: "Fee Analytics", link: "/admin/fee-analytics", description: "Visual fee analytics" },
      ]
    },
    {
      title: "Expense Reports",
      description: "Monthly and category-wise expense reports",
      icon: Wallet,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      reports: [
        { name: "Monthly Summary", link: "/admin/expenses", description: "Month-wise expense summary" },
        { name: "Category-wise", link: "/admin/expenses", description: "Expense by category breakdown" },
      ]
    },
    {
      title: "Student Reports",
      description: "Student lists, admission forms, and certificates",
      icon: GraduationCap,
      color: "text-primary",
      bgColor: "bg-primary/10",
      reports: [
        { name: "Class List", link: "/admin/students", description: "Class-wise student lists" },
        { name: "Admission Form", link: "/admin/students", description: "Student admission forms" },
        { name: "Student Cards", link: "/admin/students", description: "ID card generation" },
      ]
    },
    {
      title: "Session Reports",
      description: "Academic session and year-end reports",
      icon: BarChart3,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      reports: [
        { name: "Session Overview", link: "/admin/session-report", description: "Complete session statistics" },
        { name: "Enrollment Report", link: "/admin/session-report", description: "Session-wise enrollment" },
      ]
    },
  ];

  return (
    <AdminLayout 
      title="Reports Hub" 
      description="Quick access to all reports and documents"
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="card-hover cursor-pointer" onClick={() => navigate("/admin/attendance")}>
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-info" />
            <p className="font-medium">Attendance</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => navigate("/admin/results")}>
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto mb-2 text-success" />
            <p className="font-medium">Results</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => navigate("/admin/fees")}>
          <CardContent className="p-4 text-center">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-warning" />
            <p className="font-medium">Fees</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => navigate("/admin/students")}>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="font-medium">Students</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCategories.map((category, index) => (
          <Card key={index} className="h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center`}>
                  <category.icon className={`w-5 h-5 ${category.color}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                  <CardDescription className="text-xs">{category.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {category.reports.map((report, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent cursor-pointer transition-colors group"
                  onClick={() => navigate(report.link)}
                >
                  <div>
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">{report.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Common Reports Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Quick Download
          </CardTitle>
          <CardDescription>Commonly used reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigate("/admin/attendance")}>
              <Calendar className="w-4 h-4 mr-2" />
              Today's Attendance
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/fees")}>
              <Receipt className="w-4 h-4 mr-2" />
              Fee Due List
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/students")}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Class List
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/session-report")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Session Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default ReportsHub;
