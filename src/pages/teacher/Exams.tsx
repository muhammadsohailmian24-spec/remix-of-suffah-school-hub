import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Edit, Trash2, Award, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";

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
    if (!user) return;

    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (teacher) {
      setTeacherId(teacher.id);
    }

    const [classesRes, subjectsRes, examsRes] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name").order("name"),
      supabase.from("exams").select(`*, classes(name), subjects(name)`).order("exam_date", { ascending: false }),
    ]);

    setClasses(classesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setExams((examsRes.data as Exam[]) || []);
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
    </div>
  );
};

export default TeacherExams;
