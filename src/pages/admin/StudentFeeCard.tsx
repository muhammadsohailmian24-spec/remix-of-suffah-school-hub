import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Printer, Download, RefreshCw, User, Users, CreditCard } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { downloadFeeCard, printFeeCard, FeeCardData } from "@/utils/generateFeeCardPdf";

// Academic year months (Mar to Feb) - new session starts from March
const MONTHS_ACADEMIC = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];

// Default fee types - fallback only
const DEFAULT_FEE_TYPES = [
  "Tuition", "Transport", "Admission", "Exam", "Monthly-Test", "Late-Fee",
  "Hostal", "Arrears", "Medical Fee", "Events Fee",
  "Promotion Fee", "Certificate Fee", "Urgent Certificate Fee",
  "Practical Fee", "Stationery Fee", "Computer Fee",
  "Circular Tests Fee", "Afternoon Classes", "Dues", "Combine Arrears"
];

interface Student {
  id: string;
  student_id: string;
  user_id: string;
  class_id: string | null;
  father_name: string | null;
  class?: { name: string; grade_level: number; section?: string } | null;
}

interface Profile {
  user_id: string;
  full_name: string;
  address: string | null;
  photo_url: string | null;
}

interface FeeTypeStructure {
  id: string;
  fee_type_name: string;
  grade_level: number;
  annual_amount: number;
  academic_year_id: string | null;
}

interface FeeMatrixEntry {
  feeType: string;
  annualAmount: number;
  monthlyAmount: number;
  months: Record<string, number>; // Empty per legacy - populated during fee card generation only
}

interface Payment {
  id: string;
  student_fee_id: string;
  amount: number;
  payment_date: string;
}

