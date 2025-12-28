import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, GraduationCap, Calendar, Phone, MapPin, BookOpen, Clock, Award, Wallet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface StudentDetails {
  id: string;
  student_id: string;
  admission_date: string;
  blood_group?: string;
  emergency_contact?: string;
  status?: string;
  profile: {
    full_name: string;
    email: string;
    phone?: string;
    address?: string;
    gender?: string;
    date_of_birth?: string;
  };
  class?: {
    name: string;
    section?: string;
    grade_level: number;
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  fees: {
    total: number;
    paid: number;
    pending: number;
  };
  results: {
    exam_name: string;
    subject: string;
    marks_obtained: number;
    max_marks: number;
    grade?: string;
  }[];
}

interface StudentSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StudentSearchDialog = ({ open, onOpenChange }: StudentSearchDialogProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter search query",
        description: "Please enter a student name or ID to search.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setStudentDetails(null);

    try {
      // Search for student by ID or name
      const { data: students, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          student_id,
          admission_date,
          blood_group,
          emergency_contact,
          status,
          user_id,
          class_id
        `)
        .or(`student_id.ilike.%${searchQuery}%`);

      if (studentError) throw studentError;

      // If no results by student_id, search by name in profiles
      let foundStudent = students?.[0];
      
      if (!foundStudent) {
        // Search by name in profiles
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .ilike("full_name", `%${searchQuery}%`);

        if (profileError) throw profileError;

        if (profiles && profiles.length > 0) {
          const userIds = profiles.map(p => p.user_id);
          const { data: studentsFromProfile, error: err } = await supabase
            .from("students")
            .select(`
              id,
              student_id,
              admission_date,
              blood_group,
              emergency_contact,
              status,
              user_id,
              class_id
            `)
            .in("user_id", userIds);

          if (err) throw err;
          foundStudent = studentsFromProfile?.[0];
        }
      }

      if (!foundStudent) {
        toast({
          title: "Student not found",
          description: "No student found with the given name or ID.",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, address, gender, date_of_birth")
        .eq("user_id", foundStudent.user_id)
        .maybeSingle();

      // Fetch class info
      let classInfo = null;
      if (foundStudent.class_id) {
        const { data: classData } = await supabase
          .from("classes")
          .select("name, section, grade_level")
          .eq("id", foundStudent.class_id)
          .maybeSingle();
        classInfo = classData;
      }

      // Fetch attendance summary
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("status")
        .eq("student_id", foundStudent.id);

      const attendance = {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
      };

      if (attendanceData) {
        attendance.total = attendanceData.length;
        attendanceData.forEach((a) => {
          if (a.status === "present") attendance.present++;
          else if (a.status === "absent") attendance.absent++;
          else if (a.status === "late") attendance.late++;
        });
      }

      // Fetch fees summary
      const { data: feesData } = await supabase
        .from("student_fees")
        .select("final_amount, status")
        .eq("student_id", foundStudent.id);

      const fees = {
        total: 0,
        paid: 0,
        pending: 0,
      };

      if (feesData) {
        feesData.forEach((f) => {
          fees.total += Number(f.final_amount);
          if (f.status === "paid") fees.paid += Number(f.final_amount);
          else fees.pending += Number(f.final_amount);
        });
      }

      // Fetch results with exam and subject info
      const { data: resultsData } = await supabase
        .from("results")
        .select(`
          marks_obtained,
          grade,
          exam_id
        `)
        .eq("student_id", foundStudent.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(10);

      const results: StudentDetails["results"] = [];
      
      if (resultsData && resultsData.length > 0) {
        for (const result of resultsData) {
          const { data: examData } = await supabase
            .from("exams")
            .select("name, max_marks, subject_id")
            .eq("id", result.exam_id)
            .maybeSingle();
          
          if (examData) {
            const { data: subjectData } = await supabase
              .from("subjects")
              .select("name")
              .eq("id", examData.subject_id)
              .maybeSingle();

            results.push({
              exam_name: examData.name,
              subject: subjectData?.name || "Unknown",
              marks_obtained: result.marks_obtained,
              max_marks: examData.max_marks || 100,
              grade: result.grade || undefined,
            });
          }
        }
      }

      setStudentDetails({
        id: foundStudent.id,
        student_id: foundStudent.student_id,
        admission_date: foundStudent.admission_date,
        blood_group: foundStudent.blood_group || undefined,
        emergency_contact: foundStudent.emergency_contact || undefined,
        status: foundStudent.status || undefined,
        profile: {
          full_name: profile?.full_name || "Unknown",
          email: profile?.email || "",
          phone: profile?.phone || undefined,
          address: profile?.address || undefined,
          gender: profile?.gender || undefined,
          date_of_birth: profile?.date_of_birth || undefined,
        },
        class: classInfo ? {
          name: classInfo.name,
          section: classInfo.section || undefined,
          grade_level: classInfo.grade_level,
        } : undefined,
        attendance,
        fees,
        results,
      });

    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to search for student.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const attendancePercentage = studentDetails?.attendance.total 
    ? Math.round((studentDetails.attendance.present / studentDetails.attendance.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Student
          </DialogTitle>
          <DialogDescription>
            Search for a student by their name or student ID to view complete records
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter student name or ID (e.g., STU001)"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {/* Results */}
        {studentDetails && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Basic Info Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{studentDetails.profile.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">ID: {studentDetails.student_id}</p>
                      </div>
                    </div>
                    <Badge variant={studentDetails.status === "active" ? "default" : "secondary"}>
                      {studentDetails.status || "Active"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {studentDetails.class && (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <span>Class {studentDetails.class.name}{studentDetails.class.section ? ` - ${studentDetails.class.section}` : ""}</span>
                      </div>
                    )}
                    {studentDetails.profile.gender && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="capitalize">{studentDetails.profile.gender}</span>
                      </div>
                    )}
                    {studentDetails.profile.date_of_birth && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{format(new Date(studentDetails.profile.date_of_birth), "dd MMM yyyy")}</span>
                      </div>
                    )}
                    {studentDetails.profile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{studentDetails.profile.phone}</span>
                      </div>
                    )}
                    {studentDetails.emergency_contact && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-destructive" />
                        <span>Emergency: {studentDetails.emergency_contact}</span>
                      </div>
                    )}
                    {studentDetails.blood_group && (
                      <div className="flex items-center gap-2">
                        <span className="text-destructive font-medium">Blood:</span>
                        <span>{studentDetails.blood_group}</span>
                      </div>
                    )}
                    {studentDetails.profile.address && (
                      <div className="flex items-start gap-2 col-span-2">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>{studentDetails.profile.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                {/* Attendance */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Attendance</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">{attendancePercentage}%</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {studentDetails.attendance.present}P / {studentDetails.attendance.absent}A / {studentDetails.attendance.late}L
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-primary" style={{ width: `${attendancePercentage}%` }} />
                    </div>
                  </CardContent>
                </Card>

                {/* Fees */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-success" />
                      <span className="text-sm font-medium">Fees</span>
                    </div>
                    <div className="text-2xl font-bold text-success">
                      Rs. {studentDetails.fees.paid.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Paid of Rs. {studentDetails.fees.total.toLocaleString()}
                    </div>
                    {studentDetails.fees.pending > 0 && (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        Pending: Rs. {studentDetails.fees.pending.toLocaleString()}
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                {/* Results Summary */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-warning" />
                      <span className="text-sm font-medium">Results</span>
                    </div>
                    <div className="text-2xl font-bold text-warning">
                      {studentDetails.results.length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Exams completed
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Results */}
              {studentDetails.results.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Recent Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {studentDetails.results.slice(0, 5).map((result, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                          <div>
                            <p className="text-sm font-medium">{result.exam_name}</p>
                            <p className="text-xs text-muted-foreground">{result.subject}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {result.marks_obtained}/{result.max_marks}
                            </p>
                            {result.grade && (
                              <Badge variant="outline" className="text-xs">
                                {result.grade}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}

        {!studentDetails && !isSearching && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Enter a student name or ID to search</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StudentSearchDialog;