import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GraduationCap, Bell, LogOut, Plus, FileText, ClipboardList, Award, BookMarked,
  Calendar, Pencil, Trash2, Eye, Download, CheckCircle, MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  max_marks: number;
  status: string;
  created_at: string;
  class_id: string;
  subject_id: string;
}

interface ClassData {
  id: string;
  name: string;
}

interface SubjectData {
  id: string;
  name: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_url: string | null;
  submission_text: string | null;
  submitted_at: string;
  is_late: boolean | null;
  marks_obtained: number | null;
  feedback: string | null;
  graded_at: string | null;
  student_name?: string;
}

const TeacherAssignments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  
  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  
  // Grading state
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [gradeData, setGradeData] = useState({ marks: "", feedback: "" });
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    max_marks: "100",
    class_id: "",
    subject_id: "",
  });

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

    if (!roleData || roleData.role !== "teacher") {
      navigate("/dashboard");
      return;
    }

    // Fetch teacher record
    let { data: teacherData } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    
    // If no teacher record exists, create one
    if (!teacherData) {
      console.log("No teacher record found, creating one...");
      const employeeId = `EMP${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: newTeacher, error: createError } = await supabase
        .from("teachers")
        .insert({
          user_id: session.user.id,
          employee_id: employeeId,
          joining_date: new Date().toISOString().split('T')[0],
        })
        .select("id")
        .single();
      
      if (createError) {
        console.error("Failed to create teacher record:", createError);
        toast({ title: "Error", description: "Failed to initialize teacher profile", variant: "destructive" });
      } else {
        teacherData = newTeacher;
        console.log("Created teacher record:", newTeacher);
      }
    }
    
    if (teacherData) {
      setTeacherId(teacherData.id);
      console.log("Teacher ID set:", teacherData.id);
    }

    // Fetch classes and subjects
    const [classesRes, subjectsRes] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name").order("name"),
    ]);

    setClasses((classesRes.data || []) as ClassData[]);
    setSubjects((subjectsRes.data || []) as SubjectData[]);

    fetchAssignments();
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("assignments" as any)
      .select("*")
      .order("due_date", { ascending: false });

    if (!error && data) {
      setAssignments(data as unknown as Assignment[]);
    }
    setLoading(false);
  };

  const fetchSubmissions = async (assignmentId: string) => {
    setLoadingSubmissions(true);
    
    const { data: submissionsData, error } = await supabase
      .from("submissions" as any)
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false });

    if (!error && submissionsData) {
      // Fetch student names
      const studentIds = [...new Set((submissionsData as any[]).map(s => s.student_id))];
      
      const { data: studentsData } = await supabase
        .from("students" as any)
        .select("id, user_id")
        .in("id", studentIds);
      
      const userIds = (studentsData || []).map((s: any) => s.user_id);
      
      const { data: profilesData } = await supabase
        .from("profiles" as any)
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      // Map student names
      const studentUserMap = new Map((studentsData || []).map((s: any) => [s.id, s.user_id]));
      const userNameMap = new Map((profilesData || []).map((p: any) => [p.user_id, p.full_name]));
      
      const enrichedSubmissions = (submissionsData as any[]).map(sub => ({
        ...sub,
        student_name: userNameMap.get(studentUserMap.get(sub.student_id)) || "Unknown Student"
      }));
      
      setSubmissions(enrichedSubmissions as Submission[]);
    }
    
    setLoadingSubmissions(false);
  };

  const sendNotification = async (classId: string, title: string, dueDate: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          type: "new_assignment",
          classId,
          title,
          details: `A new assignment "${title}" has been posted. Due date: ${new Date(dueDate).toLocaleDateString()}`,
        },
      });
      if (error) console.error("Notification error:", error);
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teacherId || !formData.class_id || !formData.subject_id) {
      toast({ title: "Error", description: "Please select class and subject", variant: "destructive" });
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description || null,
      due_date: formData.due_date,
      max_marks: parseInt(formData.max_marks),
      teacher_id: teacherId,
      class_id: formData.class_id,
      subject_id: formData.subject_id,
      status: "active",
    };

    if (editingAssignment) {
      const { error } = await supabase.from("assignments" as any).update(payload as any).eq("id", editingAssignment.id);
      toast({ title: error ? "Error" : "Success", description: error ? "Failed to update" : "Assignment updated", variant: error ? "destructive" : "default" });
    } else {
      const { data, error } = await supabase.from("assignments" as any).insert(payload as any).select().single();
      if (!error && data) {
        sendNotification(formData.class_id, formData.title, formData.due_date);
        toast({ title: "Success", description: "Assignment created and notifications sent" });
      } else {
        toast({ title: "Error", description: "Failed to create assignment", variant: "destructive" });
      }
    }

    setIsDialogOpen(false);
    setEditingAssignment(null);
    resetForm();
    fetchAssignments();
  };

  const handleGradeSubmit = async () => {
    if (!gradingSubmission || !teacherId) {
      console.error("Missing gradingSubmission or teacherId", { gradingSubmission, teacherId });
      toast({ title: "Error", description: "Unable to save grade - missing data", variant: "destructive" });
      return;
    }
    
    const marks = parseInt(gradeData.marks);
    if (isNaN(marks) || marks < 0) {
      toast({ title: "Error", description: "Please enter valid marks", variant: "destructive" });
      return;
    }

    console.log("Saving grade:", { submissionId: gradingSubmission.id, marks, feedback: gradeData.feedback, teacherId });

    const { data, error } = await supabase
      .from("submissions")
      .update({
        marks_obtained: marks,
        feedback: gradeData.feedback || null,
        graded_by: teacherId,
        graded_at: new Date().toISOString(),
      })
      .eq("id", gradingSubmission.id)
      .select();

    console.log("Grade save result:", { data, error });

    if (error) {
      console.error("Grade save error:", error);
      toast({ title: "Error", description: `Failed to save grade: ${error.message}`, variant: "destructive" });
      return;
    }

    // Send notification to parent
    try {
      const { data: studentData } = await supabase
        .from("students" as any)
        .select("id, user_id")
        .eq("id", gradingSubmission.student_id)
        .maybeSingle();

      if (studentData) {
        await supabase.functions.invoke("send-notification", {
          body: {
            type: "assignment_graded",
            studentId: gradingSubmission.student_id,
            title: selectedAssignment?.title || "Assignment",
            details: `Assignment "${selectedAssignment?.title}" has been graded. Marks: ${marks}/${selectedAssignment?.max_marks}`,
          },
        });
      }
    } catch (err) {
      console.error("Failed to send notification:", err);
    }

    toast({ title: "Success", description: "Grade saved successfully" });
    setIsGradingOpen(false);
    setGradingSubmission(null);
    setGradeData({ marks: "", feedback: "" });
    
    if (selectedAssignment) {
      fetchSubmissions(selectedAssignment.id);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    const { error } = await supabase.from("assignments" as any).delete().eq("id", id);
    if (!error) { toast({ title: "Deleted" }); fetchAssignments(); }
  };

  const openEditDialog = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description || "",
      due_date: assignment.due_date.split("T")[0] + "T" + (assignment.due_date.split("T")[1]?.substring(0, 5) || "00:00"),
      max_marks: String(assignment.max_marks),
      class_id: assignment.class_id,
      subject_id: assignment.subject_id,
    });
    setIsDialogOpen(true);
  };

  const openSubmissionsDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    fetchSubmissions(assignment.id);
    setIsSubmissionsOpen(true);
  };

  const openGradingDialog = (submission: Submission) => {
    setGradingSubmission(submission);
    setGradeData({
      marks: submission.marks_obtained?.toString() || "",
      feedback: submission.feedback || "",
    });
    setIsGradingOpen(true);
  };

  const resetForm = () => setFormData({ title: "", description: "", due_date: "", max_marks: "100", class_id: "", subject_id: "" });

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isPastDue = new Date(dueDate) < new Date();
    if (status === "closed" || isPastDue) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground">Closed</Badge>;
    }
    return <Badge variant="outline" className="bg-success/10 text-success">Active</Badge>;
  };

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || "Unknown";
  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || "Unknown";

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
            <Link to="/teacher/attendance" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><ClipboardList className="w-5 h-5" />Attendance</Link>
            <Link to="/teacher/assignments" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground"><FileText className="w-5 h-5" />Assignments</Link>
            <Link to="/teacher/results" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><Award className="w-5 h-5" />Results</Link>
            <Link to="/teacher/materials" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><BookMarked className="w-5 h-5" />Materials</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-2">Assignments</h1>
              <p className="text-muted-foreground">Create and manage student assignments</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) { setEditingAssignment(null); resetForm(); } }}>
              <DialogTrigger asChild>
                <Button className="hero-gradient text-primary-foreground gap-2"><Plus className="w-4 h-4" />Create Assignment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAssignment ? "Edit" : "Create"} Assignment</DialogTitle>
                  <DialogDescription>Fill in the assignment details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input placeholder="Assignment title" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Class *</Label>
                      <Select value={formData.class_id} onValueChange={(v) => setFormData(p => ({ ...p, class_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>
                          {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Select value={formData.subject_id} onValueChange={(v) => setFormData(p => ({ ...p, subject_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Describe the assignment..." value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Due Date *</Label>
                      <Input type="datetime-local" value={formData.due_date} onChange={(e) => setFormData(p => ({ ...p, due_date: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Marks</Label>
                      <Input type="number" value={formData.max_marks} onChange={(e) => setFormData(p => ({ ...p, max_marks: e.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="hero-gradient text-primary-foreground">{editingAssignment ? "Update" : "Create"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
              ) : assignments.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No assignments created yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Class / Subject</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Max Marks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{assignment.title}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{assignment.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{getClassName(assignment.class_id)}</p>
                            <p className="text-muted-foreground">{getSubjectName(assignment.subject_id)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {new Date(assignment.due_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>{assignment.max_marks}</TableCell>
                        <TableCell>{getStatusBadge(assignment.status, assignment.due_date)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => openSubmissionsDialog(assignment)} title="View Submissions">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditDialog(assignment)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(assignment.id)}><Trash2 className="w-4 h-4" /></Button>
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

      {/* Submissions Dialog */}
      <Dialog open={isSubmissionsOpen} onOpenChange={setIsSubmissionsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Submissions - {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>
              {getClassName(selectedAssignment?.class_id || "")} • {getSubjectName(selectedAssignment?.subject_id || "")} • Max: {selectedAssignment?.max_marks} marks
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingSubmissions ? (
              <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : submissions.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No submissions yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.student_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{new Date(submission.submitted_at).toLocaleDateString()}</p>
                          <p className="text-muted-foreground text-xs">{new Date(submission.submitted_at).toLocaleTimeString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {submission.is_late ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive">Late</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success">On Time</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {submission.marks_obtained !== null ? (
                          <Badge variant="default" className="bg-primary/10 text-primary">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {submission.marks_obtained}/{selectedAssignment?.max_marks}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/10 text-warning">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {submission.submission_url && (
                          <Button size="icon" variant="ghost" asChild title="Download File">
                            <a href={submission.submission_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openGradingDialog(submission)} title="Grade">
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Grading Dialog */}
      <Dialog open={isGradingOpen} onOpenChange={setIsGradingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              {gradingSubmission?.student_name} • {selectedAssignment?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {gradingSubmission?.submission_text && (
              <div className="space-y-2">
                <Label>Student Notes</Label>
                <div className="p-3 rounded-lg bg-accent/50 text-sm">{gradingSubmission.submission_text}</div>
              </div>
            )}
            {gradingSubmission?.submission_url && (
              <div className="space-y-2">
                <Label>Submitted File</Label>
                <Button variant="outline" size="sm" asChild>
                  <a href={gradingSubmission.submission_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />View/Download File
                  </a>
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label>Marks (out of {selectedAssignment?.max_marks}) *</Label>
              <Input 
                type="number" 
                placeholder="Enter marks" 
                value={gradeData.marks} 
                onChange={(e) => setGradeData(p => ({ ...p, marks: e.target.value }))}
                min="0"
                max={selectedAssignment?.max_marks}
              />
            </div>
            <div className="space-y-2">
              <Label>Feedback</Label>
              <Textarea 
                placeholder="Provide feedback to the student..." 
                value={gradeData.feedback} 
                onChange={(e) => setGradeData(p => ({ ...p, feedback: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGradingOpen(false)}>Cancel</Button>
            <Button onClick={handleGradeSubmit} className="hero-gradient text-primary-foreground">Save Grade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherAssignments;