import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, Download, Users, Award, Calendar, Phone, 
  Search, Loader2, GraduationCap, Trophy, Clock, Printer,
  Eye
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { generateMarksCertificatePdf, downloadMarksCertificate, MarksCertificateData } from "@/utils/generateMarksCertificatePdf";
import { generateAwardListPdf, AwardListData } from "@/utils/generateAwardListPdf";
import { generateClassTimetablePdf, ClassTimetablePdfData, TimetableEntry } from "@/utils/generateClassTimetablePdf";
import { exportToExcel, exportToCSV } from "@/utils/exportUtils";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

type ReportType = "gazette" | "dmc" | "position" | "timetable" | "awards" | "contacts";

interface Class {
  id: string;
  name: string;
  section: string | null;
  grade_level: number;
}

interface ExamType {
  exam_type: string;
}

const ReportsModule = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedSession } = useSession();
  const { toast } = useToast();
  
  const activeTab = (searchParams.get("type") as ReportType) || "gazette";
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedExamType, setSelectedExamType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [gazetteData, setGazetteData] = useState<any[]>([]);
  const [positionData, setPositionData] = useState<any[]>([]);
  const [contactsData, setContactsData] = useState<any[]>([]);
  const [timetableData, setTimetableData] = useState<any[]>([]);
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<MarksCertificateData | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");

  useEffect(() => {
    fetchClasses();
    fetchExamTypes();
  }, [selectedSession]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass, searchTerm]);

  useEffect(() => {
    if (selectedExamType && activeTab === "gazette") {
      fetchGazetteData();
    }
  }, [selectedExamType, selectedClass]);

  useEffect(() => {
    if (selectedExamType && selectedClass && activeTab === "position") {
      fetchPositionData();
    }
  }, [selectedExamType, selectedClass]);

  useEffect(() => {
    if (selectedClass && activeTab === "contacts") {
      fetchContactsData();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && activeTab === "timetable") {
      fetchTimetableData();
    }
  }, [selectedClass, selectedExamType]);

  const fetchClasses = async () => {
    let query = supabase.from("classes").select("id, name, section, grade_level").order("grade_level");
    if (selectedSession?.id) {
      query = query.eq("academic_year_id", selectedSession.id);
    }
    const { data } = await query;
    setClasses(data || []);
  };

  const fetchExamTypes = async () => {
    let query = supabase.from("exams").select("exam_type");
    if (selectedSession?.id) {
      query = query.eq("academic_year_id", selectedSession.id);
    }
    const { data } = await query;
    const types = [...new Set(data?.map(e => e.exam_type) || [])];
    setExamTypes(types);
  };

  const fetchStudents = async () => {
    let query = supabase
      .from("students")
      .select(`
        id,
        student_id,
        roll_number,
        father_name,
        father_phone,
        mother_phone,
        class_id,
        user_id,
        profiles!students_user_id_fkey (full_name, photo_url, date_of_birth)
      `)
      .eq("status", "active");

    if (selectedClass) {
      query = query.eq("class_id", selectedClass);
    }

    const { data } = await query.order("roll_number");
    
    let filtered = data || [];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((s: any) => 
        s.profiles?.full_name?.toLowerCase().includes(term) ||
        s.student_id?.toLowerCase().includes(term) ||
        s.roll_number?.toString().includes(term)
      );
    }
    
    setStudents(filtered);
  };

  const fetchGazetteData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("results")
        .select(`
          id,
          marks_obtained,
          grade,
          student_id,
          exams!inner (
            id,
            name,
            exam_type,
            max_marks,
            class_id,
            subjects (name)
          ),
          students!inner (
            id,
            student_id,
            roll_number,
            class_id,
            user_id,
            profiles!students_user_id_fkey (full_name)
          )
        `)
        .eq("exams.exam_type", selectedExamType)
        .eq("is_published", true);

      if (selectedClass) {
        query = query.eq("exams.class_id", selectedClass);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by student
      const studentMap = new Map();
      (data || []).forEach((result: any) => {
        const studentId = result.students?.id;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            studentId: result.students?.student_id,
            rollNumber: result.students?.roll_number,
            name: result.students?.profiles?.full_name,
            subjects: [],
            totalMarks: 0,
            totalMax: 0,
          });
        }
        const student = studentMap.get(studentId);
        student.subjects.push({
          name: result.exams?.subjects?.name,
          obtained: result.marks_obtained,
          max: result.exams?.max_marks || 100,
          grade: result.grade,
        });
        student.totalMarks += result.marks_obtained;
        student.totalMax += (result.exams?.max_marks || 100);
      });

      const gazetteArr = Array.from(studentMap.values())
        .map(s => ({
          ...s,
          percentage: s.totalMax > 0 ? ((s.totalMarks / s.totalMax) * 100).toFixed(1) : "0",
        }))
        .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

      // Add positions
      gazetteArr.forEach((s, idx) => {
        s.position = idx + 1;
      });

      setGazetteData(gazetteArr);
    } catch (error) {
      console.error("Error fetching gazette:", error);
      toast({ title: "Error", description: "Failed to fetch gazette data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPositionData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("results")
        .select(`
          id,
          marks_obtained,
          grade,
          position_in_class,
          exams!inner (
            id,
            exam_type,
            max_marks,
            class_id
          ),
          students!inner (
            id,
            student_id,
            roll_number,
            user_id,
            profiles!students_user_id_fkey (full_name)
          )
        `)
        .eq("exams.exam_type", selectedExamType)
        .eq("exams.class_id", selectedClass)
        .eq("is_published", true);

      if (error) throw error;

      // Group by student and calculate totals
      const studentMap = new Map();
      (data || []).forEach((result: any) => {
        const studentId = result.students?.id;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            studentId: result.students?.student_id,
            rollNumber: result.students?.roll_number,
            name: result.students?.profiles?.full_name,
            totalMarks: 0,
            totalMax: 0,
          });
        }
        const student = studentMap.get(studentId);
        student.totalMarks += result.marks_obtained;
        student.totalMax += (result.exams?.max_marks || 100);
      });

      const positionArr = Array.from(studentMap.values())
        .map(s => ({
          ...s,
          percentage: s.totalMax > 0 ? ((s.totalMarks / s.totalMax) * 100).toFixed(1) : "0",
        }))
        .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

      positionArr.forEach((s, idx) => {
        s.position = idx + 1;
      });

      setPositionData(positionArr);
    } catch (error) {
      console.error("Error fetching position data:", error);
      toast({ title: "Error", description: "Failed to fetch position data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchContactsData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          student_id,
          roll_number,
          father_name,
          father_phone,
          mother_name,
          mother_phone,
          emergency_contact,
          user_id,
          profiles!students_user_id_fkey (full_name, phone, email)
        `)
        .eq("class_id", selectedClass)
        .eq("status", "active")
        .order("roll_number");

      if (error) throw error;
      setContactsData(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast({ title: "Error", description: "Failed to fetch contact data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetableData = async () => {
    setLoading(true);
    try {
      // Fetch exam schedule for the class
      let query = supabase
        .from("exams")
        .select(`
          id,
          name,
          exam_date,
          start_time,
          end_time,
          subjects (name)
        `)
        .eq("class_id", selectedClass)
        .order("exam_date");

      if (selectedExamType) {
        query = query.eq("exam_type", selectedExamType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTimetableData(data || []);
    } catch (error) {
      console.error("Error fetching timetable:", error);
      toast({ title: "Error", description: "Failed to fetch timetable", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ type: value });
    setSelectedStudents([]);
  };

  const handleDownloadDmc = async (studentId: string) => {
    setLoading(true);
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      // Fetch results for this student
      const { data: resultsData } = await supabase
        .from("results")
        .select(`
          marks_obtained,
          grade,
          exams (
            name,
            exam_type,
            max_marks,
            subjects (name)
          )
        `)
        .eq("student_id", studentId)
        .eq("is_published", true);

      if (!resultsData || resultsData.length === 0) {
        toast({ title: "No Results", description: "No published results found for this student", variant: "destructive" });
        return;
      }

      const classData = classes.find(c => c.id === selectedClass);

      const dmcData: MarksCertificateData = {
        studentName: student.profiles?.full_name || "",
        studentId: student.student_id,
        rollNumber: student.roll_number || student.student_id,
        className: classData ? `${classData.name} ${classData.section || ""}`.trim() : "",
        session: new Date().getFullYear().toString(),
        dateOfBirth: student.profiles?.date_of_birth,
        examName: selectedExamType || resultsData[0]?.exams?.exam_type || "Examination",
        subjects: resultsData.map((r: any) => ({
          name: r.exams?.subjects?.name || "Unknown",
          maxMarks: r.exams?.max_marks || 100,
          marksObtained: r.marks_obtained,
          grade: r.grade,
        })),
        photoUrl: student.profiles?.photo_url,
      };

      await downloadMarksCertificate(dmcData);
      toast({ title: "Success", description: "DMC downloaded successfully" });
    } catch (error) {
      console.error("Error downloading DMC:", error);
      toast({ title: "Error", description: "Failed to download DMC", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDownloadDmc = async () => {
    if (selectedStudents.length === 0) {
      toast({ title: "Select Students", description: "Please select at least one student", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      for (const studentId of selectedStudents) {
        await handleDownloadDmc(studentId);
      }
      toast({ title: "Success", description: `Downloaded ${selectedStudents.length} DMC(s)` });
    } catch (error) {
      console.error("Error in bulk download:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportContacts = (format: "excel" | "csv") => {
    const columns = [
      { header: "Roll No", key: "roll_number" },
      { header: "Student ID", key: "student_id" },
      { header: "Student Name", key: "name", formatter: (v: any) => v?.profiles?.full_name || "" },
      { header: "Father Name", key: "father_name" },
      { header: "Father Phone", key: "father_phone" },
      { header: "Mother Name", key: "mother_name" },
      { header: "Mother Phone", key: "mother_phone" },
      { header: "Emergency Contact", key: "emergency_contact" },
    ];

    const data = contactsData.map(s => ({
      ...s,
      name: s,
    }));

    const classData = classes.find(c => c.id === selectedClass);
    const filename = `Contacts-${classData?.name || "Class"}-${classData?.section || ""}`;

    if (format === "excel") {
      exportToExcel(data, columns, filename, "Contacts");
    } else {
      exportToCSV(data, columns, filename);
    }
    toast({ title: "Success", description: `Contacts exported as ${format.toUpperCase()}` });
  };

  const handleExportPositionList = (format: "excel" | "csv") => {
    const columns = [
      { header: "Position", key: "position" },
      { header: "Roll No", key: "rollNumber" },
      { header: "Student ID", key: "studentId" },
      { header: "Name", key: "name" },
      { header: "Total Marks", key: "totalMarks" },
      { header: "Max Marks", key: "totalMax" },
      { header: "Percentage", key: "percentage", formatter: (v: any) => `${v}%` },
    ];

    const classData = classes.find(c => c.id === selectedClass);
    const filename = `PositionList-${classData?.name || "Class"}-${selectedExamType}`;

    if (format === "excel") {
      exportToExcel(positionData, columns, filename, "Position List");
    } else {
      exportToCSV(positionData, columns, filename);
    }
    toast({ title: "Success", description: `Position list exported as ${format.toUpperCase()}` });
  };

  const handleExportGazette = (format: "excel" | "csv") => {
    const columns = [
      { header: "Position", key: "position" },
      { header: "Roll No", key: "rollNumber" },
      { header: "Student ID", key: "studentId" },
      { header: "Name", key: "name" },
      { header: "Total Marks", key: "totalMarks" },
      { header: "Max Marks", key: "totalMax" },
      { header: "Percentage", key: "percentage", formatter: (v: any) => `${v}%` },
    ];

    const filename = `Gazette-${selectedExamType}-${selectedClass ? classes.find(c => c.id === selectedClass)?.name : "All"}`;

    if (format === "excel") {
      exportToExcel(gazetteData, columns, filename, "Gazette");
    } else {
      exportToCSV(gazetteData, columns, filename);
    }
    toast({ title: "Success", description: `Gazette exported as ${format.toUpperCase()}` });
  };

  const handlePrintTimetable = async () => {
    if (timetableData.length === 0) {
      toast({ title: "No Data", description: "No exam schedule found", variant: "destructive" });
      return;
    }

    const classData = classes.find(c => c.id === selectedClass);
    
    // Convert exam schedule to timetable entries format
    const entries: TimetableEntry[] = timetableData.map((exam: any, index: number) => ({
      day: index + 1,
      dayName: exam.exam_date ? format(parseISO(exam.exam_date), "EEEE") : `Day ${index + 1}`,
      startTime: exam.start_time || "09:00",
      endTime: exam.end_time || "12:00",
      subjectName: exam.subjects?.name || exam.name,
      teacherName: selectedExamType || "Exam",
    }));

    const doc = await generateClassTimetablePdf({
      className: classData ? `${classData.name} ${classData.section || ""}`.trim() : "Class",
      section: classData?.section || undefined,
      entries,
    });
    
    doc.save(`Exam-Timetable-${classData?.name || "Class"}.pdf`);

    toast({ title: "Success", description: "Exam timetable downloaded" });
  };

  const handleGenerateAwardList = async () => {
    if (gazetteData.length === 0) {
      toast({ title: "No Data", description: "No results found for award list", variant: "destructive" });
      return;
    }

    const classData = classes.find(c => c.id === selectedClass);
    
    // Top 10 students formatted for award list
    const topStudents = gazetteData.slice(0, 10).map((s, idx) => ({
      sr_no: idx + 1,
      student_id: s.studentId || "",
      name: s.name || "",
      father_name: "",
      theory_marks: s.totalMarks,
      practical_marks: "-",
      total_marks: s.totalMarks,
    }));

    const awardData: AwardListData = {
      session: new Date().getFullYear().toString(),
      date: format(new Date(), "dd/MM/yyyy"),
      className: classData ? classData.name : "All Classes",
      section: classData?.section || "",
      subject: "All Subjects",
      teacherName: "",
      maxMarks: gazetteData[0]?.totalMax?.toString() || "100",
      students: topStudents,
    };

    const doc = await generateAwardListPdf(awardData);
    doc.save(`Award-List-${selectedExamType}-${classData?.name || "All"}.pdf`);

    toast({ title: "Success", description: "Award list generated" });
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  return (
    <AdminLayout title="Reports" description="Generate and download various reports">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
          <TabsTrigger value="gazette" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Gazette</span>
          </TabsTrigger>
          <TabsTrigger value="dmc" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">DMC</span>
          </TabsTrigger>
          <TabsTrigger value="position" className="gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Position</span>
          </TabsTrigger>
          <TabsTrigger value="timetable" className="gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Timetable</span>
          </TabsTrigger>
          <TabsTrigger value="awards" className="gap-2">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Awards</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Contacts</span>
          </TabsTrigger>
        </TabsList>

        {/* Gazette Tab */}
        <TabsContent value="gazette">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                School Gazette
              </CardTitle>
              <CardDescription>Complete results of all students for a specific exam</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Exam Type</Label>
                  <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam type" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Class (Optional)</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Classes</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.section || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={() => handleExportGazette("excel")} disabled={gazetteData.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => handleExportGazette("csv")} disabled={gazetteData.length === 0}>
                    CSV
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : gazetteData.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Pos</TableHead>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Max</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gazetteData.map((student) => (
                        <TableRow key={student.studentId}>
                          <TableCell>
                            <Badge variant={student.position <= 3 ? "default" : "outline"}>
                              {student.position}
                            </Badge>
                          </TableCell>
                          <TableCell>{student.rollNumber}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="text-right">{student.totalMarks}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{student.totalMax}</TableCell>
                          <TableCell className="text-right font-semibold">{student.percentage}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : selectedExamType ? (
                <div className="text-center py-8 text-muted-foreground">
                  No results found for the selected criteria
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select an exam type to view gazette
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DMC Tab */}
        <TabsContent value="dmc">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Detailed Marks Certificates
              </CardTitle>
              <CardDescription>Download individual or bulk DMCs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.section || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Exam Type</Label>
                  <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {selectedStudents.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>{selectedStudents.length} student(s) selected</span>
                  <Button onClick={handleBulkDownloadDmc} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download All DMCs
                  </Button>
                </div>
              )}

              {selectedClass && students.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedStudents.length === students.length}
                            onCheckedChange={toggleAllStudents}
                          />
                        </TableHead>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={() => toggleStudentSelection(student.id)}
                            />
                          </TableCell>
                          <TableCell>{student.roll_number || "-"}</TableCell>
                          <TableCell>{student.student_id}</TableCell>
                          <TableCell className="font-medium">{student.profiles?.full_name}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadDmc(student.id)}
                              disabled={loading}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              DMC
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : selectedClass ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students found
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a class to view students
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Position List Tab */}
        <TabsContent value="position">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Position List
              </CardTitle>
              <CardDescription>Class-wise position rankings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.section || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Exam Type</Label>
                  <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={() => handleExportPositionList("excel")} disabled={positionData.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => handleExportPositionList("csv")} disabled={positionData.length === 0}>
                    CSV
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : positionData.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Position</TableHead>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Marks</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positionData.map((student) => (
                        <TableRow key={student.studentId}>
                          <TableCell>
                            <Badge 
                              variant={student.position <= 3 ? "default" : "outline"}
                              className={student.position === 1 ? "bg-yellow-500" : student.position === 2 ? "bg-gray-400" : student.position === 3 ? "bg-amber-600" : ""}
                            >
                              {student.position}
                            </Badge>
                          </TableCell>
                          <TableCell>{student.rollNumber}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="text-right">
                            {student.totalMarks}/{student.totalMax}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{student.percentage}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (selectedClass && selectedExamType) ? (
                <div className="text-center py-8 text-muted-foreground">
                  No position data found
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select class and exam type to view positions
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timetable Tab */}
        <TabsContent value="timetable">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Exam Timetable
              </CardTitle>
              <CardDescription>Print exam schedule for a class</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.section || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Exam Type (Optional)</Label>
                  <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All exams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Exams</SelectItem>
                      {examTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handlePrintTimetable} disabled={timetableData.length === 0}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print Timetable
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : timetableData.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timetableData.map((exam: any) => (
                        <TableRow key={exam.id}>
                          <TableCell>{exam.exam_date && format(parseISO(exam.exam_date), "EEE, MMM d, yyyy")}</TableCell>
                          <TableCell className="font-medium">{exam.subjects?.name || exam.name}</TableCell>
                          <TableCell>{exam.start_time || "-"}</TableCell>
                          <TableCell>{exam.end_time || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : selectedClass ? (
                <div className="text-center py-8 text-muted-foreground">
                  No exam schedule found
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a class to view exam schedule
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Awards Tab */}
        <TabsContent value="awards">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Award Lists
              </CardTitle>
              <CardDescription>Generate award lists for top performers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Exam Type</Label>
                  <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Class (Optional)</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Classes</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.section || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleGenerateAwardList} disabled={gazetteData.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Generate Award List
                  </Button>
                </div>
              </div>

              {gazetteData.length > 0 && (
                <div className="grid md:grid-cols-3 gap-4">
                  {gazetteData.slice(0, 3).map((student, idx) => (
                    <Card key={student.studentId} className={`${idx === 0 ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" : idx === 1 ? "border-gray-400 bg-gray-50 dark:bg-gray-950/20" : "border-amber-600 bg-amber-50 dark:bg-amber-950/20"}`}>
                      <CardContent className="pt-6 text-center">
                        <div className="text-4xl mb-2">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                        </div>
                        <h4 className="font-bold text-lg">{student.name}</h4>
                        <p className="text-muted-foreground">Roll No: {student.rollNumber}</p>
                        <p className="text-2xl font-bold mt-2">{student.percentage}%</p>
                        <p className="text-sm text-muted-foreground">
                          {student.totalMarks}/{student.totalMax} marks
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Student Contact Lists
              </CardTitle>
              <CardDescription>Export student and parent contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.section || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 col-span-2">
                  <Button onClick={() => handleExportContacts("excel")} disabled={contactsData.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => handleExportContacts("csv")} disabled={contactsData.length === 0}>
                    CSV
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : contactsData.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Father Name</TableHead>
                        <TableHead>Father Phone</TableHead>
                        <TableHead>Mother Phone</TableHead>
                        <TableHead>Emergency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contactsData.map((student: any) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.roll_number || "-"}</TableCell>
                          <TableCell className="font-medium">{student.profiles?.full_name}</TableCell>
                          <TableCell>{student.father_name || "-"}</TableCell>
                          <TableCell>{student.father_phone || "-"}</TableCell>
                          <TableCell>{student.mother_phone || "-"}</TableCell>
                          <TableCell>{student.emergency_contact || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : selectedClass ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students found
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a class to view contacts
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {previewData && (
        <DocumentPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title="DMC Preview"
          generatePdf={() => generateMarksCertificatePdf(previewData)}
          filename={previewFilename}
        />
      )}
    </AdminLayout>
  );
};

export default ReportsModule;
