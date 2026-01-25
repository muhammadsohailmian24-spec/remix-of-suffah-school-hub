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
import { ArrowLeft, Plus, Save, Trash2, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface GradingConfigSectionProps {
  onBack: () => void;
}

interface GradeScheme {
  id: string;
  name: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  grade_point: number | null;
  remarks: string | null;
  is_default: boolean;
  academic_year_id: string | null;
}

const DEFAULT_GRADES: Omit<GradeScheme, "id" | "academic_year_id" | "is_default">[] = [
  { name: "Standard", grade: "A++ Outstanding", min_percentage: 95.6, max_percentage: 100, grade_point: 4.0, remarks: "Pass" },
  { name: "Standard", grade: "A+ Excellent", min_percentage: 90.6, max_percentage: 95.5, grade_point: 4.0, remarks: "Pass" },
  { name: "Standard", grade: "A Very Good", min_percentage: 85.6, max_percentage: 90.5, grade_point: 3.7, remarks: "Pass" },
  { name: "Standard", grade: "B++ Good", min_percentage: 80.6, max_percentage: 85.5, grade_point: 3.3, remarks: "Pass" },
  { name: "Standard", grade: "B+ Above Average", min_percentage: 75.6, max_percentage: 80.5, grade_point: 3.0, remarks: "Pass" },
  { name: "Standard", grade: "B Average", min_percentage: 70.6, max_percentage: 75.5, grade_point: 2.7, remarks: "Pass" },
  { name: "Standard", grade: "C Satisfactory", min_percentage: 60.6, max_percentage: 70.5, grade_point: 2.3, remarks: "Pass" },
  { name: "Standard", grade: "D Need Improvement", min_percentage: 50.6, max_percentage: 60.5, grade_point: 2.0, remarks: "Pass" },
  { name: "Standard", grade: "E Poor", min_percentage: 40.6, max_percentage: 50.5, grade_point: 1.0, remarks: "Pass" },
  { name: "Standard", grade: "F Fail", min_percentage: 0, max_percentage: 40.5, grade_point: 0, remarks: "Fail" },
];

const GradingConfigSection = ({ onBack }: GradingConfigSectionProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grades, setGrades] = useState<GradeScheme[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; is_current: boolean }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeScheme | null>(null);
  const [formData, setFormData] = useState({
    grade: "",
    min_percentage: "",
    max_percentage: "",
    grade_point: "",
    remarks: "Pass",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchGrades();
    }
  }, [selectedSessionId]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("academic_years")
      .select("id, name, is_current")
      .order("start_date", { ascending: false });

    setAcademicYears(data || []);
    
    const currentYear = data?.find(y => y.is_current);
    if (currentYear) setSelectedSessionId(currentYear.id);
    
    setLoading(false);
  };

  const fetchGrades = async () => {
    const { data } = await supabase
      .from("grading_schemes")
      .select("*")
      .eq("academic_year_id", selectedSessionId)
      .order("max_percentage", { ascending: false });

    setGrades((data as GradeScheme[]) || []);
  };

  const handleCreateDefaults = async () => {
    setSaving(true);
    try {
      const gradesToInsert = DEFAULT_GRADES.map(g => ({
        ...g,
        academic_year_id: selectedSessionId,
        is_default: true,
      }));

      const { error } = await supabase.from("grading_schemes").insert(gradesToInsert);
      if (error) throw error;

      toast({ title: "Success", description: "Default grading scheme created" });
      fetchGrades();
    } catch (error) {
      console.error("Error creating defaults:", error);
      toast({ title: "Error", description: "Failed to create grading scheme", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddGrade = () => {
    setEditingGrade(null);
    setFormData({
      grade: "",
      min_percentage: "",
      max_percentage: "",
      grade_point: "",
      remarks: "Pass",
    });
    setDialogOpen(true);
  };

  const handleEditGrade = (grade: GradeScheme) => {
    setEditingGrade(grade);
    setFormData({
      grade: grade.grade,
      min_percentage: String(grade.min_percentage),
      max_percentage: String(grade.max_percentage),
      grade_point: String(grade.grade_point || ""),
      remarks: grade.remarks || "Pass",
    });
    setDialogOpen(true);
  };

  const handleDeleteGrade = async (id: string) => {
    if (!confirm("Delete this grade?")) return;
    
    const { error } = await supabase.from("grading_schemes").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete grade", variant: "destructive" });
      return;
    }
    toast({ title: "Deleted", description: "Grade removed" });
    fetchGrades();
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const gradeData = {
        name: "Custom",
        grade: formData.grade,
        min_percentage: parseFloat(formData.min_percentage),
        max_percentage: parseFloat(formData.max_percentage),
        grade_point: formData.grade_point ? parseFloat(formData.grade_point) : null,
        remarks: formData.remarks,
        academic_year_id: selectedSessionId,
        is_default: false,
      };

      if (editingGrade) {
        const { error } = await supabase
          .from("grading_schemes")
          .update(gradeData)
          .eq("id", editingGrade.id);
        if (error) throw error;
        toast({ title: "Updated", description: "Grade updated successfully" });
      } else {
        const { error } = await supabase.from("grading_schemes").insert(gradeData);
        if (error) throw error;
        toast({ title: "Added", description: "Grade added successfully" });
      }

      setDialogOpen(false);
      fetchGrades();
    } catch (error) {
      console.error("Error saving grade:", error);
      toast({ title: "Error", description: "Failed to save grade", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
          <h2 className="text-2xl font-bold">Dynamic Grading Configuration</h2>
          <p className="text-muted-foreground">Configure grade ranges for DMC and result cards</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Grading Scheme</CardTitle>
            <CardDescription>Define grade labels and percentage ranges</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-48">
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
            {grades.length === 0 ? (
              <Button onClick={handleCreateDefaults} disabled={saving}>
                <Plus className="h-4 w-4 mr-2" />
                Create Default Grades
              </Button>
            ) : (
              <Button onClick={handleAddGrade}>
                <Plus className="h-4 w-4 mr-2" />
                Add Grade
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No grading scheme configured for this session. Click "Create Default Grades" to start.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>From %</TableHead>
                  <TableHead>To %</TableHead>
                  <TableHead>Grade Point</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell className="font-medium">{grade.grade}</TableCell>
                    <TableCell>{grade.min_percentage}</TableCell>
                    <TableCell>{grade.max_percentage}</TableCell>
                    <TableCell>{grade.grade_point ?? "-"}</TableCell>
                    <TableCell>
                      <Badge className={grade.remarks === "Pass" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }>
                        {grade.remarks}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditGrade(grade)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteGrade(grade.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Grade Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGrade ? "Edit Grade" : "Add Grade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Grade Name</Label>
              <Input
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                placeholder="e.g., A+ Excellent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Percentage</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.min_percentage}
                  onChange={(e) => setFormData({ ...formData, min_percentage: e.target.value })}
                  placeholder="e.g., 90"
                />
              </div>
              <div>
                <Label>Max Percentage</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.max_percentage}
                  onChange={(e) => setFormData({ ...formData, max_percentage: e.target.value })}
                  placeholder="e.g., 100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Grade Point (optional)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.grade_point}
                  onChange={(e) => setFormData({ ...formData, grade_point: e.target.value })}
                  placeholder="e.g., 4.0"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.remarks} onValueChange={(v) => setFormData({ ...formData, remarks: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : editingGrade ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GradingConfigSection;
