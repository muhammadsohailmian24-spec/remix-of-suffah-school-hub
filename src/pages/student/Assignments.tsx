import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  GraduationCap, Bell, LogOut, BookOpen, FileText, Award, Calendar, 
  Clock, Upload, CheckCircle, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  max_marks: number;
  status: string;
}

const StudentAssignments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase.from("user_roles" as any).select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || (roleData as any).role !== "student") { navigate("/dashboard"); return; }

    fetchAssignments();
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase.from("assignments" as any).select("*").eq("status", "active").order("due_date", { ascending: true });
    if (!error && data) setAssignments(data as unknown as Assignment[]);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: studentData } = await supabase.from("students" as any).select("id").eq("user_id", session.user.id).maybeSingle();
    
    if (!studentData) {
      toast({ title: "Error", description: "Student profile not found", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const isLate = new Date() > new Date(selectedAssignment.due_date);

    const { error } = await supabase.from("submissions" as any).insert({
      assignment_id: selectedAssignment.id,
      student_id: (studentData as any).id,
      submission_text: submissionText || null,
      submission_url: submissionUrl || null,
      is_late: isLate,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message.includes("duplicate") ? "Already submitted" : "Failed to submit", variant: "destructive" });
    } else {
      toast({ title: "Submitted!", description: isLate ? "Assignment submitted (late)" : "Assignment submitted successfully" });
      setIsDialogOpen(false);
      setSubmissionText("");
      setSubmissionUrl("");
    }
    setSubmitting(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const getDeadlineStatus = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: "Past Due", color: "bg-destructive/10 text-destructive" };
    if (diffDays <= 2) return { label: `${diffDays}d left`, color: "bg-warning/10 text-warning" };
    return { label: `${diffDays}d left`, color: "bg-success/10 text-success" };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div><h1 className="font-heading text-lg font-bold">The Suffah</h1><p className="text-xs text-muted-foreground">Student Portal</p></div>
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
            <Link to="/student/courses" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><BookOpen className="w-5 h-5" />My Courses</Link>
            <Link to="/student/assignments" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground"><FileText className="w-5 h-5" />Assignments</Link>
            <Link to="/student/results" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><Award className="w-5 h-5" />Results</Link>
            <Link to="/student/timetable" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><Calendar className="w-5 h-5" />Timetable</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">Assignments</h1>
            <p className="text-muted-foreground">View and submit your assignments</p>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
              ) : assignments.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active assignments</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Max Marks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => {
                      const deadline = getDeadlineStatus(assignment.due_date);
                      return (
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
                          <TableCell>
                            <Badge variant="outline" className={deadline.color}>{deadline.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog open={isDialogOpen && selectedAssignment?.id === assignment.id} onOpenChange={(open) => {
                              setIsDialogOpen(open);
                              if (open) setSelectedAssignment(assignment);
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" className="hero-gradient text-primary-foreground gap-2">
                                  <Upload className="w-4 h-4" />Submit
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Submit Assignment</DialogTitle>
                                  <DialogDescription>{assignment.title}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Your Answer / Notes</Label>
                                    <Textarea placeholder="Write your answer here..." value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} rows={5} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>File URL (optional)</Label>
                                    <Input placeholder="https://drive.google.com/..." value={submissionUrl} onChange={(e) => setSubmissionUrl(e.target.value)} />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button onClick={handleSubmit} disabled={submitting} className="hero-gradient text-primary-foreground">
                                    {submitting ? "Submitting..." : "Submit Assignment"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

export default StudentAssignments;
