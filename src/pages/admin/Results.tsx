import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Award, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";

interface Exam {
  id: string;
  name: string;
  exam_type: string;
  exam_date: string;
  max_marks: number | null;
  class_id: string;
  classes: { name: string } | null;
  subjects: { name: string } | null;
}

interface Student {
  id: string;
  student_id: string;
  profiles: { full_name: string } | null;
}

interface Result {
  id: string;
  student_id: string;
  marks_obtained: number;
  grade: string | null;
  remarks: string | null;
  is_published: boolean;
}

const AdminResults = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    const { data } = await supabase
      .from("exams")
      .select(`
        id,
        name,
        exam_type,
        exam_date,
        max_marks,
        class_id,
        classes (name),
        subjects (name)
      `)
      .order("exam_date", { ascending: false });

    setExams((data as Exam[]) || []);
    setLoading(false);
  };

  const fetchStudentsAndResults = async (exam: Exam) => {
    setSelectedExam(exam);
    setLoading(true);

    // Fetch students in the class
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_id, user_id")
      .eq("class_id", exam.class_id)
      .eq("status", "active");

    if (studentsData) {
      const enrichedStudents = await Promise.all(
        studentsData.map(async (student) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", student.user_id)
            .single();
          return { ...student, profiles: profile };
        })
      );
      setStudents(enrichedStudents as Student[]);
    }

    // Fetch existing results
    const { data: resultsData } = await supabase
      .from("results")
      .select("*")
      .eq("exam_id", exam.id);

    const resultsMap: Record<string, Result> = {};
    resultsData?.forEach(r => {
      resultsMap[r.student_id] = r;
    });
    setResults(resultsMap);
    setLoading(false);
  };

  const calculateGrade = (marks: number, maxMarks: number): string => {
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C+";
    if (percentage >= 40) return "C";
    return "F";
  };

  const handleMarkChange = (studentId: string, marks: number) => {
    const maxMarks = selectedExam?.max_marks || 100;
    const grade = calculateGrade(marks, maxMarks);
    
    setResults(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        marks_obtained: marks,
        grade,
        is_published: prev[studentId]?.is_published || false,
      } as Result,
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setResults(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      } as Result,
    }));
  };

  const sendResultsNotification = async (classId: string, examName: string, subjectName: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          type: "results_published",
          classId,
          title: examName,
          examName,
          subjectName,
          details: `Results for "${examName}" (${subjectName}) have been published. Log in to view your grades and remarks.`,
        },
      });
      if (error) console.error("Notification error:", error);
      else console.log("Results notification sent successfully");
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  };

  const saveResults = async (publish: boolean = false) => {
    if (!selectedExam) return;
    setSaving(true);

    try {
      for (const studentId of Object.keys(results)) {
        const result = results[studentId];
        if (result.marks_obtained === undefined) continue;

        const resultData = {
          exam_id: selectedExam.id,
          student_id: studentId,
          marks_obtained: result.marks_obtained,
          grade: result.grade,
          remarks: result.remarks,
          is_published: publish,
        };

        if (result.id) {
          await supabase.from("results").update(resultData).eq("id", result.id);
        } else {
          await supabase.from("results").insert(resultData);
        }
      }

      // Send notifications when publishing
      if (publish) {
        const subjectName = selectedExam.subjects?.name || "Unknown Subject";
        await sendResultsNotification(selectedExam.class_id, selectedExam.name, subjectName);
      }

      toast({
        title: publish ? "Results Published" : "Results Saved",
        description: publish ? "Results are now visible to students and parents. Notifications sent!" : "Results saved as draft.",
      });

      fetchStudentsAndResults(selectedExam);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !selectedExam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => selectedExam ? setSelectedExam(null) : navigate("/admin/exams")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {selectedExam ? `Enter Results - ${selectedExam.name}` : "Results Management"}
              </h1>
              <p className="text-muted-foreground">
                {selectedExam ? `${selectedExam.subjects?.name} • ${selectedExam.classes?.name}` : "Select an exam to enter results"}
              </p>
            </div>
          </div>
          {selectedExam && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => saveResults(false)} disabled={saving}>
                Save Draft
              </Button>
              <Button onClick={() => saveResults(true)} disabled={saving}>
                Publish Results
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="p-6">
        {!selectedExam ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exams.map(exam => (
              <Card 
                key={exam.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => fetchStudentsAndResults(exam)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    {exam.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subject:</span>
                      <span>{exam.subjects?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Class:</span>
                      <span>{exam.classes?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline">{exam.exam_type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Marks:</span>
                      <span>{exam.max_marks || 100}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {exams.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Exams Found</h3>
                  <p className="text-muted-foreground">Create exams first to enter results.</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Student Results</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No students found in this class.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground pb-2 border-b">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">Student</div>
                    <div className="col-span-2">Marks (/{selectedExam?.max_marks || 100})</div>
                    <div className="col-span-1">Grade</div>
                    <div className="col-span-3">Remarks</div>
                    <div className="col-span-2">Status</div>
                  </div>
                  {filteredStudents.map((student, index) => {
                    const result = results[student.id];
                    return (
                      <div key={student.id} className="grid grid-cols-12 gap-4 items-center py-2">
                        <div className="col-span-1 text-muted-foreground">{index + 1}</div>
                        <div className="col-span-3">
                          <p className="font-medium">{student.profiles?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.student_id}</p>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min={0}
                            max={selectedExam?.max_marks || 100}
                            value={result?.marks_obtained ?? ""}
                            onChange={(e) => handleMarkChange(student.id, parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-1">
                          <Badge variant={result?.grade === "F" ? "destructive" : "default"}>
                            {result?.grade || "-"}
                          </Badge>
                        </div>
                        <div className="col-span-3">
                          <Input
                            value={result?.remarks || ""}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            placeholder="Optional remarks"
                          />
                        </div>
                        <div className="col-span-2">
                          {result?.id ? (
                            <Badge variant={result.is_published ? "default" : "secondary"}>
                              {result.is_published ? "Published" : "Draft"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not entered</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </AdminLayout>
    </AdminLayout>
  );
};

export default AdminResults;
