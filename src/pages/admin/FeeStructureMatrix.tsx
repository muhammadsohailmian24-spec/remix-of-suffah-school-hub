import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Printer, Save, Loader2, ArrowLeft } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import { downloadFeeStructurePdf, printFeeStructurePdf } from "@/utils/generateFeeStructurePdf";

// Grade level configuration matching existing schema
const GRADE_COLUMNS = [
  { level: -3, label: "P.G" },
  { level: -2, label: "Nur" },
  { level: -1, label: "KG" },
  { level: 1, label: "1st" },
  { level: 2, label: "2nd" },
  { level: 3, label: "3rd" },
  { level: 4, label: "4th" },
  { level: 5, label: "5th" },
  { level: 6, label: "6th" },
  { level: 7, label: "7th" },
  { level: 8, label: "8th" },
  { level: 9, label: "9th" },
  { level: 10, label: "10th" },
  { level: 11, label: "11th" },
  { level: 12, label: "12th" },
  { level: 13, label: "DIT" },
  { level: 14, label: "CIT" },
  { level: 15, label: "Special" },
];

// Default fee types matching legacy system
const DEFAULT_FEE_TYPES = [
  "Annual",
  "Admission",
  "Tuition",
  "Exam",
  "Monthly-Test",
  "Late-Fee",
  "Hostal",
  "Transport",
  "Arrears",
  "Dues",
  "Medical Fee",
  "Events Fee",
  "Promotion Fee",
  "Certificate Fee",
  "Urgent Certificate Fee",
  "Annual Practical Fee",
  "Annual Stationery Fee",
  "Annual Computer Fee",
  "Circular Tests Fee",
  "Afternoon Classes",
  "Combine Arrears",
];

interface FeeMatrixData {
  [feeTypeName: string]: {
    [gradeLevel: number]: number;
  };
}

interface FeeTypeStructure {
  id: string;
  fee_type_name: string;
  grade_level: number;
  annual_amount: number;
  academic_year_id: string | null;
}

