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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Printer, Download, RefreshCw, User, Users } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

// Grade level mapping
const GRADE_LABELS: Record<number, string> = {
  [-3]: "P.G", [-2]: "Nur", [-1]: "KG",
  1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th",
  7: "7th", 8: "8th", 9: "9th", 10: "10th", 11: "11th", 12: "12th",
  13: "DIT", 14: "CIT", 15: "Special"
};

// Default fee types
const DEFAULT_FEE_TYPES = [
  "Annual", "Admission", "Tuition", "Exam", "Monthly-Test", "Late-Fee",
  "Hostal", "Transport", "Arrears", "Medical Fee", "Events Fee",
  "Promotion Fee", "Certificate Fee", "Urgent Certificate Fee",
  "Annual Practical Fee", "Annual Stationery Fee", "Annual Computer Fee",
  "Circular Tests Fee", "Afternoon Classes", "Dues", "Combine Arrears"
];

const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];

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

interface FeeMatrixEntry {
  feeType: string;
  months: Record<string, number>; // month -> amount
}

interface StudentFeeRecord {
  id: string;
  fee_structure_id: string;
  amount: number;
  discount: number;
  final_amount: number;
  status: string;
  due_date: string;
  fee_structure?: { name: string; fee_type: string };
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
  const [studentFees, setStudentFees] = useState<StudentFeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Selection states
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedFeeTypes, setSelectedFeeTypes] = useState<string[]>(["Annual"]);
  
  // Fee card options
  const [feeCardMode, setFeeCardMode] = useState<"specific" | "wholeClass">("specific");
  const [dontPrintFreeStudents, setDontPrintFreeStudents] = useState(false);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Totals
  const [discount, setDiscount] = useState(0);

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

  const fetchStudentFees = async (studentId: string) => {
    const { data: feesData } = await supabase
      .from("student_fees")
      .select(`
        *,
        fee_structure:fee_structures(name, fee_type)
      `)
      .eq("student_id", studentId);

    if (feesData) setStudentFees(feesData);

    // Fetch payments
    if (feesData && feesData.length > 0) {
      const feeIds = feesData.map(f => f.id);
      const { data: paymentsData } = await supabase
        .from("fee_payments")
        .select("*")
        .in("student_fee_id", feeIds);
      
      if (paymentsData) setPayments(paymentsData);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentFees(selectedStudentId);
    } else {
      setStudentFees([]);
      setPayments([]);
    }
  }, [selectedStudentId]);

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

  // Build fee matrix for display
  const feeMatrix = useMemo<FeeMatrixEntry[]>(() => {
    return selectedFeeTypes.map(feeType => {
      const monthData: Record<string, number> = {};
      MONTHS.forEach(month => {
        // Find fee records matching this type and month
        const matchingFee = studentFees.find(sf => 
          sf.fee_structure?.name?.toLowerCase().includes(feeType.toLowerCase()) ||
          sf.fee_structure?.fee_type?.toLowerCase().includes(feeType.toLowerCase())
        );
        monthData[month] = matchingFee ? matchingFee.final_amount : 0;
      });
      return { feeType, months: monthData };
    });
  }, [selectedFeeTypes, studentFees]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalAmount = studentFees.reduce((sum, sf) => sum + sf.amount, 0);
    const totalDiscount = studentFees.reduce((sum, sf) => sum + (sf.discount || 0), 0) + discount;
    const netTotal = totalAmount - totalDiscount;
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, netTotal - paid);
    
    return { total: totalAmount, discount: totalDiscount, netTotal, paid, balance };
  }, [studentFees, payments, discount]);

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
      fetchStudentFees(selectedStudentId);
    }
    fetchData();
  };

  const handleClear = () => {
    setSelectedStudentId("");
    setSelectedClassId("");
    setSelectedSection("");
    setSelectedFeeTypes(["Annual"]);
    setDiscount(0);
    setStudentFees([]);
    setPayments([]);
  };

  const handleReceive = () => {
    // Navigate to fee management for payment
    navigate("/admin/fees");
  };

  const handleGenerateFeeCards = () => {
    if (feeCardMode === "specific" && !selectedStudentId) {
      toast.error("Please select a student first");
      return;
    }
    if (feeCardMode === "wholeClass" && !selectedClassId) {
      toast.error("Please select a class first");
      return;
    }
    toast.info("Fee card generation coming soon!");
  };

  const handlePrintFeeCards = () => {
    toast.info("Print fee cards coming soon!");
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
                <Label className="text-xs">Session</Label>
                <Input value={currentSession?.name || ""} disabled className="h-8 text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Fee Types Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Fee Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {feeTypes.map(feeType => (
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
                  Generate Fee Card(s)
                </Button>
                <Button onClick={handlePrintFeeCards} variant="secondary" size="sm" disabled>
                  Reset Fee Card(s)
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

          {/* Monthly Fee Grid */}
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Fee Type</TableHead>
                      {MONTHS.map(month => (
                        <TableHead key={month} className="text-center w-14 text-xs">
                          {month}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeMatrix.map(row => (
                      <TableRow key={row.feeType}>
                        <TableCell className="font-medium text-xs">{row.feeType}</TableCell>
                        {MONTHS.map(month => (
                          <TableCell key={month} className="text-center text-xs">
                            {row.months[month] || 0}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>Total</TableCell>
                      {MONTHS.map(month => (
                        <TableCell key={month} className="text-center text-xs">
                          {feeMatrix.reduce((sum, row) => sum + (row.months[month] || 0), 0)}
                        </TableCell>
                      ))}
                    </TableRow>
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
    </AdminLayout>
  );
};

export default StudentFeeCard;
