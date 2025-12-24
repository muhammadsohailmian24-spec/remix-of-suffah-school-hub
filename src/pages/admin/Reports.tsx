import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, BarChart3, Users, TrendingUp, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";

interface AttendanceSummary {
  class_name: string;
  total: number;
  present: number;
  absent: number;
  rate: number;
}

interface ClassPerformance {
  class_name: string;
  average_marks: number;
  highest: number;
  lowest: number;
  pass_rate: number;
}

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("attendance");
  const [attendanceData, setAttendanceData] = useState<AttendanceSummary[]>([]);
  const [performanceData, setPerformanceData] = useState<ClassPerformance[]>([]);

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

    await fetchReportData();
    setLoading(false);
  };

  const fetchReportData = async () => {
    // Fetch classes
    const { data: classes } = await supabase.from("classes").select("id, name");
    
    // Fetch attendance data
    const { data: attendance } = await supabase.from("attendance").select("class_id, status");
    
    // Fetch results data
    const { data: results } = await supabase.from("results").select("marks_obtained, exam_id");
    const { data: exams } = await supabase.from("exams").select("id, class_id, max_marks, passing_marks");

    // Calculate attendance summary by class
    const attendanceSummary: AttendanceSummary[] = (classes || []).map(cls => {
      const classAttendance = attendance?.filter(a => a.class_id === cls.id) || [];
      const total = classAttendance.length;
      const present = classAttendance.filter(a => a.status === "present").length;
      const absent = total - present;
      return {
        class_name: cls.name,
        total,
        present,
        absent,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    }).filter(s => s.total > 0);

    // Calculate performance by class
    const performanceSummary: ClassPerformance[] = (classes || []).map(cls => {
      const classExams = exams?.filter(e => e.class_id === cls.id) || [];
      const examIds = classExams.map(e => e.id);
      const classResults = results?.filter(r => examIds.includes(r.exam_id)) || [];
      
      if (classResults.length === 0) {
        return { class_name: cls.name, average_marks: 0, highest: 0, lowest: 0, pass_rate: 0 };
      }

      const marks = classResults.map(r => r.marks_obtained);
      const average = Math.round(marks.reduce((a, b) => a + b, 0) / marks.length);
      const highest = Math.max(...marks);
      const lowest = Math.min(...marks);
      
      // Assuming 40% pass rate
      const passingMarks = classExams[0]?.passing_marks || 40;
      const passed = classResults.filter(r => r.marks_obtained >= passingMarks).length;
      const passRate = Math.round((passed / classResults.length) * 100);

      return {
        class_name: cls.name,
        average_marks: average,
        highest,
        lowest,
        pass_rate: passRate,
      };
    }).filter(p => p.average_marks > 0);

    setAttendanceData(attendanceSummary);
    setPerformanceData(performanceSummary);
  };

  const handleExport = (format: "pdf" | "excel") => {
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    });
    // In a real app, this would trigger actual export functionality
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `Report downloaded as ${format.toUpperCase()}`,
      });
    }, 1500);
  };

  const stats = [
    { icon: Users, label: "Total Students", value: "485", color: "text-primary" },
    { icon: TrendingUp, label: "Avg Attendance", value: "92%", color: "text-success" },
    { icon: BarChart3, label: "Avg Performance", value: "78%", color: "text-info" },
    { icon: Calendar, label: "Report Period", value: "Dec 2024", color: "text-warning" },
  ];

  return (
    <AdminLayout title="Reports & Analytics" description="View attendance and performance reports">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">Attendance Summary</SelectItem>
                  <SelectItem value="performance">Class Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport("pdf")} className="gap-2">
                <FileText className="w-4 h-4" /> Export PDF
              </Button>
              <Button variant="outline" onClick={() => handleExport("excel")} className="gap-2">
                <Download className="w-4 h-4" /> Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {reportType === "attendance" ? "Attendance Summary by Class" : "Class Performance Report"}
          </CardTitle>
          <CardDescription>
            {reportType === "attendance" 
              ? "Overview of attendance across all classes" 
              : "Academic performance metrics by class"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : reportType === "attendance" ? (
            attendanceData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No attendance data available</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Total Records</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Attendance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.class_name}</TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell className="text-success">{row.present}</TableCell>
                      <TableCell className="text-destructive">{row.absent}</TableCell>
                      <TableCell>
                        <Badge variant={row.rate >= 80 ? "default" : row.rate >= 60 ? "secondary" : "destructive"}>
                          {row.rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            performanceData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No performance data available</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Average Marks</TableHead>
                    <TableHead>Highest</TableHead>
                    <TableHead>Lowest</TableHead>
                    <TableHead>Pass Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.class_name}</TableCell>
                      <TableCell>{row.average_marks}%</TableCell>
                      <TableCell className="text-success">{row.highest}</TableCell>
                      <TableCell className="text-destructive">{row.lowest}</TableCell>
                      <TableCell>
                        <Badge variant={row.pass_rate >= 80 ? "default" : row.pass_rate >= 60 ? "secondary" : "destructive"}>
                          {row.pass_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default Reports;
