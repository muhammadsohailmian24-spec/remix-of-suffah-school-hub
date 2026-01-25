import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Eye, FileText, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";
import { generateRollNumberSlipPdf, generateClassRollNumberSlips, RollNumberSlipData } from "@/utils/generateRollNumberSlipPdf";

interface ExamSlipsSectionProps {
  onBack: () => void;
}

interface Exam {
  id: string;
  name: string;
  exam_type: string;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  class_id: string;
  classes: { name: string; section: string | null } | null;
  subjects: { name: string } | null;
}

interface Student {
  id: string;
  student_id: string;
  user_id: string;
  name: string;
  father_name?: string;
  photo_url?: string;
}

const ExamSlipsSection = ({ onBack }: ExamSlipsSectionProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; is_current: boolean }[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedExamName, setSelectedExamName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<RollNumberSlipData | RollNumberSlipData[] | null>(null);
  const [isClassPreview, setIsClassPreview] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedSessionId) {
      fetchExams();
    }
  }, [selectedClassId, selectedSessionId]);

  useEffect(() => {
    if (selectedClassId && selectedExamName) {
      fetchStudents();
    }
  }, [selectedClassId, selectedExamName]);

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
      .select(`id, name, exam_type, exam_date, start_time, end_time, class_id, classes(name, section), subjects(name)`)
      .eq("class_id", selectedClassId)
      .eq("academic_year_id", selectedSessionId)
      .order("exam_date", { ascending: true });

    setExams((data as Exam[]) || []);
  };

  const fetchStudents = async () => {
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_id, user_id, father_name")
      .eq("class_id", selectedClassId)
      .eq("status", "active")
      .order("student_id");

    if (!studentsData) return;

    const userIds = studentsData.map(s => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, photo_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, { name: p.full_name, photo: p.photo_url }]) || []);

    setStudents(
      studentsData.map(s => ({
        id: s.id,
        student_id: s.student_id,
        user_id: s.user_id,
        name: profileMap.get(s.user_id)?.name || "",
        father_name: s.father_name || undefined,
        photo_url: profileMap.get(s.user_id)?.photo || undefined,
      })).sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const getExamSubjects = (): { name: string; date: string; time?: string }[] => {
    return exams
      .filter(e => e.name === selectedExamName)
      .map(e => ({
        name: e.subjects?.name || "",
        date: format(parseISO(e.exam_date), "dd-MMM-yyyy"),
        time: e.start_time ? `${e.start_time}${e.end_time ? ` - ${e.end_time}` : ""}` : undefined,
      }));
  };

  const prepareSlipData = (student: Student, rollNumber: number): RollNumberSlipData => {
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const firstExam = exams.find(e => e.name === selectedExamName);

    return {
      studentName: student.name,
      studentId: student.student_id,
      fatherName: student.father_name,
      className: selectedClass?.name || "",
      section: firstExam?.classes?.section || undefined,
      rollNumber: String(rollNumber),
      examName: selectedExamName,
      examDate: firstExam ? format(parseISO(firstExam.exam_date), "dd-MMM-yyyy") : "",
      subjects: getExamSubjects(),
      photoUrl: student.photo_url,
    };
  };

  const handlePreviewIndividual = (student: Student, index: number) => {
    const data = prepareSlipData(student, index + 1);
    setPreviewData(data);
    setIsClassPreview(false);
    setPreviewOpen(true);
  };

  const handleDownloadIndividual = async (student: Student, index: number) => {
    const data = prepareSlipData(student, index + 1);
    const doc = await generateRollNumberSlipPdf(data);
    doc.save(`RollSlip-${student.student_id}.pdf`);
    toast({ title: "Downloaded", description: `Roll slip for ${student.name} downloaded` });
  };

  const handlePreviewClass = () => {
    const allSlips = students.map((student, index) => prepareSlipData(student, index + 1));
    setPreviewData(allSlips);
    setIsClassPreview(true);
    setPreviewOpen(true);
  };

  const handleDownloadClass = async () => {
    const allSlips = students.map((student, index) => prepareSlipData(student, index + 1));
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const doc = await generateClassRollNumberSlips(allSlips);
    doc.save(`RollSlips-${selectedClass?.name || "Class"}-${selectedExamName}.pdf`);
    toast({ title: "Downloaded", description: `All roll slips downloaded` });
  };

  const examNames = [...new Set(exams.map(e => e.name))];
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold">Exam Roll Number Slips</h2>
          <p className="text-muted-foreground">Download individual or class roll number slips</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Exam</CardTitle>
          <CardDescription>Choose class, session and exam to generate slips</CardDescription>
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
              <Label>Exam</Label>
              <Select value={selectedExamName} onValueChange={setSelectedExamName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {examNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedExamName && students.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Students ({students.length})</CardTitle>
              <CardDescription>Download individual slips or all at once</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreviewClass}>
                <Eye className="h-4 w-4 mr-2" />
                Preview All
              </Button>
              <Button onClick={handleDownloadClass}>
                <Users className="h-4 w-4 mr-2" />
                Download All Slips
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Roll #</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Father Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{student.student_id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.father_name || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePreviewIndividual(student, index)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadIndividual(student, index)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      {previewData && (
        <DocumentPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={isClassPreview ? "Class Roll Slips Preview" : "Roll Slip Preview"}
          filename={isClassPreview ? `RollSlips-Class.pdf` : `RollSlip.pdf`}
          generatePdf={() => 
            isClassPreview 
              ? generateClassRollNumberSlips(previewData as RollNumberSlipData[])
              : generateRollNumberSlipPdf(previewData as RollNumberSlipData)
          }
        />
      )}
    </div>
  );
};

export default ExamSlipsSection;
