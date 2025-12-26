import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  GraduationCap, Bell, LogOut, BookOpen, FileText, Award, Calendar, 
  Upload, CheckCircle, File, MessageSquare
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

interface Submission {
  id: string;
  assignment_id: string;
  submission_url: string | null;
  marks_obtained: number | null;
  is_late: boolean | null;
  submitted_at: string;
  feedback: string | null;
  graded_at: string | null;
}

const StudentAssignments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Feedback dialog
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    setUserId(session.user.id);

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || roleData.role !== "student") { navigate("/dashboard"); return; }

    const { data: studentData } = await supabase.from("students").select("id").eq("user_id", session.user.id).maybeSingle();
    if (studentData) {
      setStudentId(studentData.id);
      fetchSubmissions(studentData.id);
    }

    fetchAssignments();
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase.from("assignments").select("*").eq("status", "active").order("due_date", { ascending: true });
    if (!error && data) setAssignments(data as Assignment[]);
    setLoading(false);
  };

  const fetchSubmissions = async (sid: string) => {
    const { data } = await supabase.from("submissions").select("*").eq("student_id", sid);
    if (data) {
      const map: Record<string, Submission> = {};
      data.forEach(s => { map[s.assignment_id] = s as Submission; });
      setSubmissions(map);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 50MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !studentId || !userId) return;
    if (!submissionText && !selectedFile) {
      toast({ title: "Error", description: "Please add text or upload a file", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setUploadProgress(10);

    try {
      let fileUrl = null;

      // Upload file if selected
      if (selectedFile) {
        setUploadProgress(30);
        const fileName = `${userId}/${selectedAssignment.id}/${Date.now()}_${selectedFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;
        
        setUploadProgress(60);

        // Get signed URL for private bucket
        const { data: urlData } = await supabase.storage
          .from('submissions')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

        fileUrl = urlData?.signedUrl || fileName;
      }

      setUploadProgress(80);

      const isLate = new Date() > new Date(selectedAssignment.due_date);
      
      // Check if already submitted
      const existingSubmission = submissions[selectedAssignment.id];
      
      if (existingSubmission) {
        // Update existing submission
        const { error } = await supabase.from("submissions").update({
          submission_text: submissionText || null,
          submission_url: fileUrl,
          is_late: isLate,
          submitted_at: new Date().toISOString(),
        }).eq("id", existingSubmission.id);

        if (error) throw error;
      } else {
        // Create new submission
        const { error } = await supabase.from("submissions").insert({
          assignment_id: selectedAssignment.id,
          student_id: studentId,
          submission_text: submissionText || null,
          submission_url: fileUrl,
          is_late: isLate,
        });

        if (error) throw error;
      }

      setUploadProgress(100);
      toast({ title: "Submitted!", description: isLate ? "Assignment submitted (late)" : "Assignment submitted successfully" });
      setIsDialogOpen(false);
      setSubmissionText("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchSubmissions(studentId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const openFeedbackDialog = (assignment: Assignment, submission: Submission) => {
    setViewingAssignment(assignment);
    setViewingSubmission(submission);
    setIsFeedbackOpen(true);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const getDeadlineStatus = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: "Past Due", color: "bg-destructive/10 text-destructive" };
    if (diffDays <= 2) return { label: `${diffDays}d left`, color: "bg-yellow-500/10 text-yellow-600" };
    return { label: `${diffDays}d left`, color: "bg-green-500/10 text-green-600" };
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
                      const submission = submissions[assignment.id];
                      const isSubmitted = !!submission;
                      const isGraded = submission?.marks_obtained !== null;
                      
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
                            {isGraded ? (
                              <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {submission.marks_obtained}/{assignment.max_marks}
                              </Badge>
                            ) : isSubmitted ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Submitted
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={deadline.color}>{deadline.label}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {isGraded && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openFeedbackDialog(assignment, submission)}
                                className="gap-1"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Feedback
                              </Button>
                            )}
                            <Dialog open={isDialogOpen && selectedAssignment?.id === assignment.id} onOpenChange={(open) => {
                              setIsDialogOpen(open);
                              if (open) {
                                setSelectedAssignment(assignment);
                                setSubmissionText("");
                                setSelectedFile(null);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant={isSubmitted ? "outline" : "default"} className={!isSubmitted ? "hero-gradient text-primary-foreground" : ""}>
                                  <Upload className="w-4 h-4 mr-1" />
                                  {isSubmitted ? "Resubmit" : "Submit"}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>Submit Assignment</DialogTitle>
                                  <DialogDescription>{assignment.title}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Upload File</Label>
                                    <div 
                                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                        selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                      }`}
                                      onClick={() => fileInputRef.current?.click()}
                                    >
                                      <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.zip"
                                      />
                                      {selectedFile ? (
                                        <div className="flex items-center justify-center gap-2">
                                          <File className="w-8 h-8 text-primary" />
                                          <div className="text-left">
                                            <p className="font-medium">{selectedFile.name}</p>
                                            <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                                          <p className="text-sm text-muted-foreground">Click to select a file</p>
                                          <p className="text-xs text-muted-foreground mt-1">PDF, Word, Images, ZIP (max 50MB)</p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Additional Notes (optional)</Label>
                                    <Textarea placeholder="Any additional comments..." value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} rows={4} />
                                  </div>
                                  {submitting && (
                                    <div className="space-y-2">
                                      <Progress value={uploadProgress} className="h-2" />
                                      <p className="text-xs text-center text-muted-foreground">Uploading... {uploadProgress}%</p>
                                    </div>
                                  )}
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

      {/* Feedback Dialog */}
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assignment Feedback</DialogTitle>
            <DialogDescription>{viewingAssignment?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div>
                <p className="text-sm text-muted-foreground">Your Score</p>
                <p className="text-2xl font-bold text-primary">
                  {viewingSubmission?.marks_obtained}/{viewingAssignment?.max_marks}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Graded on</p>
                <p className="text-sm">{viewingSubmission?.graded_at ? new Date(viewingSubmission.graded_at).toLocaleDateString() : "-"}</p>
              </div>
            </div>
            {viewingSubmission?.feedback ? (
              <div className="space-y-2">
                <Label>Teacher's Feedback</Label>
                <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                  {viewingSubmission.feedback}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 text-center text-muted-foreground">
                No feedback provided
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsFeedbackOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAssignments;