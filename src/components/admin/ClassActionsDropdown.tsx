import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  MoreHorizontal,
  Download,
  IdCard,
  FileText,
  Calendar,
  ClipboardList,
  Users,
  Loader2,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { downloadBulkStudentCards, StudentCardData } from "@/utils/generateStudentCardPdf";
import { downloadStudentListPdf, StudentListData } from "@/utils/generateStudentListPdf";
import { downloadClassTimetablePdf, TimetableEntry } from "@/utils/generateClassTimetablePdf";
import { downloadClassRollNumberSlips, RollNumberSlipData } from "@/utils/generateRollNumberSlipPdf";
import { downloadClassResultsPdf, StudentResult as ClassStudentResult } from "@/utils/generateClassResultsPdf";

interface ClassItem {
  id: string;
  name: string;
  section: string | null;
  grade_level: number;
}

interface Exam {
  id: string;
  name: string;
  exam_date: string;
  exam_type: string;
  subject: { name: string };
}

interface Result {
  id: string;
  exam_id: string;
  marks_obtained: number;
  grade: string;
  exam: {
    id: string;
    name: string;
    exam_date: string;
    max_marks: number;
    subject: { name: string };
  };
}

interface ClassActionsDropdownProps {
  classItem: ClassItem;
  onEdit: (classItem: ClassItem) => void;
  onDelete: (id: string) => void;
}

