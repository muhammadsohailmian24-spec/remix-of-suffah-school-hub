import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Award, TrendingUp, BookOpen, Download, Loader2, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { generateMarksCertificatePdf, downloadMarksCertificate, MarksCertificateData } from "@/utils/generateMarksCertificatePdf";
import { useToast } from "@/hooks/use-toast";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

interface Result {
  id: string;
  marks_obtained: number;
  grade: string | null;
  remarks: string | null;
  is_published: boolean;
  exams: {
    name: string;
    exam_type: string;
    exam_date: string;
    max_marks: number | null;
    subjects: {
      name: string;
      code: string | null;
    } | null;
  } | null;
}

const ParentResults = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const { toast } = useToast();
  const [results, setResults] = useState<Result[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingDmc, setDownloadingDmc] = useState(false);
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<MarksCertificateData | null>(null);
  const [previewExamType, setPreviewExamType] = useState("");

  useEffect(() => {
    if (studentId) {
      fetchResults();
      fetchStudentName();
    }
  }, [studentId]);

  const fetchStudentName = async () => {
    const { data: student } = await supabase
      .from("students")
      .select("user_id, student_id, class_id")
      .eq("id", studentId)
      .single();

    if (student) {
      setStudentData(student);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, date_of_birth, photo_url")
        .eq("user_id", student.user_id)
        .single();
      
      if (profile) {
        setStudentName(profile.full_name);
        setStudentData((prev: any) => ({ ...prev, ...profile }));
      }

      if (student.class_id) {
        const { data: classData } = await supabase
          .from("classes")
          .select("name, section, grade_level")
          .eq("id", student.class_id)
          .single();
        if (classData) {
          setStudentData((prev: any) => ({ ...prev, class: classData }));
        }
      }
    }
  };

  const fetchResults = async () => {
    const { data } = await supabase
      .from("results")
      .select(`
        id,
        marks_obtained,
        grade,
        remarks,
        is_published,
        exams (
          name,
          exam_type,
          exam_date,
          max_marks,
          subjects (
            name,
            code
          )
        )
      `)
      .eq("student_id", studentId)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    setResults((data as Result[]) || []);
    setLoading(false);
  };

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "secondary";
    switch (grade.toUpperCase()) {
      case "A+":
      case "A": return "default";
      case "B+":
      case "B": return "secondary";
      case "C+":
      case "C": return "outline";
      default: return "destructive";
    }
  };

  const calculatePercentage = (obtained: number, max: number | null) => {
    if (!max) return 0;
    return Math.round((obtained / max) * 100);
  };

  const overallStats = results.length > 0 ? {
    average: Math.round(
      results.reduce((acc, r) => acc + calculatePercentage(r.marks_obtained, r.exams?.max_marks || 100), 0) / results.length
    ),
    highest: Math.max(...results.map(r => calculatePercentage(r.marks_obtained, r.exams?.max_marks || 100))),
    totalExams: results.length,
  } : null;

  // Group results by exam type
  const groupedResults = results.reduce((acc, result) => {
    const type = result.exams?.exam_type || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(result);
    return acc;
  }, {} as Record<string, Result[]>);

  const handleDownloadDmc = async (examType: string) => {
    setDownloadingDmc(true);
    try {
      const examResults = groupedResults[examType] || [];
      if (examResults.length === 0) {
        toast({ title: "No results", description: "No results found for this exam type", variant: "destructive" });
        return;
      }

      const subjects = examResults.map(r => ({
        name: r.exams?.subjects?.name || "Unknown",
        maxMarks: r.exams?.max_marks || 100,
        marksObtained: r.marks_obtained,
        grade: r.grade || undefined,
      }));

      await downloadMarksCertificate({
        studentName: studentName,
        studentId: studentData?.student_id || "",
        className: studentData?.class?.name || "",
        section: studentData?.class?.section || undefined,
        session: new Date().getFullYear().toString(),
        dateOfBirth: studentData?.date_of_birth || undefined,
        examName: examType,
        subjects,
        photoUrl: studentData?.photo_url || undefined,
      });

      toast({ title: "Success", description: "DMC downloaded successfully" });
    } catch (error) {
      console.error("Error downloading DMC:", error);
      toast({ title: "Error", description: "Failed to download DMC", variant: "destructive" });
    } finally {
      setDownloadingDmc(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/parent/children")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exam Results</h1>
            <p className="text-muted-foreground">{studentName}</p>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Published</h3>
              <p className="text-muted-foreground">
                Results will appear here once they are published by teachers.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Overview */}
            {overallStats && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-primary/20">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold">{overallStats.average}%</div>
                        <p className="text-sm text-muted-foreground">Average Score</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-accent/20">
                        <Award className="h-6 w-6 text-accent-foreground" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold">{overallStats.highest}%</div>
                        <p className="text-sm text-muted-foreground">Highest Score</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-muted">
                        <BookOpen className="h-6 w-6 text-foreground" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold">{overallStats.totalExams}</div>
                        <p className="text-sm text-muted-foreground">Total Exams</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Results by Exam Type */}
            {Object.entries(groupedResults).map(([examType, typeResults]) => (
              <Card key={examType}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    {examType} Examinations
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDmc(examType)}
                    disabled={downloadingDmc}
                  >
                    {downloadingDmc ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download DMC
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {typeResults.map(result => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{result.exams?.subjects?.name || "Unknown Subject"}</h4>
                            {result.exams?.subjects?.code && (
                              <Badge variant="outline" className="text-xs">
                                {result.exams.subjects.code}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {result.exams?.name} • {result.exams?.exam_date && format(parseISO(result.exams.exam_date), "MMM d, yyyy")}
                          </p>
                          {result.remarks && (
                            <p className="text-sm text-muted-foreground italic">"{result.remarks}"</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold">
                              {result.marks_obtained}/{result.exams?.max_marks || 100}
                            </span>
                            <Badge variant={getGradeColor(result.grade)}>
                              {result.grade || "N/A"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {calculatePercentage(result.marks_obtained, result.exams?.max_marks)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </main>
    </div>
  );
};

export default ParentResults;
