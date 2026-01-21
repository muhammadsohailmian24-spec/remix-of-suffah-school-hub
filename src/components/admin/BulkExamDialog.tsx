import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calendar } from "lucide-react";

interface Subject {
  id: string;
  name: string;
}

interface BulkExamEntry {
  id: string;
  name: string;
  subject_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  max_marks: string;
  passing_marks: string;
}

interface BulkExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  examType: string;
  className: string;
  sessionName: string;
  onSubmit: (exams: Omit<BulkExamEntry, 'id'>[]) => Promise<void>;
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  midterm: "Mid-Term",
  final: "Final Term",
  quiz: "Class Test / Quiz",
  assignment: "Assignment",
  practical: "Practical",
};

const BulkExamDialog = ({
  open,
  onOpenChange,
  subjects,
  examType,
  className,
  sessionName,
  onSubmit,
}: BulkExamDialogProps) => {
  const [entries, setEntries] = useState<BulkExamEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addEntry = () => {
    const examTypeLabel = EXAM_TYPE_LABELS[examType] || examType;
    setEntries([
      ...entries,
      {
        id: crypto.randomUUID(),
        name: `${examTypeLabel} - ${subjects[0]?.name || 'Subject'}`,
        subject_id: subjects[0]?.id || "",
        exam_date: "",
        start_time: "09:00",
        end_time: "12:00",
        max_marks: "100",
        passing_marks: "40",
      },
    ]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof BulkExamEntry, value: string) => {
    setEntries(entries.map(e => {
      if (e.id !== id) return e;
      const updated = { ...e, [field]: value };
      
      // Auto-update name when subject changes
      if (field === 'subject_id') {
        const subject = subjects.find(s => s.id === value);
        if (subject) {
          const examTypeLabel = EXAM_TYPE_LABELS[examType] || examType;
          updated.name = `${examTypeLabel} - ${subject.name}`;
        }
      }
      
      return updated;
    }));
  };

  const handleSubmit = async () => {
    if (entries.length === 0) return;
    
    const invalidEntries = entries.filter(e => !e.subject_id || !e.exam_date || !e.name);
    if (invalidEntries.length > 0) {
      alert("Please fill in all required fields for each exam.");
      return;
    }

    setSubmitting(true);
    await onSubmit(entries.map(({ id, ...rest }) => rest));
    setSubmitting(false);
    setEntries([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setEntries([]);
    onOpenChange(false);
  };

  // Quick add all subjects at once
  const addAllSubjects = () => {
    const examTypeLabel = EXAM_TYPE_LABELS[examType] || examType;
    const newEntries: BulkExamEntry[] = subjects.map((subject, index) => ({
      id: crypto.randomUUID(),
      name: `${examTypeLabel} - ${subject.name}`,
      subject_id: subject.id,
      exam_date: "",
      start_time: "09:00",
      end_time: "12:00",
      max_marks: "100",
      passing_marks: "40",
    }));
    setEntries([...entries, ...newEntries]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bulk Exam Scheduling
          </DialogTitle>
          <DialogDescription>
            Schedule multiple exams at once for {className} • {sessionName} • {EXAM_TYPE_LABELS[examType] || examType}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {entries.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">No exams added yet</h3>
              <p className="text-muted-foreground mb-4">Add exams one by one or all subjects at once</p>
              <div className="flex justify-center gap-2">
                <Button onClick={addEntry} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add One Exam
                </Button>
                <Button onClick={addAllSubjects}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add All Subjects
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{entries.length} exam(s) to schedule</span>
                <div className="flex gap-2">
                  <Button onClick={addEntry} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Exam
                  </Button>
                  <Button onClick={addAllSubjects} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add All Subjects
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Subject</TableHead>
                      <TableHead>Exam Name</TableHead>
                      <TableHead className="w-[130px]">Date</TableHead>
                      <TableHead className="w-[100px]">Start</TableHead>
                      <TableHead className="w-[100px]">End</TableHead>
                      <TableHead className="w-[80px]">Max</TableHead>
                      <TableHead className="w-[80px]">Pass</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Select
                            value={entry.subject_id}
                            onValueChange={(v) => updateEntry(entry.id, 'subject_id', v)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={entry.name}
                            onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={entry.exam_date}
                            onChange={(e) => updateEntry(entry.id, 'exam_date', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={entry.start_time}
                            onChange={(e) => updateEntry(entry.id, 'start_time', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={entry.end_time}
                            onChange={(e) => updateEntry(entry.id, 'end_time', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={entry.max_marks}
                            onChange={(e) => updateEntry(entry.id, 'max_marks', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={entry.passing_marks}
                            onChange={(e) => updateEntry(entry.id, 'passing_marks', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={entries.length === 0 || submitting}>
            {submitting ? "Scheduling..." : `Schedule ${entries.length} Exam${entries.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkExamDialog;
