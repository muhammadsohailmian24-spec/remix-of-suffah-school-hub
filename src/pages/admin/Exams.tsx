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
import { ArrowLeft, Plus, Edit, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { downloadAwardList } from "@/utils/generateAwardListPdf";

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

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

const AdminExams = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    exam_type: "midterm",
    exam_date: "",
    max_marks: "100",
    passing_marks: "40",
    start_time: "",
    end_time: "",
    class_id: "",
    subject_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [examsRes, classesRes, subjectsRes] = await Promise.all([
      supabase.from("exams").select(`*, classes(name), subjects(name)`).order("exam_date", { ascending: false }),
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name").order("name"),
    ]);

    setExams((examsRes.data as Exam[]) || []);
    setClasses(classesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      exam_type: "midterm",
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

    if (editingExam) {
      const { error } = await supabase.from("exams").update(examData).eq("id", editingExam.id);
      if (error) {
        toast({ title: "Error", description: "Failed to update exam", variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Exam updated successfully" });
    } else {
      const { error } = await supabase.from("exams").insert(examData);
      if (error) {
        toast({ title: "Error", description: "Failed to create exam", variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Exam created successfully" });
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exam?")) return;
    
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete exam", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Exam deleted successfully" });
    fetchData();
  };

  const handleDownloadAwardList = async (exam: Exam) => {
    // Fetch students for this class
    const { data: studentsData } = await supabase
      .from("students")
      .select(`
        id,
        student_id,
        profiles!students_user_id_fkey(full_name),
        classes(name, section)
      `)
      .eq("class_id", exam.class_id)
      .eq("status", "active")
      .order("student_id");

    if (!studentsData || studentsData.length === 0) {
      toast({ title: "No students", description: "No students found in this class", variant: "destructive" });
      return;
    }

    // Fetch father's name from profiles (stored in full_name field as "Student Name s/o Father Name" or we get it from address/phone context)
    // For simplicity, we'll use a placeholder or fetch from parent records
    const studentIds = studentsData.map(s => s.id);
    const { data: parentLinks } = await supabase
      .from("student_parents")
      .select(`
        student_id,
        parents!inner(
          profiles!parents_user_id_fkey(full_name)
        )
      `)
      .in("student_id", studentIds)
      .eq("is_primary", true);

    const fatherNameMap = new Map<string, string>();
    parentLinks?.forEach((link: any) => {
      fatherNameMap.set(link.student_id, link.parents?.profiles?.full_name || "");
    });

    const students = studentsData.map((student: any, index) => ({
      sr_no: index + 1,
      student_id: student.student_id,
      name: student.profiles?.full_name || "",
      father_name: fatherNameMap.get(student.id) || "",
    }));

    const currentYear = new Date().getFullYear();
    const classInfo = studentsData[0]?.classes;

    await downloadAwardList({
      session: `${currentYear}`,
      date: format(parseISO(exam.exam_date), "dd-MMM-yyyy"),
      className: classInfo?.name || exam.classes?.name || "",
      section: classInfo?.section || "",
      subject: exam.subjects?.name || "",
      teacherName: "",
      marks: String(exam.max_marks || ""),
      students,
    }, `Award-List-${exam.classes?.name}-${exam.subjects?.name}`);

    toast({ title: "Downloaded", description: "Award list PDF downloaded successfully" });
  };

  const getExamTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      midterm: "default",
      final: "secondary",
      quiz: "outline",
      assignment: "outline",
    };
    return <Badge variant={variants[type] || "outline"}>{type}</Badge>;
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
              <h1 className="text-2xl font-bold text-foreground">Exam Management</h1>
              <p className="text-muted-foreground">Schedule and manage exams</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Exam</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingExam ? "Edit Exam" : "Create New Exam"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Exam Name</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Exam Type</Label>
                    <Select value={formData.exam_type} onValueChange={(v) => setFormData({ ...formData, exam_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="midterm">Midterm</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="assignment">Assignment</SelectItem>
                        <SelectItem value="practical">Practical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Exam Date</Label>
                    <Input type="date" value={formData.exam_date} onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Class</Label>
                    <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
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
                  <Button type="submit">{editingExam ? "Update" : "Create"}</Button>
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
                  <TableHead>Exam Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map(exam => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.name}</TableCell>
                    <TableCell>{getExamTypeBadge(exam.exam_type)}</TableCell>
                    <TableCell>{exam.classes?.name}</TableCell>
                    <TableCell>{exam.subjects?.name}</TableCell>
                    <TableCell>{format(parseISO(exam.exam_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{exam.start_time && exam.end_time ? `${exam.start_time} - ${exam.end_time}` : "-"}</TableCell>
                    <TableCell>{exam.max_marks} (Pass: {exam.passing_marks})</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadAwardList(exam)} title="Download Award List">
                        <Download className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(exam)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {exams.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No exams scheduled. Click "Add Exam" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminExams;
