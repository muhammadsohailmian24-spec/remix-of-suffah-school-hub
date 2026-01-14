import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Bell, LogOut, BookOpen, FileText, Award, Calendar, TrendingUp, Download, ClipboardList, Eye
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PortalSidebarLink from "@/components/PortalSidebarLink";
import { format, parseISO } from "date-fns";
import { generateMarksCertificatePdf, downloadMarksCertificate, MarksCertificateData } from "@/utils/generateMarksCertificatePdf";
import { useToast } from "@/hooks/use-toast";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

interface Result {
  id: string;
  marks_obtained: number;
  grade: string | null;
  remarks: string | null;
  exams: {
    name: string;
    exam_type: string;
    max_marks: number | null;
    exam_date: string;
    subjects: {
      name: string;
    } | null;
  } | null;
}

const StudentResults = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{ 
    name: string; 
    class: string; 
    studentId: string;
    photoUrl?: string;
    dateOfBirth?: string;
  } | null>(null);
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<MarksCertificateData | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || roleData.role !== "student") { navigate("/dashboard"); return; }

    await fetchResults(session.user.id);
  };

  const fetchResults = async (userId: string) => {
    try {
      // Get student record
      const { data: student } = await supabase
        .from("students")
        .select("id, class_id, student_id")
        .eq("user_id", userId)
        .single();

      if (!student) {
        setLoading(false);
        return;
      }

      // Get profile and class info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, date_of_birth, photo_url")
        .eq("user_id", userId)
        .single();

      let className = "";
      if (student.class_id) {
        const { data: classData } = await supabase
          .from("classes")
          .select("name, section")
          .eq("id", student.class_id)
          .single();
        className = classData ? `${classData.name} ${classData.section || ""}`.trim() : "";
      }

      setStudentInfo({
        name: profile?.full_name || "Student",
        class: className,
        studentId: student.student_id,
        photoUrl: (profile as any)?.photo_url || undefined,
        dateOfBirth: profile?.date_of_birth || undefined,
      });

      // Fetch published results
      const { data: resultsData } = await supabase
        .from("results")
        .select(`
          id,
          marks_obtained,
          grade,
          remarks,
          exams (
            name,
            exam_type,
            max_marks,
            exam_date,
            subjects (name)
          )
        `)
        .eq("student_id", student.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      setResults((resultsData as Result[]) || []);
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => { 
    await supabase.auth.signOut(); 
    navigate("/"); 
  };

  const prepareCertificateData = (): MarksCertificateData => {
    const subjects = results.map(r => ({
      name: r.exams?.subjects?.name || "Unknown",
      maxMarks: r.exams?.max_marks || 100,
      marksObtained: r.marks_obtained,
      grade: r.grade || undefined,
    }));

    return {
      studentName: studentInfo?.name || "",
      studentId: studentInfo?.studentId || "",
      rollNumber: studentInfo?.studentId || "",
      className: studentInfo?.class || "",
      session: new Date().getFullYear().toString(),
      dateOfBirth: studentInfo?.dateOfBirth,
      examName: results[0]?.exams?.name || "Annual Examination",
      subjects,
      photoUrl: studentInfo?.photoUrl,
      schoolName: "THE SUFFAH PUBLIC SCHOOL & COLLEGE",
      schoolAddress: "SAIDU SHARIF SWAT",
    };
  };

  const handlePreviewCertificate = () => {
    if (!studentInfo || results.length === 0) return;
    const data = prepareCertificateData();
    setPreviewData(data);
    setPreviewOpen(true);
  };

  const handleDownloadCertificate = async () => {
    if (!studentInfo || results.length === 0) return;
    setDownloading(true);
    try {
      const data = prepareCertificateData();
      await downloadMarksCertificate(data);
      toast({ title: "Success", description: "Marks certificate downloaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to download certificate", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const getGradeBadge = (grade: string | null) => {
    if (!grade) return null;
    const colors: Record<string, string> = {
      'A+': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'A': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'B+': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'B': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'C+': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'C': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'D': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'F': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return <Badge className={colors[grade] || 'bg-muted'}>{grade}</Badge>;
  };

  const calculateStats = () => {
    if (results.length === 0) return { avg: 0, highest: 0, total: 0, subjects: 0 };
    
    const percentages = results.map(r => 
      (r.marks_obtained / (r.exams?.max_marks || 100)) * 100
    );
    
    const subjects = new Set(results.map(r => r.exams?.subjects?.name)).size;
    
    return {
      avg: percentages.reduce((a, b) => a + b, 0) / percentages.length,
      highest: Math.max(...percentages),
      total: results.length,
      subjects,
    };
  };

  const stats = calculateStats();

  const getOverallGrade = (avg: number) => {
    if (avg >= 90) return "A+";
    if (avg >= 80) return "A";
    if (avg >= 70) return "B+";
    if (avg >= 60) return "B";
    if (avg >= 50) return "C";
    return "F";
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
            <PortalSidebarLink to="/student/exams" icon={ClipboardList} label="Exams" />
            <PortalSidebarLink to="/student/results" icon={Award} label="Results" isActive />
            <PortalSidebarLink to="/student/timetable" icon={Calendar} label="Timetable" />
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-2">My Results</h1>
              <p className="text-muted-foreground">
                {studentInfo?.name} {studentInfo?.class && `• ${studentInfo.class}`}
              </p>
            </div>
            {results.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePreviewCertificate}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button onClick={handleDownloadCertificate} disabled={downloading}>
                  <Download className="w-4 h-4 mr-2" />
                  {downloading ? "Downloading..." : "Download DMC"}
                </Button>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <p className="text-3xl font-bold">{stats.avg.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-3xl font-bold">{getOverallGrade(stats.avg)}</p>
                <p className="text-sm text-muted-foreground">Overall Grade</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Exams</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold">{stats.subjects}</p>
                <p className="text-sm text-muted-foreground">Subjects</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Exam Results</CardTitle>
              <CardDescription>Your performance in exams and quizzes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Results Published Yet</h3>
                  <p>Your exam results will appear here once they are published.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Exam</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">
                          {result.exams?.subjects?.name || "Unknown"}
                        </TableCell>
                        <TableCell>{result.exams?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {result.exams?.exam_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {result.exams?.exam_date && format(parseISO(result.exams.exam_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{result.marks_obtained}</span>
                          <span className="text-muted-foreground">/{result.exams?.max_marks || 100}</span>
                        </TableCell>
                        <TableCell>{getGradeBadge(result.grade)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {result.remarks || "-"}
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

      {/* Document Preview Dialog */}
      {previewData && (
        <DocumentPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title="Marks Certificate Preview"
          generatePdf={() => generateMarksCertificatePdf(previewData)}
          filename={`DMC-${studentInfo?.studentId || "student"}.pdf`}
        />
      )}
    </div>
  );
};

export default StudentResults;