const StudentFeeCard = () => {
  const navigate = useNavigate();
  const { selectedSession: currentSession } = useSession();
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; grade_level: number; section?: string }[]>([]);
  const [feeTypes, setFeeTypes] = useState<string[]>(DEFAULT_FEE_TYPES);
  const [feeTypeStructures, setFeeTypeStructures] = useState<FeeTypeStructure[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Selection states
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedFeeTypes, setSelectedFeeTypes] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('en-US', { month: 'short' }));
  
  // Fee card options
  const [feeCardMode, setFeeCardMode] = useState<"specific" | "wholeClass">("specific");
  const [dontPrintFreeStudents, setDontPrintFreeStudents] = useState(false);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Totals
  const [discount, setDiscount] = useState(0);

  // Payment dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentForMonth, setPaymentForMonth] = useState(new Date().toLocaleString('en-US', { month: 'short' }));
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentSession]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, classesRes, profilesRes] = await Promise.all([
        supabase.from("students").select("id, student_id, user_id, class_id, father_name").eq("status", "active"),
        supabase.from("classes").select("id, name, grade_level, section"),
        supabase.from("profiles").select("user_id, full_name, address, photo_url"),
      ]);

      if (studentsRes.data) {
        // Enrich students with class data
        const enrichedStudents = studentsRes.data.map(s => ({
          ...s,
          class: classesRes.data?.find(c => c.id === s.class_id) || null
        }));
        setStudents(enrichedStudents);
      }
      if (classesRes.data) setClasses(classesRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);

      // Fetch fee types from fee_type_structures
      const { data: feeTypesData } = await supabase
        .from("fee_type_structures")
        .select("fee_type_name")
        .order("fee_type_name");
      
      if (feeTypesData && feeTypesData.length > 0) {
        const uniqueTypes = [...new Set(feeTypesData.map(f => f.fee_type_name))];
        setFeeTypes(uniqueTypes);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch fee structures for selected student's grade level
  const fetchStudentFeeData = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student?.class?.grade_level) {
      setFeeTypeStructures([]);
      setPayments([]);
      return;
    }

    const gradeLevel = student.class.grade_level;

    // Get fee amounts from fee_type_structures for this grade
    const { data: feeStructures } = await supabase
      .from("fee_type_structures")
      .select("*")
      .eq("grade_level", gradeLevel)
      .eq("academic_year_id", currentSession?.id);

    if (feeStructures) {
      setFeeTypeStructures(feeStructures);
    } else {
      setFeeTypeStructures([]);
    }

    // Get any payments made by this student (through student_fees junction)
    const { data: studentFeesData } = await supabase
      .from("student_fees")
      .select("id")
      .eq("student_id", studentId);

    if (studentFeesData && studentFeesData.length > 0) {
      const feeIds = studentFeesData.map(f => f.id);
      const { data: paymentsData } = await supabase
        .from("fee_payments")
        .select("*")
        .in("student_fee_id", feeIds);
      
      if (paymentsData) {
        setPayments(paymentsData);
      } else {
        setPayments([]);
      }
    } else {
      setPayments([]);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentFeeData(selectedStudentId);
    } else {
      setFeeTypeStructures([]);
      setPayments([]);
    }
  }, [selectedStudentId, students, currentSession]);

  // Auto-select available fee types when fee structures are loaded
  useEffect(() => {
    if (feeTypeStructures.length > 0) {
      // Get unique fee types from structures for this grade
      const availableTypes = [...new Set(feeTypeStructures.map(f => f.fee_type_name))];
      
      // Check if currently selected types are valid
      const validSelected = selectedFeeTypes.filter(t => availableTypes.includes(t));
      
      // If no valid selections and we have available types, select the first one
      if (validSelected.length === 0 && availableTypes.length > 0) {
        setSelectedFeeTypes([availableTypes[0]]);
      } else if (validSelected.length !== selectedFeeTypes.length) {
        // Update to only valid selections
        setSelectedFeeTypes(validSelected.length > 0 ? validSelected : [availableTypes[0]]);
      }
    }
  }, [feeTypeStructures]);

  // Get selected student details
  const selectedStudent = useMemo(() => {
    return students.find(s => s.student_id === selectedStudentId || s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const selectedProfile = useMemo(() => {
    return selectedStudent ? profiles.find(p => p.user_id === selectedStudent.user_id) : null;
  }, [selectedStudent, profiles]);

  // Filter students by class
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedClassId && s.class_id !== selectedClassId) return false;
      if (selectedSection && s.class?.section !== selectedSection) return false;
      return true;
    });
  }, [students, selectedClassId, selectedSection]);

  // Available sections for selected class
  const availableSections = useMemo(() => {
    const cls = classes.find(c => c.id === selectedClassId);
    return cls?.section ? [cls.section] : [];
  }, [classes, selectedClassId]);

  // Get available fee types for current student's grade - ONLY show types with structures
  const availableFeeTypes = useMemo(() => {
    if (feeTypeStructures.length === 0) {
      // No structures loaded yet - show default types but they'll have 0 amounts
      return feeTypes;
    }
    // Return only fee types that have structures for this grade
    return [...new Set(feeTypeStructures.map(f => f.fee_type_name))];
  }, [feeTypeStructures, feeTypes]);

  // Build fee matrix - Legacy accurate: months NOT prefilled, only fee structure amounts
  const feeMatrix = useMemo<FeeMatrixEntry[]>(() => {
    return selectedFeeTypes.map(feeType => {
      // Find fee structure for this type and student's grade
      const feeStructure = feeTypeStructures.find(
        f => f.fee_type_name === feeType
      );
      
      const annualAmount = feeStructure?.annual_amount || 0;
      const monthlyAmount = Math.round(annualAmount / 12);

      // IMPORTANT: months are NOT prefilled per legacy rules
      // Grid only activates when fee card exists
      const monthData: Record<string, number> = {};

      return { 
        feeType, 
        annualAmount,
        monthlyAmount,
        months: monthData 
      };
    });
  }, [selectedFeeTypes, feeTypeStructures]);

  // Calculate totals - Legacy accurate
  const totals = useMemo(() => {
    // Sum all annual amounts for selected fee types
    const totalAnnual = feeMatrix.reduce(
      (sum, row) => sum + row.annualAmount,
      0
    );

    const netTotal = totalAnnual - discount;
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, netTotal - paid);

    return { total: totalAnnual, discount, netTotal, paid, balance };
  }, [feeMatrix, payments, discount]);

  // Handle fee type checkbox toggle
  const handleFeeTypeToggle = (feeType: string, checked: boolean) => {
    if (checked) {
      setSelectedFeeTypes(prev => [...prev, feeType]);
    } else {
      setSelectedFeeTypes(prev => prev.filter(ft => ft !== feeType));
    }
  };

  const handleRefresh = () => {
    if (selectedStudentId) {
      fetchStudentFeeData(selectedStudentId);
    }
    fetchData();
  };

  const handleClear = () => {
    setSelectedStudentId("");
    setSelectedClassId("");
    setSelectedSection("");
    setSelectedFeeTypes([]);
    setDiscount(0);
    setFeeTypeStructures([]);
    setPayments([]);
  };

  // Open payment dialog instead of navigating away
  const handleReceive = () => {
    if (!selectedStudent) {
      toast.error("Please select a student first");
      return;
    }
    setPaymentDialogOpen(true);
  };

  // Direct payment recording function
  const handleReceivePayment = async () => {
    if (!selectedStudent || !paymentAmount) {
      toast.error("Please enter payment amount");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setPaymentLoading(true);
    try {
      // First ensure student_fee record exists (create if needed)
      let studentFeeId: string | null = null;
      
      // Check if student_fee exists
      const { data: existingFee } = await supabase
        .from("student_fees")
        .select("id")
        .eq("student_id", selectedStudent.id)
        .maybeSingle();

      if (existingFee) {
        studentFeeId = existingFee.id;
      } else {
        // Create a fee record (required for payment foreign key)
        // Find or create a fee structure reference
        const { data: feeStructure } = await supabase
          .from("fee_structures")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (!feeStructure) {
          // Create a generic fee structure
          const { data: newStructure, error: structureError } = await supabase
            .from("fee_structures")
            .insert({
              name: "Student Fee",
              amount: totals.total,
              fee_type: "tuition"
            })
            .select("id")
            .single();
          
          if (structureError) throw structureError;
          
          if (newStructure) {
            const { data: newFee, error: feeError } = await supabase
              .from("student_fees")
              .insert({
                student_id: selectedStudent.id,
                fee_structure_id: newStructure.id,
                amount: totals.total,
                final_amount: totals.netTotal,
                discount: discount,
                due_date: dueDate,
                status: "pending"
              })
              .select("id")
              .single();
            
            if (feeError) throw feeError;
            if (newFee) studentFeeId = newFee.id;
          }
        } else {
          const { data: newFee, error: feeError } = await supabase
            .from("student_fees")
            .insert({
              student_id: selectedStudent.id,
              fee_structure_id: feeStructure.id,
              amount: totals.total,
              final_amount: totals.netTotal,
              discount: discount,
              due_date: dueDate,
              status: "pending"
            })
            .select("id")
            .single();
          
          if (feeError) throw feeError;
          if (newFee) studentFeeId = newFee.id;
        }
      }

      if (!studentFeeId) {
        toast.error("Failed to create fee record");
        return;
      }

      // Record the payment
      const { error } = await supabase
        .from("fee_payments")
        .insert({
          student_fee_id: studentFeeId,
          amount: amount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(`Payment of Rs. ${amount.toLocaleString()} recorded successfully!`);
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      
      // Refresh data
      fetchStudentFeeData(selectedStudent.id);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to record payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Build fee card data for PDF - Legacy accurate
  const buildFeeCardData = (): FeeCardData | null => {
    if (!selectedStudent || !selectedProfile) return null;
    if (selectedFeeTypes.length === 0) return null;

    const feeRow = feeMatrix[0];
    if (!feeRow) return null;

    // Calculate totals - legacy logic
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, totals.netTotal - totalPaid);

    return {
      studentId: selectedStudent.student_id,
      studentName: selectedProfile.full_name,
      fatherName: selectedStudent.father_name || "N/A",
      className: selectedStudent.class?.name || "N/A",
      section: selectedStudent.class?.section,
      session: currentSession?.name || "2025-26",
      feeType: feeRow.feeType,
      monthlyAmount: feeRow.monthlyAmount,
      totalPaid,
      balance,
      dueDate: new Date(dueDate).toLocaleDateString(),
      feeOfMonth: selectedMonth,
    };
  };

  const handleGenerateFeeCards = async () => {
    if (feeCardMode === "specific" && !selectedStudentId) {
      toast.error("Please select a student first");
      return;
    }
    if (feeCardMode === "wholeClass" && !selectedClassId) {
      toast.error("Please select a class first");
      return;
    }

    const data = buildFeeCardData();
    if (!data) {
      toast.error("Please select a student and fee type first");
      return;
    }

    // Legacy rule: Checkbox is FINAL authority
    // Only skip if BOTH balance = 0 AND checkbox is checked
    if (data.balance <= 0 && dontPrintFreeStudents) {
      toast.info("Student has no outstanding balance - fee card not generated");
      return;
    }

    try {
      await downloadFeeCard(data);
      toast.success("Fee card downloaded successfully!");
    } catch (error) {
      console.error("Error generating fee card:", error);
      toast.error("Failed to generate fee card");
    }
  };

  const handlePrintFeeCards = async () => {
    const data = buildFeeCardData();
    if (!data) {
      toast.error("Please select a student and fee type first");
      return;
    }

    // Legacy rule: Checkbox is FINAL authority
    if (data.balance <= 0 && dontPrintFreeStudents) {
      toast.info("Student has no outstanding balance - fee card not printed");
      return;
    }

    try {
      await printFeeCard(data);
      toast.success("Fee card sent to printer!");
    } catch (error) {
      console.error("Error printing fee card:", error);
      toast.error("Failed to print fee card");
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Fee Card" description="Manage student fee records">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Fee Card" description="View and manage student fee records by month">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Fee Types & Info */}
        <div className="lg:col-span-3 space-y-4">
          {/* Student Info Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Std-ID</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map(student => {
                      const profile = profiles.find(p => p.user_id === student.user_id);
                      return (
                        <SelectItem key={student.id} value={student.id}>
                          {student.student_id} - {profile?.full_name || "Unknown"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Class</Label>
                <Select value={selectedClassId || "all"} onValueChange={(val) => {
                  setSelectedClassId(val === "all" ? "" : val);
                  setSelectedSection("");
                }}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Section</Label>
                <Select value={selectedSection || "all"} onValueChange={(val) => setSelectedSection(val === "all" ? "" : val)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map(section => (
                      <SelectItem key={section} value={section}>{section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Fee Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS_ACADEMIC.map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Session</Label>
                <Input value={currentSession?.name || ""} disabled className="h-8 text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Fee Types Selection - Only show available types */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Fee Types
                {selectedStudent && availableFeeTypes.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({availableFeeTypes.length} available)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {availableFeeTypes.map(feeType => (
                    <div key={feeType} className="flex items-center space-x-2">
                      <Checkbox
                        id={feeType}
                        checked={selectedFeeTypes.includes(feeType)}
                        onCheckedChange={(checked) => handleFeeTypeToggle(feeType, !!checked)}
                      />
                      <Label htmlFor={feeType} className="text-sm cursor-pointer">
                        {feeType}
                      </Label>
                    </div>
                  ))}
                  {availableFeeTypes.length === 0 && selectedStudent && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No fee types configured for this grade
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Middle Panel - Fee Card Options & Grid */}
        <div className="lg:col-span-6 space-y-4">
          {/* Student Details */}
          {selectedStudent && selectedProfile && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-lg border overflow-hidden bg-muted flex-shrink-0">
                    {selectedProfile.photo_url ? (
                      <img src={selectedProfile.photo_url} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Student Name:</span>
                      <p className="font-medium">{selectedProfile.full_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Father Name:</span>
                      <p className="font-medium">{selectedStudent.father_name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Class:</span>
                      <p className="font-medium">{selectedStudent.class?.name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Address:</span>
                      <p className="font-medium">{selectedProfile.address || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fee Card Options */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="specificStudent"
                    checked={feeCardMode === "specific"}
                    onCheckedChange={() => setFeeCardMode("specific")}
                  />
                  <Label htmlFor="specificStudent" className="text-sm flex items-center gap-1">
                    <User className="w-4 h-4" /> Specific Student Fee Card
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="wholeClass"
                    checked={feeCardMode === "wholeClass"}
                    onCheckedChange={() => setFeeCardMode("wholeClass")}
                  />
                  <Label htmlFor="wholeClass" className="text-sm flex items-center gap-1">
                    <Users className="w-4 h-4" /> Whole Class Fee Cards
                  </Label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleGenerateFeeCards} size="sm">
                  <Download className="w-4 h-4 mr-1" />
                  Download Fee Card
                </Button>
                <Button onClick={handlePrintFeeCards} variant="secondary" size="sm">
                  <Printer className="w-4 h-4 mr-1" />
                  Print Fee Card
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dontPrintFree"
                  checked={dontPrintFreeStudents}
                  onCheckedChange={(checked) => setDontPrintFreeStudents(!!checked)}
                />
                <Label htmlFor="dontPrintFree" className="text-sm">
                  Don't print free Student(s)
                </Label>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-xs">Due date:</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-8 w-40"
                  />
                </div>
                <Button onClick={handlePrintFeeCards} variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-1" />
                  Print Fee Card(s)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fee Summary Grid */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Selected Fee Types</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Fee Type</TableHead>
                      <TableHead className="text-right">Monthly</TableHead>
                      <TableHead className="text-right">Yearly</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeMatrix.map(row => (
                      <TableRow key={row.feeType}>
                        <TableCell className="font-medium text-sm">{row.feeType}</TableCell>
                        <TableCell className="text-right text-sm">{row.monthlyAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{row.annualAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {feeMatrix.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-4">
                          {selectedStudent 
                            ? "No fee structures found for this student's class" 
                            : "Select a student to view fee structures"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Totals & Actions */}
        <div className="lg:col-span-3 space-y-4">
          {/* Totals */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Total</Label>
                <Input value={totals.total.toLocaleString()} disabled className="w-24 h-8 text-right" />
              </div>
              <div className="flex justify-between items-center">
                <Label className="text-sm">Discount</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 h-8 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Net Total</Label>
                <Input value={totals.netTotal.toLocaleString()} disabled className="w-24 h-8 text-right font-medium" />
              </div>
              <div className="flex justify-between items-center">
                <Label className="text-sm">Paid</Label>
                <Input value={totals.paid.toLocaleString()} disabled className="w-24 h-8 text-right text-primary" />
              </div>
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Balance</Label>
                <Input
                  value={totals.balance.toLocaleString()}
                  disabled
                  className={`w-24 h-8 text-right font-medium ${totals.balance > 0 ? "text-destructive" : "text-primary"}`}
                />
              </div>

              <div className="pt-2">
                <Button onClick={handleReceive} className="w-full">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Receive Payment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Button onClick={handleRefresh} variant="outline" className="w-full" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button onClick={handleClear} variant="outline" className="w-full" size="sm">
                Clear
              </Button>
            </CardContent>
          </Card>

          {/* SMS Section Placeholder */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="sendSms" disabled />
                <Label htmlFor="sendSms" className="text-sm text-muted-foreground">
                  Send SMS to Parents about Fee details
                </Label>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground italic">
                SMS integration coming soon...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Receive Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Input value={selectedProfile?.full_name || ""} disabled className="bg-muted text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Current Balance</Label>
                <Input 
                  value={`Rs. ${totals.balance.toLocaleString()}`} 
                  disabled 
                  className={`bg-muted font-medium ${totals.balance > 0 ? "text-destructive" : "text-primary"}`} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Fee for Month</Label>
                <Select value={paymentForMonth} onValueChange={setPaymentForMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS_ACADEMIC.map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick amount buttons for monthly payments */}
            {feeMatrix.length > 0 && feeMatrix[0].monthlyAmount > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(feeMatrix[0].monthlyAmount.toString())}
                  className="text-xs"
                >
                  1 Month ({feeMatrix[0].monthlyAmount.toLocaleString()})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount((feeMatrix[0].monthlyAmount * 2).toString())}
                  className="text-xs"
                >
                  2 Months ({(feeMatrix[0].monthlyAmount * 2).toLocaleString()})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount((feeMatrix[0].monthlyAmount * 3).toString())}
                  className="text-xs"
                >
                  3 Months ({(feeMatrix[0].monthlyAmount * 3).toLocaleString()})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(totals.balance.toString())}
                  className="text-xs"
                >
                  Full Balance ({totals.balance.toLocaleString()})
                </Button>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleReceivePayment} 
              disabled={paymentLoading || !paymentAmount}
              className="w-full"
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default StudentFeeCard;
