import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUser, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadRollNumberSlip, RollNumberSlipData } from "@/utils/generateRollNumberSlipPdf";

interface SingleRollNumberSlipDialogProps {
  examName: string;
  examType: string;
}

interface StudentResult {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string;
  class_id: string;
}

const SingleRollNumberSlipDialog = ({ examName }: SingleRollNumberSlipDialogProps) => {
  const [open, setOpen] = useState(false);
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
      const { data: students, error } = await supabase
        .from("students")
        .select(`
          id,
          student_id,
          class_id,
          classes:class_id (name),
          profiles:user_id (full_name)
        `)
        .or(`student_id.ilike.%${searchQuery}%`)
        .eq("status", "active")
        .limit(10);

      if (error) throw error;

      // Also search by name
      const { data: byName, error: nameError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .ilike("full_name", `%${searchQuery}%`)
        .limit(10);

      if (nameError) throw nameError;

      const userIds = byName?.map(p => p.user_id) || [];
      
      let nameStudents: any[] = [];
      if (userIds.length > 0) {
        const { data: studentsByName } = await supabase
          .from("students")
          .select(`
            id,
            student_id,
            class_id,
            classes:class_id (name),
            profiles:user_id (full_name)
          `)
          .in("user_id", userIds)
          .eq("status", "active");
        
        nameStudents = studentsByName || [];
      }

      // Combine and deduplicate
      const allStudents = [...(students || []), ...nameStudents];
      const uniqueStudents = allStudents.filter((student, index, self) =>
        index === self.findIndex(s => s.id === student.id)
      );

      const results: StudentResult[] = uniqueStudents.map((s: any) => ({
        id: s.id,
        student_id: s.student_id,
        full_name: s.profiles?.full_name || "Unknown",
        class_name: s.classes?.name || "No Class",
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
      // Fetch exam schedule for this student's class
      const { data: exams, error: examsError } = await supabase
        .from("exams")
        .select(`
          id,
          name,
          exam_date,
          start_time,
          end_time,
          subjects:subject_id (name)
        `)
        .eq("class_id", student.class_id)
        .eq("name", examName)
        .order("exam_date", { ascending: true });

      if (examsError) throw examsError;

      const subjects = (exams || []).map((exam: any) => ({
        name: exam.subjects?.name || "Unknown",
        date: exam.exam_date,
        time: exam.start_time && exam.end_time 
          ? `${exam.start_time} - ${exam.end_time}` 
          : undefined,
      }));

      // Get all students in this class sorted alphabetically to determine roll number
      const { data: classStudents, error: classError } = await supabase
        .from("students")
        .select("id, profiles:user_id (full_name)")
        .eq("class_id", student.class_id)
        .eq("status", "active");

      if (classError) throw classError;

      const sortedStudents = (classStudents || [])
        .map((s: any) => ({
          id: s.id,
          name: s.profiles?.full_name || "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const rollNumber = sortedStudents.findIndex(s => s.id === student.id) + 1;

      const slipData: RollNumberSlipData = {
        schoolName: "The Suffah",
        schoolAddress: "Saidu Sharif, Swat - Pakistan",
        examName: examName,
        examDate: subjects[0]?.date || "",
        studentName: student.full_name,
        studentId: student.student_id,
        rollNumber: rollNumber.toString(),
        className: student.class_name,
        fatherName: "",
        subjects,
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Download Single Roll Number Slip">
          <FileUser className="w-4 h-4" />
        </Button>
      </DialogTrigger>
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
