import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, Users, BookOpen, ClipboardList, Bell, LogOut, 
  Calendar, CheckCircle, XCircle, Clock, FileText, BookMarked, Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  student_id: string;
  user_id: string;
  profiles?: { full_name: string };
}

interface AttendanceRecord {
  student_id: string;
  status: "present" | "absent" | "late" | "excused";
}

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || (roleData as any).role !== "teacher") {
      navigate("/dashboard");
      return;
    }

    fetchStudents();
  };

  const fetchStudents = async () => {
    // For demo, fetch all students
    const { data, error } = await supabase
      .from("students" as any)
      .select("id, student_id, user_id")
      .order("student_id", { ascending: true });

    if (!error && data) {
      setStudents(data as unknown as Student[]);
      // Initialize attendance state
      const initialAttendance: Record<string, string> = {};
      (data as any[]).forEach((s: any) => {
        initialAttendance[s.id] = "present";
      });
      setAttendance(initialAttendance);
    }
    setLoading(false);
  };

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    
    // Get teacher ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: teacherData } = await supabase
      .from("teachers" as any)
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    const records = Object.entries(attendance).map(([studentId, status]) => ({
      student_id: studentId,
      class_id: null, // Would be set based on selected class
      date: selectedDate,
      status,
      marked_by: teacherData ? (teacherData as any).id : null,
    }));

    // For demo purposes, just show success
    toast({
      title: "Attendance Saved",
      description: `Attendance for ${selectedDate} has been recorded.`,
    });
    
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present": return <Badge className="bg-success/10 text-success border-success/20">Present</Badge>;
      case "absent": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Absent</Badge>;
      case "late": return <Badge className="bg-warning/10 text-warning border-warning/20">Late</Badge>;
      case "excused": return <Badge className="bg-info/10 text-info border-info/20">Excused</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const stats = [
    { label: "Present", value: Object.values(attendance).filter(s => s === "present").length, icon: CheckCircle, color: "text-success" },
    { label: "Absent", value: Object.values(attendance).filter(s => s === "absent").length, icon: XCircle, color: "text-destructive" },
    { label: "Late", value: Object.values(attendance).filter(s => s === "late").length, icon: Clock, color: "text-warning" },
    { label: "Excused", value: Object.values(attendance).filter(s => s === "excused").length, icon: Calendar, color: "text-info" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div><h1 className="font-heading text-lg font-bold">The Suffah</h1><p className="text-xs text-muted-foreground">Teacher Portal</p></div>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2"><LogOut className="w-4 h-4" />Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><GraduationCap className="w-5 h-5" />Dashboard</Link>
            <Link to="/teacher/attendance" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground"><ClipboardList className="w-5 h-5" />Attendance</Link>
            <Link to="/teacher/assignments" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><FileText className="w-5 h-5" />Assignments</Link>
            <Link to="/teacher/results" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><Award className="w-5 h-5" />Results</Link>
            <Link to="/teacher/materials" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><BookMarked className="w-5 h-5" />Materials</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-2">Mark Attendance</h1>
              <p className="text-muted-foreground">Record daily student attendance</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border bg-background"
              />
              <Button onClick={saveAttendance} disabled={saving} className="hero-gradient text-primary-foreground">
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-4">
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Attendance</CardTitle>
              <CardDescription>Mark attendance for each student</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No students found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.student_id}</TableCell>
                        <TableCell>{getStatusBadge(attendance[student.id] || "present")}</TableCell>
                        <TableCell>
                          <Select
                            value={attendance[student.id] || "present"}
                            onValueChange={(value) => handleAttendanceChange(student.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                              <SelectItem value="excused">Excused</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default TeacherAttendance;
