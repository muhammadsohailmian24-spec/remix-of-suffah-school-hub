import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadRollNumberSlip, RollNumberSlipData } from "@/utils/generateRollNumberSlipPdf";

interface SingleRollNumberSlipDialogProps {
  examName: string;
  examType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StudentResult {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string;
  class_id: string;
}

const SingleRollNumberSlipDialog = ({ examName, open, onOpenChange }: SingleRollNumberSlipDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [searchResults, setSearchResults] = useState<StudentResult[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a student name or ID");
      return;
    }

    setSearching(true);
    try {
      // Search by student_id first
      const { data: studentsByStudentId, error: idError } = await supabase
        .from("students")
        .select("id, student_id, class_id, user_id")
        .ilike("student_id", `%${searchQuery}%`)
        .eq("status", "active")
        .limit(10);

      if (idError) throw idError;

      // Search profiles by name
      const { data: profilesByName, error: nameError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .ilike("full_name", `%${searchQuery}%`)
        .limit(10);

      if (nameError) throw nameError;

      // Get students matching those profile user_ids
      const userIds = profilesByName?.map(p => p.user_id) || [];
      let studentsByName: any[] = [];
      
      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from("students")
          .select("id, student_id, class_id, user_id")
          .in("user_id", userIds)
          .eq("status", "active");
        
        if (error) throw error;
        studentsByName = data || [];
      }

      // Combine and deduplicate students
      const allStudents = [...(studentsByStudentId || []), ...studentsByName];
      const uniqueStudents = allStudents.filter((student, index, self) =>
        index === self.findIndex(s => s.id === student.id)
      );

      // Fetch profiles and classes for all unique students
      const allUserIds = uniqueStudents.map(s => s.user_id);
      const allClassIds = [...new Set(uniqueStudents.map(s => s.class_id).filter(Boolean))];

      const [profilesRes, classesRes] = await Promise.all([
        allUserIds.length > 0 
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", allUserIds)
          : { data: [] },
        allClassIds.length > 0
          ? supabase.from("classes").select("id, name").in("id", allClassIds)
          : { data: [] }
      ]);

      const profilesMap = new Map((profilesRes.data || []).map(p => [p.user_id, p.full_name]));
      const classesMap = new Map((classesRes.data || []).map(c => [c.id, c.name]));

      const results: StudentResult[] = uniqueStudents.map(s => ({
        id: s.id,
        student_id: s.student_id,
        full_name: profilesMap.get(s.user_id) || "Unknown",
        class_name: classesMap.get(s.class_id) || "No Class",
        class_id: s.class_id,
      }));

      setSearchResults(results);
      
      if (results.length === 0) {
        toast.info("No students found matching your search");
      }
    } catch (error: any) {
      toast.error("Error searching students: " + error.message);
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async (student: StudentResult) => {
    setDownloading(true);
    try {
      const { data: exams, error: examsError } = await supabase
        .from("exams")
        .select("id, name, exam_date, start_time, end_time, subject_id")
        .eq("class_id", student.class_id)
        .eq("name", examName)
        .order("exam_date", { ascending: true });

      if (examsError) throw examsError;

      // Fetch subject names
      const subjectIds = [...new Set((exams || []).map(e => e.subject_id))];
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name")
        .in("id", subjectIds);

      const subjectsMap = new Map((subjects || []).map(s => [s.id, s.name]));

      const examSubjects = (exams || []).map((exam: any) => ({
        name: subjectsMap.get(exam.subject_id) || "Unknown",
        date: exam.exam_date,
        time: exam.start_time && exam.end_time 
          ? `${exam.start_time} - ${exam.end_time}` 
          : undefined,
      }));

      // Get roll number and student details
      const { data: classStudents, error: classError } = await supabase
        .from("students")
        .select("id, user_id")
        .eq("class_id", student.class_id)
        .eq("status", "active");

      if (classError) throw classError;

      const studentUserIds = (classStudents || []).map(s => s.user_id);
      const { data: studentProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url")
        .in("user_id", studentUserIds);

      const profilesMap = new Map((studentProfiles || []).map(p => [p.user_id, { name: p.full_name, photo: p.photo_url }]));

      const sortedStudents = (classStudents || [])
        .map(s => ({
          id: s.id,
          name: profilesMap.get(s.user_id)?.name || "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const rollNumber = sortedStudents.findIndex(s => s.id === student.id) + 1;

      // Get current student's photo
      const currentStudent = (classStudents || []).find(s => s.id === student.id);
      const studentPhoto = currentStudent ? profilesMap.get(currentStudent.user_id)?.photo : null;

      const slipData: RollNumberSlipData = {
        schoolName: "The Suffah",
        schoolAddress: "Madyan Swat, Pakistan",
        examName: examName,
        examDate: examSubjects[0]?.date || "",
        studentName: student.full_name,
        studentId: student.student_id,
        rollNumber: rollNumber.toString(),
        className: student.class_name,
        fatherName: "",
        subjects: examSubjects,
        photoUrl: studentPhoto || undefined,
      };

      await downloadRollNumberSlip(slipData);
      toast.success("Roll number slip downloaded!");
    } catch (error: any) {
      toast.error("Error downloading slip: " + error.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Individual Roll Number Slip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search Student by Name or ID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter student name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Label>Search Results</Label>
              {searchResults.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{student.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {student.student_id} • {student.class_name}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(student)}
                    disabled={downloading}
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Download"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SingleRollNumberSlipDialog;
