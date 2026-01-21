import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import ExamWizard from "@/components/admin/ExamWizard";
import ExamsList from "@/components/admin/ExamsList";
import BulkExamDialog from "@/components/admin/BulkExamDialog";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";
import { format, parseISO } from "date-fns";
import { generateAwardListPdf, downloadAwardList, AwardListData } from "@/utils/generateAwardListPdf";
import { generateClassRollNumberSlips, downloadClassRollNumberSlips, RollNumberSlipData } from "@/utils/generateRollNumberSlipPdf";

interface Exam {
  id: string;
  name: string;
  exam_type: string;
  exam_date: string;
  max_marks: number | null;
  passing_marks: number | null;
  start_time: string | null;
  end_time: string | null;
  class_id: string;
  subject_id: string;
  academic_year_id: string | null;
  classes: { name: string } | null;
  subjects: { name: string } | null;
}

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  midterm: "Mid-Term",
  final: "Final Term",
  quiz: "Class Test / Quiz",
  assignment: "Assignment",
  practical: "Practical",
};

const AdminExams = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Data states
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Wizard selection states
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<string | null>(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"awardList" | "rollSlips">("awardList");
  const [previewAwardListData, setPreviewAwardListData] = useState<AwardListData | null>(null);
  const [previewRollSlipsData, setPreviewRollSlipsData] = useState<RollNumberSlipData[] | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    exam_type: "midterm",
    exam_date: "",
    max_marks: "100",
    passing_marks: "40",
    start_time: "",
    end_time: "",
    subject_id: "",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedSessionId && selectedExamType) {
      fetchFilteredExams();
    }
  }, [selectedClassId, selectedSessionId, selectedExamType]);

  const fetchInitialData = async () => {
    const [classesRes, subjectsRes, yearsRes] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name").order("name"),
      supabase.from("academic_years").select("id, name, is_current").order("start_date", { ascending: false }),
    ]);

    setClasses(classesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setAcademicYears(yearsRes.data || []);
    setLoading(false);
  };

  const fetchFilteredExams = async () => {
    if (!selectedClassId || !selectedSessionId || !selectedExamType) return;
    
    const { data } = await supabase
      .from("exams")
      .select(`*, classes(name), subjects(name)`)
      .eq("class_id", selectedClassId)
      .eq("academic_year_id", selectedSessionId)
      .eq("exam_type", selectedExamType)
      .order("exam_date", { ascending: false });

    setExams((data as Exam[]) || []);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      exam_type: selectedExamType || "midterm",
      exam_date: "",
      max_marks: "100",
      passing_marks: "40",
      start_time: "",
      end_time: "",
      subject_id: "",
    });
    setEditingExam(null);
  };

  const handleAddExam = () => {
    resetForm();
    setFormData(prev => ({ ...prev, exam_type: selectedExamType || "midterm" }));
    setDialogOpen(true);
  };

  const openEditDialog = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      exam_type: exam.exam_type,
      exam_date: exam.exam_date,
      max_marks: String(exam.max_marks || 100),
      passing_marks: String(exam.passing_marks || 40),
      start_time: exam.start_time || "",
      end_time: exam.end_time || "",
      subject_id: exam.subject_id,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const examData = {
      name: formData.name,
      exam_type: formData.exam_type,
      exam_date: formData.exam_date,
      max_marks: parseInt(formData.max_marks),
      passing_marks: parseInt(formData.passing_marks),
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      class_id: selectedClassId!,
      subject_id: formData.subject_id,
      academic_year_id: selectedSessionId,
    };

    if (editingExam) {
      const { error } = await supabase.from("exams").update(examData).eq("id", editingExam.id);
      if (error) {
        toast({ title: "Error", description: "Failed to update exam", variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Exam updated successfully" });
    } else {
      const { error } = await supabase.from("exams").insert(examData);
      if (error) {
        toast({ title: "Error", description: "Failed to create exam", variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Exam created successfully" });
    }

    setDialogOpen(false);
    resetForm();
    fetchFilteredExams();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exam?")) return;
    
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete exam", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Exam deleted successfully" });
    fetchFilteredExams();
  };

  const handleReset = () => {
    setSelectedClassId(null);
    setSelectedSessionId(null);
    setSelectedExamType(null);
    setExams([]);
  };

  // Session creation handler
  const handleCreateSession = async (sessionData: { name: string; start_date: string; end_date: string; is_current: boolean }): Promise<string | null> => {
    const { data, error } = await supabase
      .from("academic_years")
      .insert({
        name: sessionData.name,
        start_date: sessionData.start_date,
        end_date: sessionData.end_date,
        is_current: sessionData.is_current,
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to create session", variant: "destructive" });
      return null;
    }

    toast({ title: "Success", description: "Academic session created successfully" });
    
    // Refresh academic years
    const { data: yearsData } = await supabase
      .from("academic_years")
      .select("id, name, is_current")
      .order("start_date", { ascending: false });
    setAcademicYears(yearsData || []);

    return data.id;
  };

  // Bulk exam creation handler
  const handleBulkExamSubmit = async (bulkExams: { name: string; subject_id: string; exam_date: string; start_time: string; end_time: string; max_marks: string; passing_marks: string }[]) => {
    const examsToInsert = bulkExams.map(exam => ({
      name: exam.name,
      exam_type: selectedExamType!,
      exam_date: exam.exam_date,
      max_marks: parseInt(exam.max_marks),
      passing_marks: parseInt(exam.passing_marks),
      start_time: exam.start_time || null,
      end_time: exam.end_time || null,
      class_id: selectedClassId!,
      subject_id: exam.subject_id,
      academic_year_id: selectedSessionId,
    }));

    const { error } = await supabase.from("exams").insert(examsToInsert);
    
    if (error) {
      toast({ title: "Error", description: "Failed to create exams", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `${bulkExams.length} exam(s) scheduled successfully` });
    fetchFilteredExams();
  };

  // PDF Generation functions (same as before)
  const prepareAwardListData = async (exam: Exam): Promise<AwardListData | null> => {
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, student_id, user_id, class_id, father_name")
      .eq("class_id", exam.class_id)
      .eq("status", "active")
      .order("student_id");

    if (studentsError || !studentsData || studentsData.length === 0) {
      toast({ title: "Error", description: "Failed to fetch students or no students found", variant: "destructive" });
      return null;
    }

    const userIds = studentsData.map(s => s.user_id);
    const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    const profileMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

    const { data: classData } = await supabase.from("classes").select("name, section").eq("id", exam.class_id).single();

    const studentIds = studentsData.map(s => s.id);
    const { data: resultsData } = await supabase.from("results").select("student_id, marks_obtained, created_at").eq("exam_id", exam.id).in("student_id", studentIds);
    const resultsMap = new Map(resultsData?.map(r => [r.student_id, r.marks_obtained]) || []);

    let resultUploadDate = "";
    if (resultsData && resultsData.length > 0) {
      const latestResult = resultsData.reduce((latest, current) => new Date(current.created_at || 0) > new Date(latest.created_at || 0) ? current : latest);
      if (latestResult.created_at) resultUploadDate = format(parseISO(latestResult.created_at), "dd-MMM-yyyy");
    }

    let teacherName = "";
    const { data: timetableData } = await supabase.from("timetable").select("teacher_id").eq("class_id", exam.class_id).eq("subject_id", exam.subject_id).limit(1).maybeSingle();
    if (timetableData?.teacher_id) {
      const { data: teacherData } = await supabase.from("teachers").select("user_id").eq("id", timetableData.teacher_id).single();
      if (teacherData?.user_id) {
        const { data: teacherProfile } = await supabase.from("profiles").select("full_name").eq("user_id", teacherData.user_id).single();
        teacherName = teacherProfile?.full_name || "";
      }
    }

    const sessionName = academicYears.find(a => a.id === selectedSessionId)?.name || "";

    return {
      session: sessionName,
      date: resultUploadDate || format(parseISO(exam.exam_date), "dd-MMM-yyyy"),
      className: classData?.name || exam.classes?.name || "",
      section: classData?.section || "",
      subject: exam.subjects?.name || "",
      teacherName,
      maxMarks: String(exam.max_marks || "100"),
      students: studentsData.map((student, index) => ({
        sr_no: index + 1,
        student_id: student.student_id,
        name: profileMap.get(student.user_id) || "",
        father_name: student.father_name || "",
        theory_marks: resultsMap.get(student.id) || "",
        practical_marks: "",
        total_marks: resultsMap.get(student.id) || "",
      })),
    };
  };

  const prepareRollSlipsData = async (exam: Exam): Promise<RollNumberSlipData[] | null> => {
    const { data: studentsData, error: studentsError } = await supabase.from("students").select("id, student_id, user_id, class_id").eq("class_id", exam.class_id).eq("status", "active");
    if (studentsError || !studentsData || studentsData.length === 0) {
      toast({ title: "Error", description: "Failed to fetch students or no students found", variant: "destructive" });
      return null;
    }

    const userIds = studentsData.map(s => s.user_id);
    const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, photo_url").in("user_id", userIds);
    const profileMap = new Map(profilesData?.map(p => [p.user_id, { name: p.full_name, photo: p.photo_url }]) || []);

    const { data: classData } = await supabase.from("classes").select("name, section").eq("id", exam.class_id).single();

    const studentIds = studentsData.map(s => s.id);
    const { data: parentLinks } = await supabase.from("student_parents").select("student_id, parent_id").in("student_id", studentIds).eq("is_primary", true);
    const fatherNameMap = new Map<string, string>();
    if (parentLinks && parentLinks.length > 0) {
      const parentIds = parentLinks.map(p => p.parent_id);
      const { data: parents } = await supabase.from("parents").select("id, user_id").in("id", parentIds);
      if (parents) {
        const parentUserIds = parents.map(p => p.user_id);
        const { data: parentProfiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", parentUserIds);
        const parentProfileMap = new Map(parentProfiles?.map(p => [p.user_id, p.full_name]) || []);
        const parentIdToName = new Map(parents.map(p => [p.id, parentProfileMap.get(p.user_id) || ""]));
        parentLinks.forEach(link => fatherNameMap.set(link.student_id, parentIdToName.get(link.parent_id) || ""));
      }
    }

    const { data: classExams } = await supabase.from("exams").select("*, subjects(name)").eq("class_id", exam.class_id).gte("exam_date", exam.exam_date).order("exam_date");
    const subjects = classExams?.map(e => ({ name: e.subjects?.name || "", date: format(parseISO(e.exam_date), "dd-MMM-yyyy"), time: e.start_time ? `${e.start_time}${e.end_time ? ` - ${e.end_time}` : ""}` : undefined })) || [];

    const sortedStudents = studentsData.map(student => ({ ...student, name: profileMap.get(student.user_id)?.name || "", photo: profileMap.get(student.user_id)?.photo || undefined })).sort((a, b) => a.name.localeCompare(b.name));

    return sortedStudents.map((student, index) => ({
      studentName: student.name,
      studentId: student.student_id,
      fatherName: fatherNameMap.get(student.id),
      className: classData?.name || exam.classes?.name || "",
      section: classData?.section,
      rollNumber: String(index + 1),
      examName: exam.name,
      examDate: format(parseISO(exam.exam_date), "dd-MMM-yyyy"),
      examTime: exam.start_time ? `${exam.start_time}${exam.end_time ? ` - ${exam.end_time}` : ""}` : undefined,
      subjects,
      photoUrl: student.photo,
    }));
  };

  const handlePreviewAwardList = async (exam: Exam) => {
    const data = await prepareAwardListData(exam);
    if (data) {
      setPreviewAwardListData(data);
      setPreviewFilename(`Award-List-${exam.classes?.name}-${exam.subjects?.name}`);
      setPreviewType("awardList");
      setPreviewOpen(true);
    }
  };

  const handleDownloadAwardList = async (exam: Exam) => {
    const data = await prepareAwardListData(exam);
    if (data) {
      await downloadAwardList(data, `Award-List-${exam.classes?.name}-${exam.subjects?.name}`);
      toast({ title: "Downloaded", description: "Award list PDF downloaded successfully" });
    }
  };

  const handlePreviewRollSlips = async (exam: Exam) => {
    const data = await prepareRollSlipsData(exam);
    if (data) {
      setPreviewRollSlipsData(data);
      setPreviewFilename(`RollNumberSlips-${exam.classes?.name}`);
      setPreviewType("rollSlips");
      setPreviewOpen(true);
    }
  };

  const handleDownloadRollSlips = async (exam: Exam) => {
    const data = await prepareRollSlipsData(exam);
    if (data) {
      await downloadClassRollNumberSlips(data, exam.classes?.name || "Class");
      toast({ title: "Downloaded", description: "Roll number slips PDF downloaded successfully" });
    }
  };

  const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || "";
  const selectedSessionName = academicYears.find(a => a.id === selectedSessionId)?.name || "";
  const showExamsList = selectedClassId && selectedSessionId && selectedExamType;

  if (loading) {
    return (
      <AdminLayout title="Exam Management" description="Schedule and manage exams">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Exam Management" 
      description={showExamsList 
        ? `${selectedClassName} • ${selectedSessionName} • ${EXAM_TYPE_LABELS[selectedExamType] || selectedExamType}` 
        : "Select class, session, and exam type to view exams"
      }
    >
      {!showExamsList ? (
        <ExamWizard
          classes={classes}
          academicYears={academicYears}
          selectedClassId={selectedClassId}
          selectedSessionId={selectedSessionId}
          selectedExamType={selectedExamType}
          onClassSelect={setSelectedClassId}
          onSessionSelect={setSelectedSessionId}
          onExamTypeSelect={setSelectedExamType}
          onReset={handleReset}
          onCreateSession={handleCreateSession}
        />
      ) : (
        <ExamsList
          exams={exams}
          className={selectedClassName}
          sessionName={selectedSessionName}
          examType={selectedExamType}
          onBack={handleReset}
          onAddExam={handleAddExam}
          onBulkAddExam={() => setBulkDialogOpen(true)}
          onEditExam={openEditDialog}
          onDeleteExam={handleDelete}
          onPreviewRollSlips={handlePreviewRollSlips}
          onDownloadRollSlips={handleDownloadRollSlips}
          onPreviewAwardList={handlePreviewAwardList}
          onDownloadAwardList={handleDownloadAwardList}
        />
      )}

      {/* Add/Edit Exam Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingExam ? "Edit Exam" : "Create New Exam"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Exam Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Exam Date</Label>
                <Input type="date" value={formData.exam_date} onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })} required />
              </div>
              <div>
                <Label>Max Marks</Label>
                <Input type="number" value={formData.max_marks} onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })} required />
              </div>
              <div>
                <Label>Passing Marks</Label>
                <Input type="number" value={formData.passing_marks} onChange={(e) => setFormData({ ...formData, passing_marks: e.target.value })} required />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingExam ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Exam Dialog */}
      <BulkExamDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        subjects={subjects}
        examType={selectedExamType || "midterm"}
        className={selectedClassName}
        sessionName={selectedSessionName}
        onSubmit={handleBulkExamSubmit}
      />

      {/* Document Preview Dialogs */}
      {previewType === "awardList" && previewAwardListData && (
        <DocumentPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title="Award List Preview"
          filename={`${previewFilename}.pdf`}
          generatePdf={() => generateAwardListPdf(previewAwardListData)}
        />
      )}
      {previewType === "rollSlips" && previewRollSlipsData && (
        <DocumentPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title="Roll Number Slips Preview"
          filename={`${previewFilename}.pdf`}
          generatePdf={() => generateClassRollNumberSlips(previewRollSlipsData)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminExams;
