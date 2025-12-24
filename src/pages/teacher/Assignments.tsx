import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, Bell, LogOut, Plus, FileText, ClipboardList, Award, BookMarked,
  Calendar, Pencil, Trash2, Eye
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
}

const TeacherAssignments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    max_marks: "100",
  });

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
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get teacher record
    const { data: teacherData } = await supabase
      .from("teachers" as any)
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    // Get first class and subject for demo
    const { data: classData } = await supabase.from("classes" as any).select("id").limit(1).maybeSingle();
    const { data: subjectData } = await supabase.from("subjects" as any).select("id").limit(1).maybeSingle();

    if (!teacherData || !classData || !subjectData) {
      toast({ title: "Error", description: "Please ensure classes and subjects are set up first", variant: "destructive" });
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description || null,
      due_date: formData.due_date,
      max_marks: parseInt(formData.max_marks),
      teacher_id: (teacherData as any).id,
      class_id: (classData as any).id,
      subject_id: (subjectData as any).id,
      status: "active",
    };

    if (editingAssignment) {
      const { error } = await supabase.from("assignments" as any).update(payload as any).eq("id", editingAssignment.id);
      toast({ title: error ? "Error" : "Success", description: error ? "Failed to update" : "Assignment updated", variant: error ? "destructive" : "default" });
    } else {
      const { data, error } = await supabase.from("assignments" as any).insert(payload as any).select().single();
      if (!error && data) {
        sendNotification((classData as any).id, formData.title, formData.due_date);
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
      due_date: assignment.due_date.split("T")[0],
      max_marks: String(assignment.max_marks),
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => setFormData({ title: "", description: "", due_date: "", max_marks: "100" });

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isPastDue = new Date(dueDate) < new Date();
    if (status === "closed" || isPastDue) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground">Closed</Badge>;
    }
    return <Badge variant="outline" className="bg-success/10 text-success">Active</Badge>;
  };

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
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {new Date(assignment.due_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>{assignment.max_marks}</TableCell>
                        <TableCell>{getStatusBadge(assignment.status, assignment.due_date)}</TableCell>
                        <TableCell className="text-right">
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
    </div>
  );
};

export default TeacherAssignments;
