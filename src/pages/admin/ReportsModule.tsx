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
import { downloadGazetteBook, GazetteBookData } from "@/utils/generateGazetteBookPdf";
import { generatePositionListPdf, PositionListData } from "@/utils/generatePositionListPdf";
import { exportToExcel, exportToCSV } from "@/utils/exportUtils";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

type ReportType = "gazette" | "dmc" | "position" | "timetable" | "awardlist" | "contacts";

interface Class {
  id: string;
  name: string;
  section: string | null;
  grade_level: number;
}

interface Subject {
  id: string;
  name: string;
}

const ReportsModule = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedSession } = useSession();
  const { toast } = useToast();
  
  const activeTab = (searchParams.get("type") as ReportType) || "gazette";
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedExamType, setSelectedExamType] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [gazetteData, setGazetteData] = useState<any[]>([]);
  const [positionData, setPositionData] = useState<any[]>([]);
  const [contactsData, setContactsData] = useState<any[]>([]);
  const [timetableData, setTimetableData] = useState<any[]>([]);
  const [awardListData, setAwardListData] = useState<any[]>([]);
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<MarksCertificateData | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");

  useEffect(() => {
    fetchClasses();
    fetchExamTypes();
    fetchSubjects();
  }, []);

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

  useEffect(() => {
    if (selectedClass && selectedExamType && selectedSubject && activeTab === "awardlist") {
      fetchAwardListData();
    }
  }, [selectedClass, selectedExamType, selectedSubject]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("id, name, section, grade_level")
      .order("grade_level");
    setClasses(data || []);
  };

  const fetchSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("id, name")
      .order("name");
    setSubjects(data || []);
  };

  const fetchExamTypes = async () => {
    const { data } = await supabase.from("exams").select("exam_type");
    const types = [...new Set(data?.map(e => e.exam_type) || [])];
    setExamTypes(types);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Fetch students first with all needed fields
      let query = supabase
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
          class_id,
          user_id
        `)
        .eq("status", "active");

      if (selectedClass) {
        query = query.eq("class_id", selectedClass);
      }

      // Order by roll_number, handling nulls
      const { data: studentsData, error: studentsError } = await query.order("roll_number", { nullsFirst: false });
      
      if (studentsError) {
        console.error("Error fetching students:", studentsError);
        setStudents([]);
        return;
      }

      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch profiles for these students
      const userIds = studentsData.map(s => s.user_id).filter(Boolean);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, date_of_birth, phone, email")
        .in("user_id", userIds);

      // Create a map of profiles by user_id
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Combine students with their profiles
      let combined = studentsData.map(student => ({
        ...student,
        profiles: profilesMap.get(student.user_id) || null
      }));

      // Sort by name alphabetically to assign sequential roll numbers (same as roll number slip)
      combined.sort((a, b) => {
        const nameA = a.profiles?.full_name || "";
        const nameB = b.profiles?.full_name || "";
        return nameA.localeCompare(nameB);
      });

      // Assign sequential roll numbers (1, 2, 3, ...) based on alphabetical order
      combined = combined.map((student, index) => ({
        ...student,
        sequentialRollNumber: index + 1
      }));

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        combined = combined.filter((s: any) => 
          s.profiles?.full_name?.toLowerCase().includes(term) ||
          s.student_id?.toLowerCase().includes(term) ||
          s.sequentialRollNumber?.toString().includes(term) ||
          s.father_name?.toLowerCase().includes(term)
        );
      }
      
      setStudents(combined);
    } catch (error) {
      console.error("Error in fetchStudents:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGazetteData = async () => {
    setLoading(true);
    try {
      // First fetch results with exams
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
          )
        `)
        .eq("exams.exam_type", selectedExamType)
        .eq("is_published", true);

      if (selectedClass) {
        query = query.eq("exams.class_id", selectedClass);
      }

      const { data: resultsData, error: resultsError } = await query;
      
      if (resultsError) {
        console.error("Error fetching results:", resultsError);
        setGazetteData([]);
        return;
      }

      if (!resultsData || resultsData.length === 0) {
        setGazetteData([]);
        return;
      }

      // Get unique student IDs from results
      const studentIds = [...new Set(resultsData.map(r => r.student_id))];
      
      // Fetch students data
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, student_id, roll_number, user_id")
        .in("id", studentIds);

      // Fetch profiles
      const userIds = studentsData?.map(s => s.user_id).filter(Boolean) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Create maps
      const studentsMap = new Map(studentsData?.map(s => [s.id, s]) || []);
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Build students list with names for sequential roll number calculation
      const studentsWithNames = (studentsData || []).map(s => ({
        id: s.id,
        student_id: s.student_id,
        roll_number: s.roll_number,
        user_id: s.user_id,
        name: profilesMap.get(s.user_id)?.full_name || ""
      })).sort((a, b) => a.name.localeCompare(b.name));

      // Create a map of student id -> sequential roll number (1-indexed position sorted by name)
      const sequentialRollMap = new Map(studentsWithNames.map((s, idx) => [s.id, idx + 1]));

      // Group by student
      const studentMap = new Map();
      resultsData.forEach((result: any) => {
        const studentId = result.student_id;
        const student = studentsMap.get(studentId);
        const profile = student ? profilesMap.get(student.user_id) : null;
        
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            studentId: student?.student_id,
            rollNumber: sequentialRollMap.get(studentId) || student?.roll_number || student?.student_id,
            name: profile?.full_name || "Unknown",
            subjects: [],
            totalMarks: 0,
            totalMax: 0,
          });
        }
        const studentData = studentMap.get(studentId);
        studentData.subjects.push({
          name: result.exams?.subjects?.name,
          obtained: result.marks_obtained,
          max: result.exams?.max_marks || 100,
          grade: result.grade,
        });
        studentData.totalMarks += result.marks_obtained;
        studentData.totalMax += (result.exams?.max_marks || 100);
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
      const { data: resultsData, error: resultsError } = await supabase
        .from("results")
        .select(`
          id,
          marks_obtained,
          grade,
          position_in_class,
          student_id,
          exams!inner (
            id,
            exam_type,
            max_marks,
            class_id
          )
        `)
        .eq("exams.exam_type", selectedExamType)
        .eq("exams.class_id", selectedClass)
        .eq("is_published", true);

      if (resultsError) {
        console.error("Error fetching results:", resultsError);
        setPositionData([]);
        return;
      }

      if (!resultsData || resultsData.length === 0) {
        setPositionData([]);
        return;
      }

      // Get unique student IDs
      const studentIds = [...new Set(resultsData.map(r => r.student_id))];
      
      // Fetch students
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, student_id, roll_number, user_id")
        .in("id", studentIds);

      // Fetch profiles
      const userIds = studentsData?.map(s => s.user_id).filter(Boolean) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Create maps
      const studentsMap = new Map(studentsData?.map(s => [s.id, s]) || []);
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Group by student and calculate totals
      const studentMap = new Map();
      resultsData.forEach((result: any) => {
        const studentId = result.student_id;
        const student = studentsMap.get(studentId);
        const profile = student ? profilesMap.get(student.user_id) : null;
        
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            studentId: student?.student_id,
            rollNumber: student?.roll_number,
            name: profile?.full_name || "Unknown",
            totalMarks: 0,
            totalMax: 0,
          });
        }
        const studentData = studentMap.get(studentId);
        studentData.totalMarks += result.marks_obtained;
        studentData.totalMax += (result.exams?.max_marks || 100);
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
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
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
          user_id
        `)
        .eq("class_id", selectedClass)
        .eq("status", "active")
        .order("roll_number");

      if (studentsError) {
        console.error("Error fetching students:", studentsError);
        setContactsData([]);
        return;
      }

      if (!studentsData || studentsData.length === 0) {
        setContactsData([]);
        return;
      }

      // Fetch profiles
      const userIds = studentsData.map(s => s.user_id).filter(Boolean);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Combine
      const combined = studentsData.map(student => ({
        ...student,
        profiles: profilesMap.get(student.user_id) || null
      }));

      setContactsData(combined);
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

  const fetchAwardListData = async () => {
    setLoading(true);
    try {
      // Fetch results for the specific subject, class, and exam type
      const { data: resultsData, error: resultsError } = await supabase
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
            subject_id,
            subjects (name)
          )
        `)
        .eq("exams.exam_type", selectedExamType)
        .eq("exams.class_id", selectedClass)
        .eq("exams.subject_id", selectedSubject)
        .eq("is_published", true);

      if (resultsError) {
        console.error("Error fetching award list:", resultsError);
        setAwardListData([]);
        return;
      }

      if (!resultsData || resultsData.length === 0) {
        setAwardListData([]);
        return;
      }

      // Get unique student IDs
      const studentIds = [...new Set(resultsData.map(r => r.student_id))];
      
      // Fetch students
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, student_id, roll_number, father_name, user_id")
        .in("id", studentIds);

      // Fetch profiles
      const userIds = studentsData?.map(s => s.user_id).filter(Boolean) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Create maps
      const studentsMap = new Map(studentsData?.map(s => [s.id, s]) || []);
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Build students list with names for sequential roll number calculation
      const studentsWithNames = (studentsData || []).map(s => ({
        id: s.id,
        name: profilesMap.get(s.user_id)?.full_name || ""
      })).sort((a, b) => a.name.localeCompare(b.name));

      // Create a map of student id -> sequential roll number (1-indexed position sorted by name)
      const sequentialRollMap = new Map(studentsWithNames.map((s, idx) => [s.id, idx + 1]));

      // Build award list
      const awardList = resultsData.map((result: any) => {
        const student = studentsMap.get(result.student_id);
        const profile = student ? profilesMap.get(student.user_id) : null;
        
        return {
          studentId: student?.student_id || "",
          rollNumber: sequentialRollMap.get(result.student_id)?.toString() || student?.roll_number || "",
          name: profile?.full_name || "Unknown",
          fatherName: student?.father_name || "",
          marksObtained: result.marks_obtained,
          maxMarks: result.exams?.max_marks || 100,
          grade: result.grade,
          subjectName: result.exams?.subjects?.name || ""
        };
      }).sort((a, b) => b.marksObtained - a.marksObtained);

      setAwardListData(awardList);
    } catch (error) {
      console.error("Error fetching award list:", error);
      toast({ title: "Error", description: "Failed to fetch award list", variant: "destructive" });
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

      // Fetch grading schemes for dynamic grading
      const { data: gradingSchemes } = await supabase
        .from("grading_schemes")
        .select("*")
        .order("min_percentage", { ascending: false });

      // Helper function to get grade and feedback from percentage
      const getGradeAndFeedback = (percentage: number) => {
        if (!gradingSchemes) return { grade: "-", feedback: "" };
        const scheme = gradingSchemes.find(
          (g) => percentage >= g.min_percentage && percentage <= g.max_percentage
        );
        if (scheme) {
          // The grade field contains both grade and feedback like "A++ Outstanding"
          const parts = scheme.grade.split(" ");
          const gradeCode = parts[0] || scheme.grade;
          const feedback = parts.slice(1).join(" ") || scheme.remarks || "";
          return { grade: gradeCode, feedback };
        }
        return { grade: "-", feedback: "" };
      };

      // Fetch results for this student - filter by exam type if selected
      let query = supabase
        .from("results")
        .select(`
          marks_obtained,
          grade,
          exams (
            name,
            exam_type,
            max_marks,
            class_id,
            subjects (name)
          )
        `)
        .eq("student_id", studentId)
        .eq("is_published", true);

      if (selectedExamType) {
        query = query.eq("exams.exam_type", selectedExamType);
      }

      const { data: resultsData } = await query;

      if (!resultsData || resultsData.length === 0) {
        toast({ title: "No Results", description: "No published results found for this student", variant: "destructive" });
        return;
      }

      const classData = classes.find(c => c.id === selectedClass);

      // Calculate overall percentage and get feedback
      const totalMarks = resultsData.reduce((sum: number, r: any) => sum + (r.exams?.max_marks || 100), 0);
      const obtainedMarks = resultsData.reduce((sum: number, r: any) => sum + r.marks_obtained, 0);
      const overallPercentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
      const { grade: overallGrade, feedback: overallFeedback } = getGradeAndFeedback(overallPercentage);

      // Use sequentialRollNumber (position in class sorted by name) as used in roll number slips
      const displayRollNumber = student.sequentialRollNumber?.toString() || student.roll_number || student.student_id || "";

      const dmcData: MarksCertificateData = {
        studentName: student.profiles?.full_name || "",
        fatherName: student.father_name || "",
        studentId: student.student_id,
        rollNumber: displayRollNumber,
        className: classData?.name || "",
        section: classData?.section || "",
        session: selectedSession?.name || new Date().getFullYear().toString(),
        dateOfBirth: student.profiles?.date_of_birth,
        examName: selectedExamType || resultsData[0]?.exams?.exam_type || "Examination",
        examMonth: selectedExamType || "Examination",
        subjects: resultsData.map((r: any) => {
          const subjectPercentage = ((r.marks_obtained / (r.exams?.max_marks || 100)) * 100);
          const { grade } = getGradeAndFeedback(subjectPercentage);
          return {
            name: r.exams?.subjects?.name || "Unknown",
            maxMarks: r.exams?.max_marks || 100,
            marksObtained: r.marks_obtained,
            grade: grade,
          };
        }),
        photoUrl: student.profiles?.photo_url,
        schoolName: "THE SUFFAH PUBLIC SCHOOL & COLLEGE",
        schoolAddress: "Madyan Swat, Pakistan",
        overallGrade: overallGrade,
        overallFeedback: overallFeedback,
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

  const handleDownloadPositionListPdf = async () => {
    if (positionData.length === 0) {
      toast({ title: "No Data", description: "No position data to download", variant: "destructive" });
      return;
    }

    const classData = classes.find(c => c.id === selectedClass);
    
    const pdfData: PositionListData = {
      session: selectedSession?.name || new Date().getFullYear().toString(),
      className: classData?.name || "Class",
      section: classData?.section || "",
      examType: selectedExamType,
      date: format(new Date(), "dd-MMM-yyyy"),
      students: positionData.map(s => ({
        position: s.position,
        rollNumber: s.rollNumber || s.studentId,
        studentId: s.studentId,
        name: s.name,
        totalMarks: s.totalMarks,
        totalMax: s.totalMax,
        percentage: s.percentage,
      })),
    };

    const doc = await generatePositionListPdf(pdfData);
    doc.save(`Position-List-${classData?.name || "Class"}-${selectedExamType}.pdf`);
    toast({ title: "Success", description: "Position list PDF downloaded" });
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

    const filename = `Gazette-Book-${selectedExamType}-${selectedClass ? classes.find(c => c.id === selectedClass)?.name : "All"}`;

    if (format === "excel") {
      exportToExcel(gazetteData, columns, filename, "Gazette Book");
    } else {
      exportToCSV(gazetteData, columns, filename);
    }
    toast({ title: "Success", description: `Gazette Book exported as ${format.toUpperCase()}` });
  };

  const handleDownloadGazettePdf = async () => {
    if (gazetteData.length === 0) {
      toast({ title: "No Data", description: "No gazette data to download", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Fetch grading schemes for grade calculation
      const { data: gradingSchemes } = await supabase
        .from("grading_schemes")
        .select("*")
        .order("min_percentage", { ascending: false });

      const getGrade = (percentage: number) => {
        if (!gradingSchemes) return "-";
        const scheme = gradingSchemes.find(
          (g) => percentage >= g.min_percentage && percentage <= g.max_percentage
        );
        return scheme ? scheme.grade.split(" ")[0] : "-";
      };

      // Get all unique subjects from gazette data
      const allSubjects = [...new Set(gazetteData.flatMap(s => s.subjects.map((sub: any) => sub.name)))];

      // Group students by class if no class is selected
      let classResults: { className: string; section?: string; students: any[] }[] = [];

      if (selectedClass) {
        const classData = classes.find(c => c.id === selectedClass);
        classResults = [{
          className: classData?.name || "Class",
          section: classData?.section || undefined,
          students: gazetteData.map(s => ({
            ...s,
            grade: getGrade(parseFloat(s.percentage))
          }))
        }];
      } else {
        // Fetch class info for all students to group them
        const studentClassMap = new Map<string, any[]>();
        
        // For simplicity, put all in one group when "All Classes" is selected
        // In a more advanced version, we'd fetch class_id for each student
        classResults = [{
          className: "All Classes",
          section: undefined,
          students: gazetteData.map(s => ({
            ...s,
            grade: getGrade(parseFloat(s.percentage))
          }))
        }];
      }

      const gazetteBookData: GazetteBookData = {
        examName: selectedExamType || "Examination",
        session: selectedSession?.name || new Date().getFullYear().toString(),
        schoolName: "THE SUFFAH PUBLIC SCHOOL & COLLEGE",
        schoolAddress: "Madyan Swat, Pakistan",
        generatedDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        classes: classResults,
        allSubjects: allSubjects,
      };

      await downloadGazetteBook(gazetteBookData);
      toast({ title: "Success", description: "Gazette Book PDF downloaded successfully" });
    } catch (error) {
      console.error("Error downloading gazette PDF:", error);
      toast({ title: "Error", description: "Failed to download Gazette Book PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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

  const handleDownloadAwardList = async () => {
    if (awardListData.length === 0) {
      toast({ title: "No Data", description: "No results found for award list", variant: "destructive" });
      return;
    }

    const classData = classes.find(c => c.id === selectedClass);
    const subjectData = subjects.find(s => s.id === selectedSubject);
    
    // Format students for award list PDF - use rollNumber (sequential position in class)
    const awardStudents = awardListData.map((s, idx) => ({
      sr_no: idx + 1,
      student_id: s.rollNumber || s.studentId || "",
      name: s.name || "",
      father_name: s.fatherName || "",
      theory_marks: s.marksObtained,
      practical_marks: "-",
      total_marks: s.marksObtained,
    }));

    const awardData: AwardListData = {
      session: selectedSession?.name || new Date().getFullYear().toString(),
      date: format(new Date(), "dd/MM/yyyy"),
      className: classData ? classData.name : "Class",
      section: classData?.section || "",
      subject: subjectData?.name || "Subject",
      teacherName: "",
      maxMarks: awardListData[0]?.maxMarks?.toString() || "100",
      students: awardStudents,
    };

    const doc = await generateAwardListPdf(awardData);
    doc.save(`Award-List-${subjectData?.name || "Subject"}-${classData?.name || "Class"}-${selectedExamType}.pdf`);

    toast({ title: "Success", description: "Award list downloaded" });
  };

  const handleExportAwardList = (format: "excel" | "csv") => {
    const columns = [
      { header: "Sr No", key: "srNo" },
      { header: "Roll No", key: "rollNumber" },
      { header: "Student ID", key: "studentId" },
      { header: "Name", key: "name" },
      { header: "Father Name", key: "fatherName" },
      { header: "Marks Obtained", key: "marksObtained" },
      { header: "Max Marks", key: "maxMarks" },
      { header: "Grade", key: "grade" },
    ];

    const data = awardListData.map((s, idx) => ({
      ...s,
      srNo: idx + 1,
    }));

    const classData = classes.find(c => c.id === selectedClass);
    const subjectData = subjects.find(s => s.id === selectedSubject);
    const filename = `AwardList-${subjectData?.name || "Subject"}-${classData?.name || "Class"}-${selectedExamType}`;

    if (format === "excel") {
      exportToExcel(data, columns, filename, "Award List");
    } else {
      exportToCSV(data, columns, filename);
    }
    toast({ title: "Success", description: `Award list exported as ${format.toUpperCase()}` });
  };

  const handleDownloadBlankAwardList = async () => {
    if (!selectedClass) {
      toast({ title: "Select Class", description: "Please select a class first", variant: "destructive" });
      return;
    }

    try {
      // Fetch students from the selected class
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, student_id, roll_number, father_name, user_id")
        .eq("status", "active")
        .eq("class_id", selectedClass);

      if (!studentsData || studentsData.length === 0) {
        toast({ title: "No Students", description: "No students found in this class", variant: "destructive" });
        return;
      }

      // Fetch profiles for names
      const userIds = studentsData.map(s => s.user_id).filter(Boolean);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Sort by name alphabetically and assign sequential roll numbers
      const studentsWithNames = studentsData.map(s => ({
        ...s,
        name: profilesMap.get(s.user_id)?.full_name || ""
      })).sort((a, b) => a.name.localeCompare(b.name));

      const classData = classes.find(c => c.id === selectedClass);

      // Format students for blank award list (with empty marks)
      const blankStudents = studentsWithNames.map((s, idx) => ({
        sr_no: idx + 1,
        student_id: (idx + 1).toString(), // Sequential roll number
        name: s.name,
        father_name: s.father_name || "",
        theory_marks: "",
        practical_marks: "",
        total_marks: "",
      }));

      const blankData: AwardListData = {
        session: selectedSession?.name || new Date().getFullYear().toString(),
        date: format(new Date(), "dd-MMM-yyyy"),
        className: classData ? classData.name : "Class",
        section: classData?.section || "",
        subject: "", // Blank for handwritten entry
        teacherName: "", // Blank for handwritten entry
        maxMarks: "", // Blank for handwritten entry
        students: blankStudents,
        isBlank: true,
      };

      const doc = await generateAwardListPdf(blankData);
      doc.save(`Blank-Award-List-${classData?.name || "Class"}.pdf`);
      toast({ title: "Success", description: "Blank award list downloaded" });
    } catch (error) {
      console.error("Error generating blank award list:", error);
      toast({ title: "Error", description: "Failed to generate blank award list", variant: "destructive" });
    }
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
            <span className="hidden sm:inline">Gazette Book</span>
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
          <TabsTrigger value="awardlist" className="gap-2">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Award List</span>
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
                Gazette Book
              </CardTitle>
              <CardDescription>Complete results of the whole school for a specific exam - downloadable as PDF</CardDescription>
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
                  <Select value={selectedClass || "all"} onValueChange={(v) => setSelectedClass(v === "all" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.section || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleDownloadGazettePdf} disabled={gazetteData.length === 0 || loading}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button variant="outline" onClick={() => handleExportGazette("excel")} disabled={gazetteData.length === 0}>
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
                  Select an exam type to view the Gazette Book
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

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : selectedClass && students.length > 0 ? (
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
                          <TableCell className="font-medium">{student.profiles?.full_name || "-"}</TableCell>
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
                  No students found in this class
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
                  <Button onClick={handleDownloadPositionListPdf} disabled={positionData.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button variant="outline" onClick={() => handleExportPositionList("excel")} disabled={positionData.length === 0}>
                    Excel
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
                  <Select value={selectedExamType || "all"} onValueChange={(v) => setSelectedExamType(v === "all" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All exams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Exams</SelectItem>
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

        {/* Award List Tab */}
        <TabsContent value="awardlist">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Subject-wise Award List
              </CardTitle>
              <CardDescription>Marks of the whole class for a single subject</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 flex-wrap">
                  <Button onClick={handleDownloadAwardList} disabled={awardListData.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => handleExportAwardList("excel")} disabled={awardListData.length === 0}>
                    Excel
                  </Button>
                  <Button variant="secondary" onClick={handleDownloadBlankAwardList}>
                    <FileText className="w-4 h-4 mr-2" />
                    Blank Form
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : awardListData.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Sr No</TableHead>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Father Name</TableHead>
                        <TableHead className="text-right">Marks</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {awardListData.map((student, idx) => (
                        <TableRow key={student.studentId}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{student.rollNumber || "-"}</TableCell>
                          <TableCell>{student.studentId}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.fatherName || "-"}</TableCell>
                          <TableCell className="text-right">
                            {student.marksObtained}/{student.maxMarks}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{student.grade || "-"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (selectedClass && selectedExamType && selectedSubject) ? (
                <div className="text-center py-8 text-muted-foreground">
                  No results found for the selected criteria
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select class, exam type, and subject to view award list
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
                          <TableCell className="font-medium">{student.profiles?.full_name || "-"}</TableCell>
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

      {/* Preview Dialog */}
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
