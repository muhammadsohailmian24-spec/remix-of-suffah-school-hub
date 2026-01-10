import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AdminLayout from "@/components/admin/AdminLayout";
import AbsentStudentsList from "@/components/AbsentStudentsList";
import { CalendarIcon, Users, UserCheck, UserX, Clock, Send, Download, FileDown, User, Scan } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { downloadClassMonthlyAttendancePdf, downloadIndividualMonthlyAttendancePdf } from "@/utils/generateAttendancePdf";

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface ClassOption {
  id: string;
  name: string;
  section: string | null;
}

interface StudentOption {
  id: string;
  studentId: string;
  name: string;
  fatherName: string;
  rollNumber: string;
  photoUrl?: string;
}

const AttendanceOverview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<AttendanceStats>({ total: 0, present: 0, absent: 0, late: 0, excused: 0 });
  const [loading, setLoading] = useState(true);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  
  // Download states
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [downloadType, setDownloadType] = useState<"class" | "individual">("class");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchStats();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

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

    await Promise.all([fetchStats(), fetchClasses()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("status")
      .eq("date", formattedDate);

    if (attendanceData) {
      setStats({
        total: attendanceData.length,
        present: attendanceData.filter(a => a.status === "present").length,
        absent: attendanceData.filter(a => a.status === "absent").length,
        late: attendanceData.filter(a => a.status === "late").length,
        excused: attendanceData.filter(a => a.status === "excused").length,
      });
    }
  };

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("id, name, section")
      .order("name");
    
    if (data) {
      setClasses(data);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;

    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_id, user_id, father_name")
      .eq("class_id", selectedClass)
      .eq("status", "active");

    if (!studentsData) return;

    const userIds = studentsData.map(s => s.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const mappedStudents = studentsData.map(student => {
      const profile = profilesData?.find(p => p.user_id === student.user_id);
      return {
        id: student.id,
        studentId: student.student_id,
        name: profile?.full_name || "Unknown",
        fatherName: student.father_name || "",
        rollNumber: student.student_id,
        photoUrl: undefined,
      };
    });

    setStudents(mappedStudents);
  };

  const handleSendNotifications = async () => {
    setSendingNotifications(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-attendance-notification", {
        body: { date: format(selectedDate, "yyyy-MM-dd") },
      });

      if (error) throw error;

      toast({
        title: "Notifications Sent",
        description: `Sent ${data.emailsSent || 0} emails and ${data.whatsappSent || 0} WhatsApp messages`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send notifications",
        variant: "destructive",
      });
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleDownloadAttendance = async () => {
    if (!selectedClass) {
      toast({ title: "Please select a class", variant: "destructive" });
      return;
    }

    if (downloadType === "individual" && !selectedStudent) {
      toast({ title: "Please select a student", variant: "destructive" });
      return;
    }

    setDownloading(true);

    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      const selectedClassData = classes.find(c => c.id === selectedClass);

      if (downloadType === "class") {
        // Fetch all students in class
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, student_id, user_id, father_name")
          .eq("class_id", selectedClass)
          .eq("status", "active");

        if (!studentsData || studentsData.length === 0) {
          toast({ title: "No students found in this class", variant: "destructive" });
          return;
        }

        const userIds = studentsData.map(s => s.user_id);
        const studentIds = studentsData.map(s => s.id);

        const [profilesRes, attendanceRes] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
          supabase.from("attendance")
            .select("student_id, date, status")
            .in("student_id", studentIds)
            .gte("date", format(monthStart, "yyyy-MM-dd"))
            .lte("date", format(monthEnd, "yyyy-MM-dd")),
        ]);

        const studentsAttendance = studentsData.map(student => {
          const profile = profilesRes.data?.find(p => p.user_id === student.user_id);
          const studentAttendance = attendanceRes.data?.filter(a => a.student_id === student.id) || [];

          return {
            studentId: student.student_id,
            studentName: profile?.full_name || "Unknown",
            fatherName: student.father_name || "-",
            rollNumber: student.student_id,
            attendance: studentAttendance.map(a => ({ date: a.date, status: a.status })),
          };
        });

        await downloadClassMonthlyAttendancePdf({
          className: selectedClassData?.name || "Unknown",
          section: selectedClassData?.section || null,
          month: selectedMonth,
          students: studentsAttendance,
        });

        toast({ title: "Class attendance report downloaded successfully!" });
      } else {
        // Individual student download
        const student = students.find(s => s.id === selectedStudent);
        if (!student) {
          toast({ title: "Student not found", variant: "destructive" });
          return;
        }

        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("date, status")
          .eq("student_id", selectedStudent)
          .gte("date", format(monthStart, "yyyy-MM-dd"))
          .lte("date", format(monthEnd, "yyyy-MM-dd"));

        await downloadIndividualMonthlyAttendancePdf({
          studentId: student.studentId,
          studentName: student.name,
          fatherName: student.fatherName,
          rollNumber: student.rollNumber,
          className: selectedClassData?.name || "Unknown",
          section: selectedClassData?.section || null,
          month: selectedMonth,
          attendance: (attendanceData || []).map(a => ({ date: a.date, status: a.status })),
          photoUrl: student.photoUrl,
        });

        toast({ title: "Student attendance report downloaded successfully!" });
      }

      setDownloadDialogOpen(false);
    } catch (error: any) {
      console.error("Download error:", error);
      toast({ title: "Failed to download attendance", description: error.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const statCards = [
    { label: "Total Marked", value: stats.total, icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Present", value: stats.present, icon: UserCheck, color: "text-success", bgColor: "bg-success/10" },
    { label: "Absent", value: stats.absent, icon: UserX, color: "text-destructive", bgColor: "bg-destructive/10" },
    { label: "Late", value: stats.late, icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
  ];

  const attendanceRate = stats.total > 0 
    ? Math.round((stats.present / stats.total) * 100) 
    : 0;

  return (
    <AdminLayout title="Attendance Overview" description="View and manage daily attendance">
      {/* Date Picker & Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-64 justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button 
          onClick={handleSendNotifications} 
          disabled={sendingNotifications || stats.absent === 0}
          className="hero-gradient text-primary-foreground"
        >
          <Send className="w-4 h-4 mr-2" />
          {sendingNotifications ? "Sending..." : "Notify Parents of Absences"}
        </Button>

        {/* Barcode Scanner Button */}
        <Button 
          variant="outline" 
          className="border-success text-success hover:bg-success/10"
          onClick={() => navigate("/admin/attendance/scanner")}
        >
          <Scan className="w-4 h-4 mr-2" />
          Barcode Scanner
        </Button>

        {/* Download Attendance Button */}
        <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
              <Download className="w-4 h-4 mr-2" />
              Download Monthly Attendance
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-primary" />
                Download Monthly Attendance
              </DialogTitle>
              <DialogDescription>
                Download attendance report for a class or individual student
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Download Type Selection */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={downloadType === "class" ? "default" : "outline"}
                  onClick={() => { setDownloadType("class"); setSelectedStudent(""); }}
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Whole Class
                </Button>
                <Button
                  variant={downloadType === "individual" ? "default" : "outline"}
                  onClick={() => setDownloadType("individual")}
                  className="w-full"
                >
                  <User className="w-4 h-4 mr-2" />
                  Individual
                </Button>
              </div>

              {/* Month Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Month</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedMonth, "MMMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedMonth}
                      onSelect={(date) => date && setSelectedMonth(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Class Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}{cls.section ? ` - ${cls.section}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Student Selection (only for individual) */}
              {downloadType === "individual" && selectedClass && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Student</label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.rollNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Download Button */}
              <Button 
                onClick={handleDownloadAttendance} 
                disabled={downloading || !selectedClass || (downloadType === "individual" && !selectedStudent)}
                className="w-full hero-gradient text-primary-foreground"
              >
                <Download className="w-4 h-4 mr-2" />
                {downloading ? "Generating PDF..." : "Download PDF"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance Rate */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Attendance Rate</h3>
              <p className="text-sm text-muted-foreground">For {format(selectedDate, "MMMM d, yyyy")}</p>
            </div>
            <span className={`text-3xl font-bold ${attendanceRate >= 90 ? "text-success" : attendanceRate >= 70 ? "text-warning" : "text-destructive"}`}>
              {attendanceRate}%
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${attendanceRate >= 90 ? "bg-success" : attendanceRate >= 70 ? "bg-warning" : "bg-destructive"}`}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Absent Students List */}
      <AbsentStudentsList date={selectedDate} />
    </AdminLayout>
  );
};

export default AttendanceOverview;