const ClassActionsDropdown = ({ classItem, onEdit, onDelete }: ClassActionsDropdownProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [examsDialogOpen, setExamsDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [availableResults, setAvailableResults] = useState<Result[]>([]);

  // Fetch students with roll numbers (sorted by student_id for sequential numbering)
  const fetchStudentsWithRollNumbers = async () => {
    const { data: studentsData, error } = await supabase
      .from("students")
      .select("id, user_id, student_id, father_name, father_phone")
      .eq("class_id", classItem.id)
      .eq("status", "active")
      .order("student_id", { ascending: true });

    if (error || !studentsData) {
      console.error("Error fetching students:", error);
      return [];
    }

    // Fetch profiles for these students
    const userIds = studentsData.map(s => s.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, address, phone")
      .in("user_id", userIds);

    const profilesMap = new Map((profilesData || []).map(p => [p.user_id, p]));

    // Assign sequential roll numbers
    return studentsData.map((student, index) => ({
      ...student,
      rollNumber: index + 1,
      profile: profilesMap.get(student.user_id),
    }));
  };

  const handleDownloadStudentCards = async () => {
    setLoading("cards");
    try {
      const students = await fetchStudentsWithRollNumbers();
      
      if (students.length === 0) {
        toast({ title: "No Students", description: "No active students found in this class", variant: "destructive" });
        return;
      }

      const cardData: StudentCardData[] = students.map(s => ({
        studentId: s.student_id,
        studentName: s.profile?.full_name || "Unknown",
        fatherName: s.father_name || "Unknown",
        className: classItem.name,
        section: classItem.section || undefined,
        phone: s.father_phone || s.profile?.phone || undefined,
        address: s.profile?.address || undefined,
      }));

      await downloadBulkStudentCards(cardData, classItem.name);
      toast({ title: "Success", description: `Downloaded ${students.length} student ID cards` });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to generate ID cards", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadStudentList = async () => {
    setLoading("list");
    try {
      const students = await fetchStudentsWithRollNumbers();
      
      if (students.length === 0) {
        toast({ title: "No Students", description: "No active students found in this class", variant: "destructive" });
        return;
      }

      const listData: StudentListData[] = students.map(s => ({
        rollNumber: s.rollNumber,
        studentId: s.student_id,
        studentName: s.profile?.full_name || "Unknown",
        fatherName: s.father_name || "Unknown",
        address: s.profile?.address || undefined,
        phone: s.father_phone || s.profile?.phone || undefined,
      }));

      await downloadStudentListPdf({
        className: classItem.name,
        section: classItem.section || undefined,
        students: listData,
      });
      toast({ title: "Success", description: `Downloaded student list with ${students.length} students` });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to generate student list", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadTimetable = async () => {
    setLoading("timetable");
    try {
      const { data, error } = await supabase
        .from("timetable")
        .select("day_of_week, start_time, end_time, room_number, subject_id, teacher_id")
        .eq("class_id", classItem.id)
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: "No Timetable", description: "No timetable entries found for this class", variant: "destructive" });
        return;
      }

      // Fetch subjects and teachers separately
      const subjectIds = [...new Set(data.map(d => d.subject_id))];
      const teacherIds = [...new Set(data.map(d => d.teacher_id))];

      const [subjectsRes, teachersRes] = await Promise.all([
        supabase.from("subjects").select("id, name").in("id", subjectIds),
        supabase.from("teachers").select("id, user_id").in("id", teacherIds),
      ]);

      const subjectsMap = new Map((subjectsRes.data || []).map(s => [s.id, s.name]));
      const teacherUserIds = (teachersRes.data || []).map(t => t.user_id);
      const { data: teacherProfiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherUserIds);
      const teacherProfilesMap = new Map((teacherProfiles || []).map(p => [p.user_id, p.full_name]));
      const teachersMap = new Map((teachersRes.data || []).map(t => [t.id, teacherProfilesMap.get(t.user_id) || "TBA"]));

      const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const entries: TimetableEntry[] = data.map(entry => ({
        day: entry.day_of_week,
        dayName: DAYS[entry.day_of_week - 1] || "Unknown",
        startTime: entry.start_time,
        endTime: entry.end_time,
        subjectName: subjectsMap.get(entry.subject_id) || "Unknown",
        teacherName: teachersMap.get(entry.teacher_id) || "TBA",
        roomNumber: entry.room_number || undefined,
      }));

      await downloadClassTimetablePdf({
        className: classItem.name,
        section: classItem.section || undefined,
        entries,
      });
      toast({ title: "Success", description: "Downloaded class timetable" });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to generate timetable", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleOpenRollSlipsDialog = async () => {
    setLoading("exams");
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("exams")
        .select("id, name, exam_date, exam_type, subjects(name)")
        .eq("class_id", classItem.id)
        .gte("exam_date", today)
        .order("exam_date");

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: "No Upcoming Exams", description: "No upcoming exams found for this class" });
        return;
      }

      setUpcomingExams(data.map(e => ({
        id: e.id,
        name: e.name,
        exam_date: e.exam_date,
        exam_type: e.exam_type,
        subject: e.subjects as { name: string },
      })));
      setExamsDialogOpen(true);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to fetch exams", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadRollSlips = async (exam: Exam) => {
    setLoading(`slip-${exam.id}`);
    try {
      const students = await fetchStudentsWithRollNumbers();

      if (students.length === 0) {
        toast({ title: "No Students", description: "No students found in this class", variant: "destructive" });
        return;
      }

      // Fetch all subjects for this class and date range (related exams)
      const { data: examSubjects } = await supabase
        .from("exams")
        .select("exam_date, start_time, subjects(name)")
        .eq("class_id", classItem.id)
        .eq("name", exam.name)
        .order("exam_date");

      const subjects = (examSubjects || []).map(e => ({
        name: e.subjects?.name || "Unknown",
        date: new Date(e.exam_date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: e.start_time || undefined,
      }));

      const slipsData: RollNumberSlipData[] = students.map(s => ({
        studentName: s.profile?.full_name || "Unknown",
        studentId: s.student_id,
        fatherName: s.father_name || undefined,
        className: classItem.name,
        section: classItem.section || undefined,
        rollNumber: String(s.rollNumber),
        examName: exam.name,
        examDate: new Date(exam.exam_date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        subjects,
      }));

      await downloadClassRollNumberSlips(slipsData, classItem.name);
      toast({ title: "Success", description: `Downloaded ${students.length} roll number slips` });
      setExamsDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to generate roll number slips", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleOpenResultsDialog = async () => {
    setLoading("results");
    try {
      const { data, error } = await supabase
        .from("results")
        .select(`
          id,
          exam_id,
          marks_obtained,
          grade,
          exams!inner(id, name, exam_date, max_marks, subjects(name))
        `)
        .eq("is_published", true)
        .eq("exams.class_id", classItem.id);

      if (error) throw error;

      // Get unique exams from results
      const uniqueExams = new Map<string, Result>();
      (data || []).forEach(r => {
        if (!uniqueExams.has(r.exam_id)) {
          uniqueExams.set(r.exam_id, {
            id: r.id,
            exam_id: r.exam_id,
            marks_obtained: r.marks_obtained,
            grade: r.grade || "",
            exam: {
              id: r.exams.id,
              name: r.exams.name,
              exam_date: r.exams.exam_date,
              max_marks: r.exams.max_marks || 100,
              subject: r.exams.subjects as { name: string },
            },
          });
        }
      });

      const results = Array.from(uniqueExams.values());
      if (results.length === 0) {
        toast({ title: "No Results", description: "No published results found for this class" });
        return;
      }

      setAvailableResults(results);
      setResultsDialogOpen(true);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to fetch results", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadResults = async (result: Result) => {
    setLoading(`result-${result.exam_id}`);
    try {
      const students = await fetchStudentsWithRollNumbers();
      
      // Fetch all results for this exam
      const { data: allResults, error } = await supabase
        .from("results")
        .select("student_id, marks_obtained, grade")
        .eq("exam_id", result.exam_id)
        .eq("is_published", true);

      if (error) throw error;

      const resultsMap = new Map((allResults || []).map(r => [r.student_id, r]));

      const classResults: ClassStudentResult[] = students
        .filter(s => resultsMap.has(s.id))
        .map(s => {
          const r = resultsMap.get(s.id)!;
          const percentage = (r.marks_obtained / result.exam.max_marks) * 100;
          return {
            rollNumber: s.rollNumber,
            studentId: s.student_id,
            studentName: s.profile?.full_name || "Unknown",
            fatherName: s.father_name || "Unknown",
            marksObtained: r.marks_obtained,
            maxMarks: result.exam.max_marks,
            grade: r.grade || "-",
            percentage,
          };
        });

      await downloadClassResultsPdf({
        className: classItem.name,
        section: classItem.section || undefined,
        examName: result.exam.name,
        subjectName: result.exam.subject?.name || "Unknown",
        examDate: new Date(result.exam.exam_date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        results: classResults,
      });

      toast({ title: "Success", description: `Downloaded results for ${classResults.length} students` });
      setResultsDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to generate results", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreHorizontal className="w-4 h-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Class Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => onEdit(classItem)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Class
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Downloads</DropdownMenuLabel>

          <DropdownMenuItem onClick={handleDownloadStudentList} disabled={loading === "list"}>
            <Users className="w-4 h-4 mr-2" />
            Student List
            {loading === "list" && <Loader2 className="w-3 h-3 ml-auto animate-spin" />}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleDownloadStudentCards} disabled={loading === "cards"}>
            <IdCard className="w-4 h-4 mr-2" />
            Bulk ID Cards
            {loading === "cards" && <Loader2 className="w-3 h-3 ml-auto animate-spin" />}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleDownloadTimetable} disabled={loading === "timetable"}>
            <Calendar className="w-4 h-4 mr-2" />
            Class Timetable
            {loading === "timetable" && <Loader2 className="w-3 h-3 ml-auto animate-spin" />}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleOpenRollSlipsDialog} disabled={loading === "exams"}>
            <ClipboardList className="w-4 h-4 mr-2" />
            Roll Number Slips
            {loading === "exams" && <Loader2 className="w-3 h-3 ml-auto animate-spin" />}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleOpenResultsDialog} disabled={loading === "results"}>
            <FileText className="w-4 h-4 mr-2" />
            Class Results
            {loading === "results" && <Loader2 className="w-3 h-3 ml-auto animate-spin" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => onDelete(classItem.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Class
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Exams Dialog for Roll Slips */}
      <Dialog open={examsDialogOpen} onOpenChange={setExamsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Exam for Roll Number Slips</DialogTitle>
            <DialogDescription>
              Choose an upcoming exam to generate roll number slips for all students in {classItem.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {upcomingExams.map(exam => (
                <Button
                  key={exam.id}
                  variant="outline"
                  className="w-full justify-between h-auto py-3"
                  onClick={() => handleDownloadRollSlips(exam)}
                  disabled={loading === `slip-${exam.id}`}
                >
                  <div className="text-left">
                    <p className="font-medium">{exam.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {exam.subject?.name} • {new Date(exam.exam_date).toLocaleDateString()}
                    </p>
                  </div>
                  {loading === `slip-${exam.id}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Exam Results</DialogTitle>
            <DialogDescription>
              Choose an exam to download published results for {classItem.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {availableResults.map(result => (
                <Button
                  key={result.exam_id}
                  variant="outline"
                  className="w-full justify-between h-auto py-3"
                  onClick={() => handleDownloadResults(result)}
                  disabled={loading === `result-${result.exam_id}`}
                >
                  <div className="text-left">
                    <p className="font-medium">{result.exam.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.exam.subject?.name} • {new Date(result.exam.exam_date).toLocaleDateString()}
                    </p>
                  </div>
                  {loading === `result-${result.exam_id}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClassActionsDropdown;
