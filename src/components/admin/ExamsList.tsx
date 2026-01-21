import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, Edit, Trash2, Download, FileText, FileUser, MoreHorizontal, ClipboardList, Eye, ArrowLeft, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import SingleRollNumberSlipDialog from "@/components/admin/SingleRollNumberSlipDialog";

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
  classes: { name: string } | null;
  subjects: { name: string } | null;
}

interface ExamsListProps {
  exams: Exam[];
  className: string;
  sessionName: string;
  examType: string;
  onBack: () => void;
  onAddExam: () => void;
  onBulkAddExam: () => void;
  onEditExam: (exam: Exam) => void;
  onDeleteExam: (examId: string) => void;
  onPreviewRollSlips: (exam: Exam) => void;
  onDownloadRollSlips: (exam: Exam) => void;
  onPreviewAwardList: (exam: Exam) => void;
  onDownloadAwardList: (exam: Exam) => void;
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  midterm: "Mid-Term",
  final: "Final Term",
  quiz: "Class Test / Quiz",
  assignment: "Assignment",
  practical: "Practical",
};

const ExamsList = ({
  exams,
  className,
  sessionName,
  examType,
  onBack,
  onAddExam,
  onBulkAddExam,
  onEditExam,
  onDeleteExam,
  onPreviewRollSlips,
  onDownloadRollSlips,
  onPreviewAwardList,
  onDownloadAwardList,
}: ExamsListProps) => {
  const navigate = useNavigate();
  const [singleSlipOpen, setSingleSlipOpen] = useState(false);
  const [singleSlipExam, setSingleSlipExam] = useState<Exam | null>(null);

  const getExamTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      midterm: "default",
      final: "secondary",
      quiz: "outline",
      assignment: "outline",
      practical: "outline",
    };
    return <Badge variant={variants[type] || "outline"}>{EXAM_TYPE_LABELS[type] || type}</Badge>;
  };

  const handleSingleSlip = (exam: Exam) => {
    setSingleSlipExam(exam);
    setSingleSlipOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold">
              {EXAM_TYPE_LABELS[examType] || examType} Exams
            </h2>
            <p className="text-sm text-muted-foreground">
              {className} • {sessionName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBulkAddExam}>
            <Calendar className="h-4 w-4 mr-2" />
            Bulk Schedule
          </Button>
          <Button onClick={onAddExam}>
            <Plus className="h-4 w-4 mr-2" />
            Add Exam
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{exams.length}</div>
            <div className="text-sm text-muted-foreground">Total Exams</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {exams.filter(e => new Date(e.exam_date) > new Date()).length}
            </div>
            <div className="text-sm text-muted-foreground">Upcoming</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {exams.filter(e => new Date(e.exam_date) <= new Date()).length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Exams Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map(exam => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell>{exam.subjects?.name}</TableCell>
                  <TableCell>{format(parseISO(exam.exam_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    {exam.start_time && exam.end_time 
                      ? `${exam.start_time} - ${exam.end_time}` 
                      : "-"}
                  </TableCell>
                  <TableCell>{exam.max_marks} (Pass: {exam.passing_marks})</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 bg-popover">
                        <DropdownMenuItem onClick={() => handleSingleSlip(exam)}>
                          <FileUser className="mr-2 h-4 w-4" />
                          Single Roll Slip
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPreviewRollSlips(exam)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview All Roll Slips
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDownloadRollSlips(exam)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Download All Roll Slips
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onPreviewAwardList(exam)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview Award List
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDownloadAwardList(exam)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download Award List
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin/results")}>
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Enter Results
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditExam(exam)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Exam
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteExam(exam.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Exam
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {exams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-1">No exams found</p>
                    <p className="text-sm">Click "Add Exam" to create a new {EXAM_TYPE_LABELS[examType] || examType} exam.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Single Roll Slip Dialog */}
      {singleSlipExam && (
        <SingleRollNumberSlipDialog 
          examName={singleSlipExam.name} 
          examType={singleSlipExam.exam_type}
          open={singleSlipOpen}
          onOpenChange={setSingleSlipOpen}
        />
      )}
    </div>
  );
};

export default ExamsList;
