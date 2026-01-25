import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Edit2, PlusCircle } from "lucide-react";

interface CreateExamsSectionProps {
  onBack: () => void;
}

interface ExamType {
  id: string;
  name: string;
  label: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

interface ScheduledExam {
  subject_id: string;
  subject_name: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  max_marks: string;
  passing_marks: string;
}

const EXAM_TYPES: ExamType[] = [
  { id: "midterm", name: "midterm", label: "Mid-Term" },
  { id: "final", name: "final", label: "Final Term" },
  { id: "term", name: "term", label: "Term Exam" },
  { id: "quiz", name: "quiz", label: "Class Test / Quiz" },
];

const CreateExamsSection = ({ onBack }: CreateExamsSectionProps) => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [examName, setExamName] = useState("");
  const [examType, setExamType] = useState("midterm");
  const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>([]);
  
  // Dialog for adding subject
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    subject_id: "",
    exam_date: "",
    start_time: "",
    end_time: "",
    max_marks: "100",
    passing_marks: "40",
  });

  // Edit exam type dialog
  const [editTypeOpen, setEditTypeOpen] = useState(false);
  const [customTypes, setCustomTypes] = useState<ExamType[]>(EXAM_TYPES);
  const [newTypeName, setNewTypeName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [classesRes, subjectsRes, yearsRes] = await Promise.all([
      supabase.from("classes").select("id, name").order("grade_level"),
      supabase.from("subjects").select("id, name").order("name"),
      supabase.from("academic_years").select("id, name, is_current").order("start_date", { ascending: false }),
    ]);

    setClasses(classesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setAcademicYears(yearsRes.data || []);
    
    // Auto-select current session
    const currentYear = yearsRes.data?.find(y => y.is_current);
    if (currentYear) setSelectedSessionId(currentYear.id);
    
    setLoading(false);
  };

  const handleAddAllSubjects = () => {
    const newExams: ScheduledExam[] = subjects
      .filter(s => !scheduledExams.some(e => e.subject_id === s.id))
      .map(s => ({
        subject_id: s.id,
        subject_name: s.name,
        exam_date: "",
        start_time: "",
        end_time: "",
        max_marks: "100",
        passing_marks: "40",
      }));
    setScheduledExams([...scheduledExams, ...newExams]);
    toast({ title: "Subjects Added", description: `${newExams.length} subjects added to schedule` });
  };

  const handleAddSubject = () => {
    const subject = subjects.find(s => s.id === subjectForm.subject_id);
    if (!subject) return;

    const newExam: ScheduledExam = {
      subject_id: subjectForm.subject_id,
      subject_name: subject.name,
      exam_date: subjectForm.exam_date,
      start_time: subjectForm.start_time,
      end_time: subjectForm.end_time,
      max_marks: subjectForm.max_marks,
      passing_marks: subjectForm.passing_marks,
    };

    if (editingIndex !== null) {
      const updated = [...scheduledExams];
      updated[editingIndex] = newExam;
      setScheduledExams(updated);
    } else {
      setScheduledExams([...scheduledExams, newExam]);
    }

    resetSubjectForm();
  };

  const resetSubjectForm = () => {
    setSubjectForm({
      subject_id: "",
      exam_date: "",
      start_time: "",
      end_time: "",
      max_marks: "100",
      passing_marks: "40",
    });
    setEditingIndex(null);
    setAddSubjectOpen(false);
  };

  const handleEditExam = (index: number) => {
    const exam = scheduledExams[index];
    setSubjectForm({
      subject_id: exam.subject_id,
      exam_date: exam.exam_date,
      start_time: exam.start_time,
      end_time: exam.end_time,
      max_marks: exam.max_marks,
      passing_marks: exam.passing_marks,
    });
    setEditingIndex(index);
    setAddSubjectOpen(true);
  };

  const handleRemoveExam = (index: number) => {
    setScheduledExams(scheduledExams.filter((_, i) => i !== index));
  };

  const handleAddExamType = () => {
    if (!newTypeName.trim()) return;
    const id = newTypeName.toLowerCase().replace(/\s+/g, "_");
    setCustomTypes([...customTypes, { id, name: id, label: newTypeName }]);
    setNewTypeName("");
  };

  const handleSaveExams = async () => {
    if (!selectedClassId || !selectedSessionId || !examName || scheduledExams.length === 0) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const examsToInsert = scheduledExams.map(exam => ({
      name: examName,
      exam_type: examType,
      exam_date: exam.exam_date,
      max_marks: parseInt(exam.max_marks),
      passing_marks: parseInt(exam.passing_marks),
      start_time: exam.start_time || null,
      end_time: exam.end_time || null,
      class_id: selectedClassId,
      subject_id: exam.subject_id,
      academic_year_id: selectedSessionId,
    }));

    const { error } = await supabase.from("exams").insert(examsToInsert);

    if (error) {
      toast({ title: "Error", description: "Failed to create exams", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `${scheduledExams.length} exam(s) created successfully` });
    setScheduledExams([]);
    setExamName("");
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
          <h2 className="text-2xl font-bold">Create Exams</h2>
          <p className="text-muted-foreground">Schedule exams for a class with subjects, dates and times</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
          <CardDescription>Select class, session and exam type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
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
              <Label className="flex items-center justify-between">
                Exam Type
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setEditTypeOpen(true)}>
                  Edit Types
                </Button>
              </Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {customTypes.map(t => (
                    <SelectItem key={t.id} value={t.name}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Exam Name</Label>
              <Input 
                value={examName} 
                onChange={(e) => setExamName(e.target.value)} 
                placeholder="e.g., Mid-Term 2025"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Exam Schedule</CardTitle>
            <CardDescription>Add subjects with date and time</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAddAllSubjects}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add All Subjects
            </Button>
            <Button onClick={() => setAddSubjectOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scheduledExams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No subjects added yet. Click "Add Subject" or "Add All Subjects" to start.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead>Pass Marks</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledExams.map((exam, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{exam.subject_name}</TableCell>
                    <TableCell>
                      <Input 
                        type="date" 
                        value={exam.exam_date}
                        onChange={(e) => {
                          const updated = [...scheduledExams];
                          updated[index].exam_date = e.target.value;
                          setScheduledExams(updated);
                        }}
                        className="w-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="time" 
                        value={exam.start_time}
                        onChange={(e) => {
                          const updated = [...scheduledExams];
                          updated[index].start_time = e.target.value;
                          setScheduledExams(updated);
                        }}
                        className="w-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="time" 
                        value={exam.end_time}
                        onChange={(e) => {
                          const updated = [...scheduledExams];
                          updated[index].end_time = e.target.value;
                          setScheduledExams(updated);
                        }}
                        className="w-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={exam.max_marks}
                        onChange={(e) => {
                          const updated = [...scheduledExams];
                          updated[index].max_marks = e.target.value;
                          setScheduledExams(updated);
                        }}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={exam.passing_marks}
                        onChange={(e) => {
                          const updated = [...scheduledExams];
                          updated[index].passing_marks = e.target.value;
                          setScheduledExams(updated);
                        }}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditExam(index)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveExam(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {scheduledExams.length > 0 && (
            <div className="flex justify-end mt-4">
              <Button onClick={handleSaveExams} disabled={!examName || !selectedClassId}>
                Save All Exams ({scheduledExams.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Subject Dialog */}
      <Dialog open={addSubjectOpen} onOpenChange={(open) => { setAddSubjectOpen(open); if (!open) resetSubjectForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit Subject" : "Add Subject"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Select value={subjectForm.subject_id} onValueChange={(v) => setSubjectForm({ ...subjectForm, subject_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.filter(s => editingIndex !== null || !scheduledExams.some(e => e.subject_id === s.id)).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={subjectForm.exam_date} onChange={(e) => setSubjectForm({ ...subjectForm, exam_date: e.target.value })} />
              </div>
              <div>
                <Label>Max Marks</Label>
                <Input type="number" value={subjectForm.max_marks} onChange={(e) => setSubjectForm({ ...subjectForm, max_marks: e.target.value })} />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={subjectForm.start_time} onChange={(e) => setSubjectForm({ ...subjectForm, start_time: e.target.value })} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={subjectForm.end_time} onChange={(e) => setSubjectForm({ ...subjectForm, end_time: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetSubjectForm}>Cancel</Button>
            <Button onClick={handleAddSubject} disabled={!subjectForm.subject_id}>
              {editingIndex !== null ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Exam Types Dialog */}
      <Dialog open={editTypeOpen} onOpenChange={setEditTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Exam Types</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="New exam type name" 
                value={newTypeName} 
                onChange={(e) => setNewTypeName(e.target.value)}
              />
              <Button onClick={handleAddExamType}>Add</Button>
            </div>
            <div className="space-y-2">
              {customTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{type.label}</span>
                  {!EXAM_TYPES.find(t => t.id === type.id) && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setCustomTypes(customTypes.filter(t => t.id !== type.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setEditTypeOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateExamsSection;
