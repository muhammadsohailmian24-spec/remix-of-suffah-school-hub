import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, LogOut, BookOpen, FileText, Award, Calendar, Download, ClipboardList, Eye
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PortalSidebarLink from "@/components/PortalSidebarLink";
import { format, parseISO } from "date-fns";
import { generateRollNumberSlipPdf, downloadRollNumberSlip, RollNumberSlipData } from "@/utils/generateRollNumberSlipPdf";
import { useToast } from "@/hooks/use-toast";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

interface Exam {
  id: string;
  name: string;
  exam_type: string;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  max_marks: number | null;
  subjects: { name: string } | null;
}

interface StudentInfo {
  id: string;
  studentId: string;
  name: string;
  fatherName?: string;
  className: string;
  section?: string;
  photoUrl?: string;
}

const StudentExams = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<RollNumberSlipData | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || roleData.role !== "student") { navigate("/dashboard"); return; }

    await fetchData(session.user.id);
  };

  const fetchData = async (userId: string) => {
    try {
      // Get student record
      const { data: student } = await supabase
        .from("students")
        .select("id, student_id, class_id")
        .eq("user_id", userId)
        .single();

      if (!student || !student.class_id) {
        setLoading(false);
        return;
      }

      // Get profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, photo_url")
        .eq("user_id", userId)
        .single();

      // Get class info
      const { data: classData } = await supabase
        .from("classes")
        .select("name, section")
        .eq("id", student.class_id)
        .single();

      setStudentInfo({
        id: student.id,
        studentId: student.student_id,
        name: profile?.full_name || "Student",
        className: classData?.name || "",
        section: classData?.section || undefined,
        photoUrl: (profile as any)?.photo_url || undefined,
      });

      // Fetch exams for student's class
      const { data: examsData } = await supabase
        .from("exams")
        .select(`
          id,
          name,
          exam_type,
          exam_date,
          start_time,
          end_time,
          max_marks,
          subjects (name)
        `)
        .eq("class_id", student.class_id)
        .gte("exam_date", new Date().toISOString().split('T')[0])
        .order("exam_date", { ascending: true });

      setExams((examsData as Exam[]) || []);
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadRollSlip = async (exam: Exam) => {
    if (!studentInfo) return;
    setDownloading(exam.id);

    try {
      // Get all exams with same name (multi-subject exam)
      const { data: relatedExams } = await supabase
        .from("exams")
        .select(`
          id,
          name,
          exam_date,
          start_time,
          end_time,
          subjects (name)
        `)
        .eq("name", exam.name)
        .eq("class_id", (await supabase.from("students").select("class_id").eq("id", studentInfo.id).single()).data?.class_id)
        .order("exam_date", { ascending: true });

      const subjects = (relatedExams || [exam]).map(e => ({
        name: (e as any).subjects?.name || "Unknown",
        date: format(parseISO(e.exam_date), "dd MMM yyyy"),
        time: e.start_time && e.end_time ? `${e.start_time} - ${e.end_time}` : undefined,
      }));

      await downloadRollNumberSlip({
        studentName: studentInfo.name,
        studentId: studentInfo.studentId,
        className: studentInfo.className,
        section: studentInfo.section,
        rollNumber: studentInfo.studentId,
        examName: exam.name,
        examDate: format(parseISO(exam.exam_date), "dd MMM yyyy"),
        examTime: exam.start_time && exam.end_time ? `${exam.start_time} - ${exam.end_time}` : undefined,
        subjects: subjects,
        photoUrl: studentInfo.photoUrl,
        schoolName: "The Suffah Public School & College",
        schoolAddress: "Saidu Sharif, Swat - Pakistan",
      });

      toast({ title: "Success", description: "Roll number slip downloaded" });
    } catch (error) {
      console.error("Error downloading roll slip:", error);
      toast({ title: "Error", description: "Failed to download roll number slip", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const handleSignOut = async () => { 
    await supabase.auth.signOut(); 
    navigate("/"); 
  };

  const getExamTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      midterm: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      final: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      quiz: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      practical: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return <Badge className={variants[type] || "bg-muted"}>{type}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader portalName="Student Portal" onSignOut={handleSignOut} />

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <PortalSidebarLink to="/dashboard" icon={BookOpen} label="Dashboard" isDashboard />
            <PortalSidebarLink to="/student/courses" icon={BookOpen} label="My Courses" />
            <PortalSidebarLink to="/student/assignments" icon={FileText} label="Assignments" />
            <PortalSidebarLink to="/student/exams" icon={ClipboardList} label="Exams" isActive />
            <PortalSidebarLink to="/student/results" icon={Award} label="Results" />
            <PortalSidebarLink to="/student/timetable" icon={Calendar} label="Timetable" />
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">Upcoming Exams</h1>
            <p className="text-muted-foreground">
              {studentInfo?.name} • {studentInfo?.className}{studentInfo?.section ? ` - ${studentInfo.section}` : ""}
            </p>
          </div>

          {exams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Exams</h3>
                <p className="text-muted-foreground">There are no scheduled exams at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <Card key={exam.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{exam.name}</CardTitle>
                        <CardDescription>{exam.subjects?.name || "Multiple Subjects"}</CardDescription>
                      </div>
                      {getExamTypeBadge(exam.exam_type)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{format(parseISO(exam.exam_date), "EEEE, MMMM d, yyyy")}</span>
                      </div>
                      {exam.start_time && exam.end_time && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Time: {exam.start_time} - {exam.end_time}</span>
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        Max Marks: {exam.max_marks || 100}
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleDownloadRollSlip(exam)}
                      disabled={downloading === exam.id}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {downloading === exam.id ? "Downloading..." : "Download Roll Number Slip"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentExams;