const FeeStructureMatrix = () => {
  const navigate = useNavigate();
  const { selectedSession, academicYears } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeTypes, setFeeTypes] = useState<string[]>([]);
  const [matrixData, setMatrixData] = useState<FeeMatrixData>({});
  const [originalData, setOriginalData] = useState<FeeMatrixData>({});
  const [dbRecords, setDbRecords] = useState<FeeTypeStructure[]>([]);
  
  // Dialog states
  const [addFeeTypeDialog, setAddFeeTypeDialog] = useState(false);
  const [newFeeTypeName, setNewFeeTypeName] = useState("");
  const [selectedNewFeeType, setSelectedNewFeeType] = useState("");
  
  // Quick update form
  const [quickUpdateForm, setQuickUpdateForm] = useState({
    gradeLevel: "",
    feeType: "",
    amount: ""
  });

  useEffect(() => {
    if (selectedSession) {
      fetchFeeStructures();
    }
  }, [selectedSession]);

  const fetchFeeStructures = async () => {
    if (!selectedSession) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fee_type_structures")
        .select("*")
        .eq("academic_year_id", selectedSession.id);

      if (error) throw error;

      setDbRecords(data || []);

      // Get unique fee types from database
      const dbFeeTypes = [...new Set((data || []).map(d => d.fee_type_name))];
      
      // Combine with default fee types, maintaining order
      const allFeeTypes = [...DEFAULT_FEE_TYPES];
      dbFeeTypes.forEach(ft => {
        if (!allFeeTypes.includes(ft)) {
          allFeeTypes.push(ft);
        }
      });
      
      setFeeTypes(allFeeTypes);

      // Build matrix from database data
      const matrix: FeeMatrixData = {};
      allFeeTypes.forEach(feeType => {
        matrix[feeType] = {};
        GRADE_COLUMNS.forEach(grade => {
          const record = (data || []).find(
            d => d.fee_type_name === feeType && d.grade_level === grade.level
          );
          matrix[feeType][grade.level] = record?.annual_amount || 0;
        });
      });

      setMatrixData(matrix);
      setOriginalData(JSON.parse(JSON.stringify(matrix)));
    } catch (error) {
      console.error("Error fetching fee structures:", error);
      toast.error("Failed to load fee structure data");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(matrixData) !== JSON.stringify(originalData);
  }, [matrixData, originalData]);

  const handleCellChange = (feeType: string, gradeLevel: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setMatrixData(prev => ({
      ...prev,
      [feeType]: {
        ...prev[feeType],
        [gradeLevel]: numValue
      }
    }));
  };

  const handleQuickUpdate = () => {
    if (!quickUpdateForm.gradeLevel || !quickUpdateForm.feeType || !quickUpdateForm.amount) {
      toast.error("Please fill all fields");
      return;
    }

    const gradeLevel = parseInt(quickUpdateForm.gradeLevel);
    const amount = parseFloat(quickUpdateForm.amount) || 0;

    setMatrixData(prev => ({
      ...prev,
      [quickUpdateForm.feeType]: {
        ...prev[quickUpdateForm.feeType],
        [gradeLevel]: amount
      }
    }));

    toast.success("Fee updated in grid");
    setQuickUpdateForm({ gradeLevel: "", feeType: "", amount: "" });
  };

  const handleAddFeeType = () => {
    const newType = newFeeTypeName.trim() || selectedNewFeeType;
    if (!newType) {
      toast.error("Please enter or select a fee type name");
      return;
    }

    if (feeTypes.includes(newType)) {
      toast.error("This fee type already exists");
      return;
    }

    // Add new fee type with zero values for all grades
    setFeeTypes(prev => [...prev, newType]);
    setMatrixData(prev => ({
      ...prev,
      [newType]: GRADE_COLUMNS.reduce((acc, grade) => {
        acc[grade.level] = 0;
        return acc;
      }, {} as { [key: number]: number })
    }));

    setAddFeeTypeDialog(false);
    setNewFeeTypeName("");
    setSelectedNewFeeType("");
    toast.success("Fee type added");
  };

  const handleSave = async () => {
    if (!selectedSession) {
      toast.error("Please select an academic year");
      return;
    }

    setSaving(true);
    try {
      // Prepare upsert data
      const upsertData: Array<{
        fee_type_name: string;
        grade_level: number;
        annual_amount: number;
        academic_year_id: string;
      }> = [];

      Object.entries(matrixData).forEach(([feeType, grades]) => {
        Object.entries(grades).forEach(([gradeLevel, amount]) => {
          upsertData.push({
            fee_type_name: feeType,
            grade_level: parseInt(gradeLevel),
            annual_amount: amount,
            academic_year_id: selectedSession.id
          });
        });
      });

      // Delete existing records for this academic year and upsert new ones
      const { error: deleteError } = await supabase
        .from("fee_type_structures")
        .delete()
        .eq("academic_year_id", selectedSession.id);

      if (deleteError) throw deleteError;

      // Filter out zero amounts if desired, or insert all
      const nonZeroData = upsertData.filter(d => d.annual_amount > 0);
      
      if (nonZeroData.length > 0) {
        const { error: insertError } = await supabase
          .from("fee_type_structures")
          .insert(nonZeroData);

        if (insertError) throw insertError;
      }

      setOriginalData(JSON.parse(JSON.stringify(matrixData)));
      toast.success("Fee structure saved successfully");
    } catch (error) {
      console.error("Error saving fee structure:", error);
      toast.error("Failed to save fee structure");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    printFeeStructurePdf(feeTypes, matrixData, selectedSession?.name || "");
  };

  const handleDownload = () => {
    downloadFeeStructurePdf(feeTypes, matrixData, selectedSession?.name || "");
  };

  // Get available fee types for the dropdown (ones not already in use)
  const availableFeeTypesForDropdown = DEFAULT_FEE_TYPES.filter(ft => !feeTypes.includes(ft));

  if (loading) {
    return (
      <AdminLayout title="Fee Structure">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Fee Structure" description="Manage fee amounts for each grade level">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/fees")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Fee Structure</h1>
              <p className="text-muted-foreground">Manage fee amounts for each grade level</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedSession?.id || ""} disabled>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map(year => (
                  <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Dialog open={addFeeTypeDialog} onOpenChange={setAddFeeTypeDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fee Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Fee Type</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select from List</Label>
                    <Select value={selectedNewFeeType} onValueChange={setSelectedNewFeeType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose fee type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFeeTypesForDropdown.map(ft => (
                          <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-center text-muted-foreground">or</div>
                  <div>
                    <Label>Enter Custom Name</Label>
                    <Input
                      value={newFeeTypeName}
                      onChange={(e) => setNewFeeTypeName(e.target.value)}
                      placeholder="e.g., Library Fee"
                    />
                  </div>
                  <Button onClick={handleAddFeeType} className="w-full">
                    Add Fee Type
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Fee Matrix Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Matrix - {selectedSession?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="min-w-[1200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 w-10">S.No</TableHead>
                      <TableHead className="sticky left-10 bg-background z-10 min-w-[150px]">Fee Type</TableHead>
                      {GRADE_COLUMNS.map(grade => (
                        <TableHead key={grade.level} className="text-center min-w-[80px]">
                          {grade.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeTypes.map((feeType, index) => (
                      <TableRow key={feeType}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="sticky left-10 bg-background z-10 font-medium">
                          {feeType}
                        </TableCell>
                        {GRADE_COLUMNS.map(grade => (
                          <TableCell key={grade.level} className="p-1">
                            <Input
                              type="number"
                              min="0"
                              value={matrixData[feeType]?.[grade.level] || 0}
                              onChange={(e) => handleCellChange(feeType, grade.level, e.target.value)}
                              className="text-center h-8 w-full min-w-[70px]"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Update Section */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[150px]">
                <Label>Class/Grade</Label>
                <Select
                  value={quickUpdateForm.gradeLevel}
                  onValueChange={(v) => setQuickUpdateForm(prev => ({ ...prev, gradeLevel: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_COLUMNS.map(grade => (
                      <SelectItem key={grade.level} value={grade.level.toString()}>
                        {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label>Fee Type</Label>
                <Select
                  value={quickUpdateForm.feeType}
                  onValueChange={(v) => setQuickUpdateForm(prev => ({ ...prev, feeType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Fee Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {feeTypes.map(ft => (
                      <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <Label>Fee Amount</Label>
                <Input
                  type="number"
                  min="0"
                  value={quickUpdateForm.amount}
                  onChange={(e) => setQuickUpdateForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                />
              </div>
              <Button onClick={handleQuickUpdate}>
                Update Fee
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default FeeStructureMatrix;
