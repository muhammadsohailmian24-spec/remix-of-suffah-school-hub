import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";

interface EnterMarksSectionProps {
  onBack: () => void;
}

interface Exam {
  id: string;
  name: string;
  exam_type: string;
  max_marks: number;
  passing_marks: number;
  class_id: string;
  subject_id: string;
  subjects: { name: string } | null;
}

interface StudentMark {
  student_id: string;
  student_db_id: string;
  name: string;
  marks: string;
  result_id: string | null;
  is_saved: boolean;
}

const EnterMarksSection = ({ onBack }: EnterMarksSectionProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; is_current: boolean }[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  const selectedExam = exams.find(e => e.id === selectedExamId);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedSessionId) {
      fetchExams();
    }
  }, [selectedClassId, selectedSessionId]);

  useEffect(() => {
    if (selectedExamId) {
      fetchStudentsAndMarks();
    }
  }, [selectedExamId]);

  const fetchInitialData = async () => {
    const [classesRes, yearsRes] = await Promise.all([
      supabase.from("classes").select("id, name").order("grade_level"),
      supabase.from("academic_years").select("id, name, is_current").order("start_date", { ascending: false }),
    ]);

    setClasses(classesRes.data || []);
    setAcademicYears(yearsRes.data || []);
    
    const currentYear = yearsRes.data?.find(y => y.is_current);
    if (currentYear) setSelectedSessionId(currentYear.id);
    
    setLoading(false);
  };

  const fetchExams = async () => {
    const { data } = await supabase
      .from("exams")
      .select(`id, name, exam_type, max_marks, passing_marks, class_id, subject_id, subjects(name)`)
      .eq("class_id", selectedClassId)
      .eq("academic_year_id", selectedSessionId)
      .order("name");

    setExams((data as Exam[]) || []);
    setSelectedExamId("");
    setStudentMarks([]);
  };

  const fetchStudentsAndMarks = async () => {
    if (!selectedExamId || !selectedClassId) return;

    // Fetch students
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_id, user_id")
      .eq("class_id", selectedClassId)
      .eq("status", "active")
      .order("student_id");

    if (!studentsData) return;

    // Fetch profiles
    const userIds = studentsData.map(s => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    // Fetch existing results
    const studentIds = studentsData.map(s => s.id);
    const { data: resultsData } = await supabase
      .from("results")
      .select("id, student_id, marks_obtained")
      .eq("exam_id", selectedExamId)
      .in("student_id", studentIds);

    const resultsMap = new Map(resultsData?.map(r => [r.student_id, { id: r.id, marks: r.marks_obtained }]) || []);

    setStudentMarks(
      studentsData.map(s => ({
        student_id: s.student_id,
        student_db_id: s.id,
        name: profileMap.get(s.user_id) || "",
        marks: resultsMap.get(s.id)?.marks?.toString() || "",
        result_id: resultsMap.get(s.id)?.id || null,
        is_saved: !!resultsMap.get(s.id),
      })).sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const handleMarksChange = (index: number, value: string) => {
    const updated = [...studentMarks];
    updated[index].marks = value;
    updated[index].is_saved = false;
    setStudentMarks(updated);
  };

  const handleSaveAll = async () => {
    if (!selectedExam) return;
    setSaving(true);

    try {
      const toInsert: any[] = [];
      const toUpdate: { id: string; marks: number }[] = [];

      studentMarks.forEach(sm => {
        if (sm.marks === "") return;
        const marksNum = parseInt(sm.marks);
        if (isNaN(marksNum)) return;

        if (sm.result_id) {
          toUpdate.push({ id: sm.result_id, marks: marksNum });
        } else {
          toInsert.push({
            exam_id: selectedExamId,
            student_id: sm.student_db_id,
            marks_obtained: marksNum,
            is_published: false,
          });
        }
      });

      // Insert new results
      if (toInsert.length > 0) {
        const { error } = await supabase.from("results").insert(toInsert);
        if (error) throw error;
      }

      // Update existing results
      for (const item of toUpdate) {
        const { error } = await supabase
          .from("results")
          .update({ marks_obtained: item.marks })
          .eq("id", item.id);
        if (error) throw error;
      }

      toast({ title: "Success", description: "Marks saved successfully" });
      fetchStudentsAndMarks();
    } catch (error) {
      console.error("Error saving marks:", error);
      toast({ title: "Error", description: "Failed to save marks", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getGradeStatus = (marks: string): "pass" | "fail" | null => {
    if (!marks || !selectedExam) return null;
    const marksNum = parseInt(marks);
    if (isNaN(marksNum)) return null;
    return marksNum >= (selectedExam.passing_marks || 40) ? "pass" : "fail";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Enter Marks</h2>
          <p className="text-muted-foreground">Select paper and enter student results</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Paper</CardTitle>
          <CardDescription>Choose class, session and exam paper</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session</Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(y => (
                    <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paper</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select paper" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} - {e.subjects?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedExam && studentMarks.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{selectedExam.name} - {selectedExam.subjects?.name}</CardTitle>
              <CardDescription>
                Max Marks: {selectedExam.max_marks} | Passing Marks: {selectedExam.passing_marks}
              </CardDescription>
            </div>
            <Button onClick={handleSaveAll} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save All Marks"}
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Marks</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[60px]">Saved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentMarks.map((sm, index) => {
                  const status = getGradeStatus(sm.marks);
                  return (
                    <TableRow key={sm.student_db_id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{sm.student_id}</TableCell>
                      <TableCell>{sm.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={selectedExam.max_marks}
                          value={sm.marks}
                          onChange={(e) => handleMarksChange(index, e.target.value)}
                          className="w-20"
                          placeholder="--"
                        />
                      </TableCell>
                      <TableCell>
                        {status === "pass" && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Pass</Badge>
                        )}
                        {status === "fail" && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Fail</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {sm.is_saved && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnterMarksSection;
