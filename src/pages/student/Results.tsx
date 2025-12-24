import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  GraduationCap, Bell, LogOut, BookOpen, FileText, Award, Calendar, TrendingUp
} from "lucide-react";

interface Result {
  id: string;
  marks_obtained: number;
  grade: string | null;
  remarks: string | null;
  exams?: {
    name: string;
    exam_type: string;
    max_marks: number;
    exam_date: string;
  };
}

const StudentResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase.from("user_roles" as any).select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || (roleData as any).role !== "student") { navigate("/dashboard"); return; }

    fetchResults();
  };

  const fetchResults = async () => {
    // For demo, show mock data since results require student-exam relationship
    setResults([]);
    setLoading(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const getGradeBadge = (grade: string | null) => {
    if (!grade) return null;
    const colors: Record<string, string> = {
      'A+': 'bg-success/10 text-success',
      'A': 'bg-success/10 text-success',
      'B+': 'bg-info/10 text-info',
      'B': 'bg-info/10 text-info',
      'C+': 'bg-warning/10 text-warning',
      'C': 'bg-warning/10 text-warning',
      'D': 'bg-destructive/10 text-destructive',
      'F': 'bg-destructive text-destructive-foreground',
    };
    return <Badge className={colors[grade] || 'bg-muted'}>{grade}</Badge>;
  };

  // Mock data for demonstration
  const mockResults = [
    { id: '1', subject: 'Mathematics', examType: 'Midterm', marks: 85, maxMarks: 100, grade: 'A', date: '2024-11-15' },
    { id: '2', subject: 'Physics', examType: 'Midterm', marks: 78, maxMarks: 100, grade: 'B+', date: '2024-11-16' },
    { id: '3', subject: 'Chemistry', examType: 'Midterm', marks: 92, maxMarks: 100, grade: 'A+', date: '2024-11-17' },
    { id: '4', subject: 'English', examType: 'Quiz', marks: 18, maxMarks: 20, grade: 'A', date: '2024-11-10' },
    { id: '5', subject: 'Urdu', examType: 'Quiz', marks: 16, maxMarks: 20, grade: 'B+', date: '2024-11-12' },
  ];

  const avgPercentage = mockResults.reduce((acc, r) => acc + (r.marks / r.maxMarks) * 100, 0) / mockResults.length;

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
            <Link to="/student/assignments" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><FileText className="w-5 h-5" />Assignments</Link>
            <Link to="/student/results" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground"><Award className="w-5 h-5" />Results</Link>
            <Link to="/student/timetable" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><Calendar className="w-5 h-5" />Timetable</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">My Results</h1>
            <p className="text-muted-foreground">View your exam scores and grades</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <p className="text-3xl font-bold">{avgPercentage.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <p className="text-3xl font-bold">A</p>
                <p className="text-sm text-muted-foreground">Overall Grade</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-info" />
                </div>
                <p className="text-3xl font-bold">{mockResults.length}</p>
                <p className="text-sm text-muted-foreground">Total Exams</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-warning" />
                </div>
                <p className="text-3xl font-bold">5</p>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Exam Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{result.examType}</Badge>
                      </TableCell>
                      <TableCell>{new Date(result.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{result.marks}</span>
                        <span className="text-muted-foreground">/{result.maxMarks}</span>
                      </TableCell>
                      <TableCell>{getGradeBadge(result.grade)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default StudentResults;
