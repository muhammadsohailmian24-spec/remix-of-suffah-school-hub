import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Edit, Trash2, ClipboardList, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { generateAwardListPdf, downloadAwardList, AwardListData } from "@/utils/generateAwardListPdf";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  name: string;
  exam_type: string;
  exam_date: string;
  max_marks: number | null;
  passing_marks: number | null;
  start_time: string | null;
  end_time: string | null;
  class_id: string;
  subject_id: string;
  classes: { name: string } | null;
  subjects: { name: string } | null;
}

const TeacherExams = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<AwardListData | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    exam_type: "quiz",
    exam_date: "",
    max_marks: "100",
    passing_marks: "40",
    start_time: "",
    end_time: "",
    class_id: "",
    subject_id: "",
  });

  useEffect(() => {
    fetchTeacherAndData();
  }, []);

  const fetchTeacherAndData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Fetch teacher record
    let { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    // If no teacher record exists, create one
    if (!teacher) {
      console.log("No teacher record found, creating one...");
      const employeeId = `EMP${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: newTeacher, error: createError } = await supabase
        .from("teachers")
        .insert({
          user_id: user.id,
          employee_id: employeeId,
          joining_date: new Date().toISOString().split('T')[0],
        })
        .select("id")
        .single();
      
      if (createError) {
        console.error("Failed to create teacher record:", createError);
        toast({ title: "Error", description: "Failed to initialize teacher profile", variant: "destructive" });
      } else {
        teacher = newTeacher;
        console.log("Created teacher record:", newTeacher);
      }
    }

    if (teacher) {
      setTeacherId(teacher.id);
      console.log("Teacher ID set:", teacher.id);

      // Fetch only classes and subjects assigned to this teacher via timetable
      const { data: timetableData } = await supabase
        .from("timetable")
        .select("class_id, subject_id, classes(id, name), subjects(id, name)")
        .eq("teacher_id", teacher.id);

      if (timetableData) {
        // Get unique classes from timetable
        const uniqueClasses = new Map<string, Class>();
        const uniqueSubjects = new Map<string, Subject>();
        const assignedClassIds: string[] = [];

        timetableData.forEach((entry: any) => {
          if (entry.classes && !uniqueClasses.has(entry.class_id)) {
            uniqueClasses.set(entry.class_id, { id: entry.classes.id, name: entry.classes.name });
            assignedClassIds.push(entry.class_id);
          }
          if (entry.subjects && !uniqueSubjects.has(entry.subject_id)) {
            uniqueSubjects.set(entry.subject_id, { id: entry.subjects.id, name: entry.subjects.name });
          }
        });

        setClasses(Array.from(uniqueClasses.values()));
        setSubjects(Array.from(uniqueSubjects.values()));

        // Fetch exams only for assigned classes
        if (assignedClassIds.length > 0) {
          const { data: examsData } = await supabase
            .from("exams")
            .select(`*, classes(name), subjects(name)`)
            .in("class_id", assignedClassIds)
            .order("exam_date", { ascending: false });
          setExams((examsData as Exam[]) || []);
        } else {
          setExams([]);
        }
      }
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      exam_type: "quiz",
      exam_date: "",
      max_marks: "100",
      passing_marks: "40",
      start_time: "",
      end_time: "",
      class_id: "",
      subject_id: "",
    });
    setEditingExam(null);
  };

  const openEditDialog = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      exam_type: exam.exam_type,
      exam_date: exam.exam_date,
      max_marks: String(exam.max_marks || 100),
      passing_marks: String(exam.passing_marks || 40),
      start_time: exam.start_time || "",
      end_time: exam.end_time || "",
      class_id: exam.class_id,
      subject_id: exam.subject_id,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.class_id || !formData.subject_id) {
      toast({ title: "Error", description: "Please select a class and subject", variant: "destructive" });
      return;
    }

    const examData = {
      name: formData.name,
      exam_type: formData.exam_type,
      exam_date: formData.exam_date,
      max_marks: parseInt(formData.max_marks),
      passing_marks: parseInt(formData.passing_marks),
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      class_id: formData.class_id,
      subject_id: formData.subject_id,
    };

    console.log("Exam data to save:", examData);

    if (editingExam) {
      const { data, error } = await supabase.from("exams").update(examData).eq("id", editingExam.id).select();
      console.log("Update result:", { data, error });
      if (error) {
        console.error("Exam update error:", error);
        toast({ title: "Error", description: `Failed to update exam: ${error.message}`, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Exam updated" });
    } else {
      const { data, error } = await supabase.from("exams").insert(examData).select();
      console.log("Insert result:", { data, error });
      if (error) {
        console.error("Exam insert error:", error);
        toast({ title: "Error", description: `Failed to create exam: ${error.message}`, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Exam scheduled" });
    }

    setDialogOpen(false);
    resetForm();
    fetchTeacherAndData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exam?")) return;
    await supabase.from("exams").delete().eq("id", id);
    toast({ title: "Deleted", description: "Exam removed" });
    fetchTeacherAndData();
  };

  const prepareAwardListData = async (exam: Exam): Promise<AwardListData> => {
    // Fetch students for this class with proper join
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, student_id, user_id, class_id, father_name")
      .eq("class_id", exam.class_id)
      .eq("status", "active")
      .order("student_id");

    if (studentsError || !studentsData || studentsData.length === 0) {
      throw new Error("No students found in this class");
    }

    // Fetch profiles separately
    const userIds = studentsData.map(s => s.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

    // Fetch class info
    const { data: classData } = await supabase
      .from("classes")
      .select("name, section")
      .eq("id", exam.class_id)
      .single();

    // Fetch results for this exam (including created_at for the date)
    const studentIds = studentsData.map(s => s.id);
    const { data: resultsData } = await supabase
      .from("results")
      .select("student_id, marks_obtained, created_at")
      .eq("exam_id", exam.id)
      .in("student_id", studentIds);

    const resultsMap = new Map(resultsData?.map(r => [r.student_id, r.marks_obtained]) || []);

    // Get the most recent result upload date
    let resultUploadDate = "";
    if (resultsData && resultsData.length > 0) {
      const latestResult = resultsData.reduce((latest, current) => {
        const latestDate = new Date(latest.created_at || 0);
        const currentDate = new Date(current.created_at || 0);
        return currentDate > latestDate ? current : latest;
      });
      if (latestResult.created_at) {
        resultUploadDate = format(parseISO(latestResult.created_at), "dd-MMM-yyyy");
      }
    }

    // Get current teacher's name
    const { data: { session } } = await supabase.auth.getSession();
    let teacherName = "";
    if (session?.user?.id) {
      const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", session.user.id)
        .single();
      teacherName = teacherProfile?.full_name || "";
    }

    const students = studentsData.map((student, index) => ({
      sr_no: index + 1,
      student_id: student.student_id,
      name: profileMap.get(student.user_id) || "",
      father_name: student.father_name || "",
      theory_marks: resultsMap.get(student.id) || "",
      practical_marks: "",
      total_marks: resultsMap.get(student.id) || "",
    }));

    const currentYear = new Date().getFullYear();

    return {
      session: `${currentYear}`,
      date: resultUploadDate || format(parseISO(exam.exam_date), "dd-MMM-yyyy"),
      className: classData?.name || exam.classes?.name || "",
      section: classData?.section || "",
      subject: exam.subjects?.name || "",
      teacherName,
      maxMarks: String(exam.max_marks || "100"),
      students,
    };
  };

  const handlePreviewAwardList = async (exam: Exam) => {
    try {
      const data = await prepareAwardListData(exam);
      setPreviewData(data);
      setPreviewFilename(`Award-List-${exam.classes?.name}-${exam.subjects?.name}`);
      setPreviewOpen(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to prepare preview", variant: "destructive" });
    }
  };

  const handleDownloadAwardList = async (exam: Exam) => {
    try {
      const data = await prepareAwardListData(exam);
      await downloadAwardList(data, `Award-List-${exam.classes?.name}-${exam.subjects?.name}`);
      toast({ title: "Downloaded", description: "Award list PDF downloaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to download", variant: "destructive" });
    }
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
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Schedule Exams</h1>
              <p className="text-muted-foreground">Create and manage your exams</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Schedule Exam</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingExam ? "Edit Exam" : "Schedule New Exam"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Exam Name</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g., Unit Test 1" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={formData.exam_type} onValueChange={(v) => setFormData({ ...formData, exam_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="midterm">Midterm</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                        <SelectItem value="practical">Practical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={formData.exam_date} onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Class</Label>
                    <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Max Marks</Label>
                    <Input type="number" value={formData.max_marks} onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Passing Marks</Label>
                    <Input type="number" value={formData.passing_marks} onChange={(e) => setFormData({ ...formData, passing_marks: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Start Time</Label>
                    <Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingExam ? "Update" : "Schedule"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map(exam => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.name}</TableCell>
                    <TableCell><Badge variant="outline">{exam.exam_type}</Badge></TableCell>
                    <TableCell>{exam.classes?.name}</TableCell>
                    <TableCell>{exam.subjects?.name}</TableCell>
                    <TableCell>{format(parseISO(exam.exam_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{exam.max_marks}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePreviewAwardList(exam)} title="Preview Award List">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadAwardList(exam)} title="Download Award List">
                          <Download className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Enter Results">
                          <Link to="/teacher/results">
                            <ClipboardList className="h-4 w-4 text-primary" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(exam)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {exams.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No exams scheduled yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Document Preview Dialog */}
      {previewData && (
        <DocumentPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title="Award List Preview"
          generatePdf={() => generateAwardListPdf(previewData)}
          filename={`${previewFilename}.pdf`}
        />
      )}
    </div>
  );
};

export default TeacherExams;
