import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Receipt, CreditCard, FileText, Loader2, Search, Download, Printer, Mail, Users, User, Eye, Grid3X3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { downloadInvoice, printInvoice, generateInvoicePdf, InvoiceData } from "@/utils/generateInvoicePdf";
import { downloadReceipt, printReceipt, generateReceiptPdf, ReceiptData } from "@/utils/generateReceiptPdf";
import { downloadClassFeeReport, downloadIndividualFeeReport, generateClassFeeReportPdf, generateIndividualFeeReportPdf, ClassFeeReportData, IndividualFeeReportData } from "@/utils/generateFeeReportPdf";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

interface FeeStructure {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  fee_type: string;
  due_date: string | null;
  class_id: string | null;
}

interface StudentFee {
  id: string;
  student_id: string;
  fee_structure_id: string;
  amount: number;
  discount: number;
  final_amount: number;
  due_date: string;
  status: string;
  created_at: string;
  student?: { student_id: string; profiles?: { full_name: string } };
  fee_structure?: { name: string };
}

interface Payment {
  id: string;
  student_fee_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  receipt_number: string | null;
  transaction_id: string | null;
  studentFee?: StudentFee;
}

const FeeManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; student_id: string; user_id: string; class_id?: string }[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [feeStructureDialog, setFeeStructureDialog] = useState(false);
  const [assignFeeDialog, setAssignFeeDialog] = useState(false);
  const [bulkAssignDialog, setBulkAssignDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [selectedStudentFee, setSelectedStudentFee] = useState<StudentFee | null>(null);
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"invoice" | "receipt" | "classReport" | "individualReport">("invoice");
  const [previewInvoiceData, setPreviewInvoiceData] = useState<InvoiceData | null>(null);
  const [previewReceiptData, setPreviewReceiptData] = useState<ReceiptData | null>(null);
  const [previewClassReportData, setPreviewClassReportData] = useState<ClassFeeReportData | null>(null);
  const [previewIndividualReportData, setPreviewIndividualReportData] = useState<IndividualFeeReportData | null>(null);
  
  // Report form state
  const [reportForm, setReportForm] = useState({
    reportType: "class" as "class" | "individual",
    classId: "",
    studentId: ""
  });
  
  // Bulk assign form state
  const [bulkAssignForm, setBulkAssignForm] = useState({
    class_id: "",
    fee_structure_id: "",
    discount: "0"
  });
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Form states
  const [feeForm, setFeeForm] = useState({
    name: "",
    description: "",
    amount: "",
    fee_type: "tuition",
    due_date: "",
    class_id: ""
  });
  
  const [assignForm, setAssignForm] = useState({
    student_id: "",
    fee_structure_id: "",
    discount: "0"
  });
  
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "cash",
    transaction_id: "",
    remarks: "",
    sendEmailReceipt: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feeStructuresRes, classesRes, studentsRes, profilesRes] = await Promise.all([
        supabase.from("fee_structures").select("*").order("created_at", { ascending: false }),
        supabase.from("classes").select("id, name"),
        supabase.from("students").select("id, student_id, user_id, class_id, father_name"),
        supabase.from("profiles").select("user_id, full_name, phone")
      ]);

      if (feeStructuresRes.data) setFeeStructures(feeStructuresRes.data);
      if (classesRes.data) setClasses(classesRes.data);
      if (studentsRes.data) setStudents(studentsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);

      await fetchStudentFees();
      await fetchPayments();
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentFees = async () => {
    const { data, error } = await supabase
      .from("student_fees")
      .select(`
        *,
        fee_structure:fee_structures(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching student fees:", error);
      return;
    }

    // Fetch student details separately
    const studentIds = [...new Set(data?.map(sf => sf.student_id) || [])];
    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, student_id, user_id")
        .in("id", studentIds);

      const userIds = studentsData?.map(s => s.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const enrichedData = data?.map(sf => {
        const student = studentsData?.find(s => s.id === sf.student_id);
        const profile = profilesData?.find(p => p.user_id === student?.user_id);
        return {
          ...sf,
          student: {
            student_id: student?.student_id || "",
            profiles: { full_name: profile?.full_name || "Unknown" }
          }
        };
      });

      setStudentFees(enrichedData || []);
    } else {
      setStudentFees(data || []);
    }
  };

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("fee_payments")
      .select("*")
      .order("payment_date", { ascending: false });
    
    // Enrich payments with student fee data for receipts
    if (data && studentFees.length > 0) {
      const enrichedPayments = data.map(payment => ({
        ...payment,
        studentFee: studentFees.find(sf => sf.id === payment.student_fee_id)
      }));
      setPayments(enrichedPayments);
    } else if (data) {
      setPayments(data);
    }
  };

  const handleCreateFeeStructure = async () => {
    if (!feeForm.name || !feeForm.amount) {
      toast.error("Please fill in required fields");
      return;
    }

    const { error } = await supabase.from("fee_structures").insert({
      name: feeForm.name,
      description: feeForm.description || null,
      amount: parseFloat(feeForm.amount),
      fee_type: feeForm.fee_type,
      due_date: feeForm.due_date || null,
      class_id: feeForm.class_id || null
    });

    if (error) {
      toast.error("Failed to create fee structure");
      return;
    }

    toast.success("Fee structure created");
    setFeeStructureDialog(false);
    setFeeForm({ name: "", description: "", amount: "", fee_type: "tuition", due_date: "", class_id: "" });
    fetchData();
  };

  const handleAssignFee = async () => {
    if (!assignForm.student_id || !assignForm.fee_structure_id) {
      toast.error("Please select student and fee");
      return;
    }

    const feeStructure = feeStructures.find(f => f.id === assignForm.fee_structure_id);
    if (!feeStructure) return;

    const discount = parseFloat(assignForm.discount) || 0;
    const finalAmount = feeStructure.amount - discount;

    const { error } = await supabase.from("student_fees").insert({
      student_id: assignForm.student_id,
      fee_structure_id: assignForm.fee_structure_id,
      amount: feeStructure.amount,
      discount: discount,
      final_amount: finalAmount,
      due_date: feeStructure.due_date || new Date().toISOString().split('T')[0],
      status: "pending"
    });

    if (error) {
      toast.error("Failed to assign fee");
      return;
    }

    // Send notification to parents
    try {
      await supabase.functions.invoke("send-fee-notification", {
        body: {
          type: "fee_assigned",
          studentId: assignForm.student_id,
          feeDetails: {
            feeName: feeStructure.name,
            amount: finalAmount,
            dueDate: feeStructure.due_date || new Date().toISOString().split('T')[0],
          },
        },
      });
      toast.success("Fee assigned and notification sent to parents");
    } catch (notifError) {
      console.error("Notification error:", notifError);
      toast.success("Fee assigned (notification may not have been sent)");
    }
    
    setAssignFeeDialog(false);
    setAssignForm({ student_id: "", fee_structure_id: "", discount: "0" });
    fetchStudentFees();
  };

  const handleBulkAssignFee = async () => {
    if (!bulkAssignForm.class_id || !bulkAssignForm.fee_structure_id) {
      toast.error("Please select class and fee type");
      return;
    }

    setBulkAssigning(true);
    const feeStructure = feeStructures.find(f => f.id === bulkAssignForm.fee_structure_id);
    if (!feeStructure) {
      setBulkAssigning(false);
      return;
    }

    const classStudents = students.filter(s => s.class_id === bulkAssignForm.class_id);
    if (classStudents.length === 0) {
      toast.error("No students found in this class");
      setBulkAssigning(false);
      return;
    }

    const discount = parseFloat(bulkAssignForm.discount) || 0;
    const finalAmount = feeStructure.amount - discount;

    // Check for existing assignments to avoid duplicates
    const existingAssignments = studentFees.filter(
      sf => sf.fee_structure_id === bulkAssignForm.fee_structure_id &&
        classStudents.some(cs => cs.id === sf.student_id)
    );
    
    const studentsToAssign = classStudents.filter(
      s => !existingAssignments.some(ea => ea.student_id === s.id)
    );

    if (studentsToAssign.length === 0) {
      toast.info("Fee already assigned to all students in this class");
      setBulkAssigning(false);
      return;
    }

    const newAssignments = studentsToAssign.map(student => ({
      student_id: student.id,
      fee_structure_id: bulkAssignForm.fee_structure_id,
      amount: feeStructure.amount,
      discount: discount,
      final_amount: finalAmount,
      due_date: feeStructure.due_date || new Date().toISOString().split('T')[0],
      status: "pending"
    }));

    const { error } = await supabase.from("student_fees").insert(newAssignments);

    if (error) {
      console.error("Bulk assign error:", error);
      toast.error("Failed to assign fees to some students");
      setBulkAssigning(false);
      return;
    }

    toast.success(`Fee assigned to ${studentsToAssign.length} students`);
    setBulkAssignDialog(false);
    setBulkAssignForm({ class_id: "", fee_structure_id: "", discount: "0" });
    setBulkAssigning(false);
    fetchStudentFees();
  };

  const handleRecordPayment = async () => {
    if (!selectedStudentFee || !paymentForm.amount) {
      toast.error("Please enter payment amount");
      return;
    }

    const receiptNumber = `RCP-${Date.now()}`;
    
    const { error } = await supabase.from("fee_payments").insert({
      student_fee_id: selectedStudentFee.id,
      amount: parseFloat(paymentForm.amount),
      payment_method: paymentForm.payment_method,
      transaction_id: paymentForm.transaction_id || null,
      receipt_number: receiptNumber,
      remarks: paymentForm.remarks || null
    });

    if (error) {
      toast.error("Failed to record payment");
      return;
    }

    // Check if fully paid
    const paidAmount = payments
      .filter(p => p.student_fee_id === selectedStudentFee.id)
      .reduce((sum, p) => sum + p.amount, 0) + parseFloat(paymentForm.amount);

    if (paidAmount >= selectedStudentFee.final_amount) {
      await supabase
        .from("student_fees")
        .update({ status: "paid" })
        .eq("id", selectedStudentFee.id);
    } else if (paidAmount > 0) {
      await supabase
        .from("student_fees")
        .update({ status: "partial" })
        .eq("id", selectedStudentFee.id);
    }

    // Send payment confirmation notification with PDF receipt if enabled
    if (paymentForm.sendEmailReceipt) {
      try {
        await supabase.functions.invoke("send-fee-notification", {
          body: {
            type: "payment_received",
            studentId: selectedStudentFee.student_id,
            paymentDetails: {
              amount: parseFloat(paymentForm.amount),
              receiptNumber: receiptNumber,
              paymentMethod: paymentForm.payment_method,
              studentFeeId: selectedStudentFee.id,
            },
          },
        });
        toast.success(`Payment recorded and receipt emailed. Receipt: ${receiptNumber}`);
      } catch (notifError) {
        console.error("Notification error:", notifError);
        toast.success(`Payment recorded. Receipt: ${receiptNumber}`);
      }
    } else {
      toast.success(`Payment recorded. Receipt: ${receiptNumber}`);
    }
    
    setPaymentDialog(false);
    setPaymentForm({ amount: "", payment_method: "cash", transaction_id: "", remarks: "", sendEmailReceipt: true });
    setSelectedStudentFee(null);
    fetchStudentFees();
    fetchPayments();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      partial: "secondary",
      pending: "outline",
      overdue: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const calculatePaidAmount = (studentFeeId: string) => {
    return payments
      .filter(p => p.student_fee_id === studentFeeId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  // Helper to create invoice data
  const createInvoiceData = (sf: StudentFee): InvoiceData => {
    const paid = calculatePaidAmount(sf.id);
    const feePayments = payments
      .filter(p => p.student_fee_id === sf.id)
      .map(p => ({
        date: new Date(p.payment_date).toLocaleDateString(),
        amount: p.amount,
        method: p.payment_method,
        receiptNumber: p.receipt_number
      }));
    
    return {
      invoiceNumber: `INV-${sf.id.slice(0, 8).toUpperCase()}`,
      invoiceDate: new Date(sf.created_at || Date.now()).toLocaleDateString(),
      dueDate: new Date(sf.due_date).toLocaleDateString(),
      studentName: sf.student?.profiles?.full_name || "Unknown",
      studentId: sf.student?.student_id || "",
      feeName: sf.fee_structure?.name || "Fee",
      feeType: feeStructures.find(f => f.id === sf.fee_structure_id)?.fee_type || "tuition",
      amount: sf.amount,
      discount: sf.discount,
      finalAmount: sf.final_amount,
      paidAmount: paid,
      status: sf.status,
      payments: feePayments,
    };
  };

  // Helper to create receipt data
  const createReceiptData = (payment: Payment): ReceiptData => {
    const sf = payment.studentFee || studentFees.find(s => s.id === payment.student_fee_id);
    const previousPaid = payments
      .filter(p => p.student_fee_id === payment.student_fee_id && new Date(p.payment_date) < new Date(payment.payment_date))
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      receiptNumber: payment.receipt_number || `RCP-${payment.id.slice(0, 8).toUpperCase()}`,
      paymentDate: new Date(payment.payment_date).toLocaleString(),
      studentName: sf?.student?.profiles?.full_name || "Unknown",
      studentId: sf?.student?.student_id || "",
      feeName: sf?.fee_structure?.name || "Fee",
      feeType: feeStructures.find(f => f.id === sf?.fee_structure_id)?.fee_type || "tuition",
      paymentAmount: payment.amount,
      paymentMethod: payment.payment_method,
      transactionId: payment.transaction_id || undefined,
      totalFeeAmount: sf?.final_amount || 0,
      previouslyPaid: previousPaid,
      balanceAfterPayment: Math.max(0, (sf?.final_amount || 0) - previousPaid - payment.amount),
    };
  };

  // Preview handlers
  const handlePreviewInvoice = (sf: StudentFee) => {
    setPreviewInvoiceData(createInvoiceData(sf));
    setPreviewType("invoice");
    setPreviewOpen(true);
  };

  const handlePreviewReceipt = (payment: Payment) => {
    setPreviewReceiptData(createReceiptData(payment));
    setPreviewType("receipt");
    setPreviewOpen(true);
  };

  const handlePreviewReport = async () => {
    setGeneratingReport(true);
    try {
      if (reportForm.reportType === "class") {
        if (!reportForm.classId) {
          toast.error("Please select a class");
          setGeneratingReport(false);
          return;
        }
        
        const selectedClass = classes.find(c => c.id === reportForm.classId);
        const classStudents = students.filter(s => s.class_id === reportForm.classId);
        
        const classStudentFees = studentFees.filter(sf => 
          classStudents.some(cs => cs.id === sf.student_id)
        );
        
        const studentFeeMap = new Map<string, { 
          student: typeof classStudents[0], 
          profile: typeof profiles[0] | undefined,
          fees: typeof classStudentFees 
        }>();
        
        classStudents.forEach(student => {
          const profile = profiles.find(p => p.user_id === student.user_id);
          const fees = classStudentFees.filter(sf => sf.student_id === student.id);
          studentFeeMap.set(student.id, { student, profile, fees });
        });
        
        const studentRecords = Array.from(studentFeeMap.values()).map(({ student, profile, fees }) => {
          const totalYearlyFee = fees.reduce((sum, sf) => sum + sf.final_amount, 0);
          const totalPaid = fees.reduce((sum, sf) => sum + calculatePaidAmount(sf.id), 0);
          const totalBalance = totalYearlyFee - totalPaid;
          
          return {
            studentId: student.id,
            studentName: profile?.full_name || "Unknown",
            rollNo: student.student_id || "",
            feeName: "Yearly Total",
            feeType: "all",
            totalAmount: totalYearlyFee,
            paidAmount: totalPaid,
            balance: totalBalance,
            status: totalBalance === 0 ? "paid" : totalBalance < totalYearlyFee ? "partial" : "pending",
            dueDate: "-",
          };
        });
        
        const reportData: ClassFeeReportData = {
          className: selectedClass?.name || "Unknown Class",
          reportDate: new Date().toLocaleDateString(),
          students: studentRecords,
        };
        
        setPreviewClassReportData(reportData);
        setPreviewType("classReport");
        setPreviewOpen(true);
        setReportDialog(false);
      } else {
        if (!reportForm.studentId) {
          toast.error("Please select a student");
          setGeneratingReport(false);
          return;
        }
        
        const student = students.find(s => s.id === reportForm.studentId);
        const profile = profiles.find(p => p.user_id === student?.user_id);
        const studentClass = classes.find(c => c.id === student?.class_id);
        
        const studentFeeRecords = studentFees.filter(sf => sf.student_id === reportForm.studentId);
        
        const fees = studentFeeRecords.map(sf => {
          const paidAmount = calculatePaidAmount(sf.id);
          return {
            feeName: sf.fee_structure?.name || "Fee",
            feeType: feeStructures.find(f => f.id === sf.fee_structure_id)?.fee_type || "tuition",
            amount: sf.amount,
            discount: sf.discount,
            finalAmount: sf.final_amount,
            paidAmount: paidAmount,
            balance: sf.final_amount - paidAmount,
            status: sf.status,
            dueDate: new Date(sf.due_date).toLocaleDateString(),
          };
        });
        
        const studentPayments = payments
          .filter(p => studentFeeRecords.some(sf => sf.id === p.student_fee_id))
          .map(p => {
            const sf = studentFeeRecords.find(sf => sf.id === p.student_fee_id);
            return {
              date: new Date(p.payment_date).toLocaleDateString(),
              feeName: sf?.fee_structure?.name || "Fee",
              amount: p.amount,
              method: p.payment_method,
              receiptNumber: p.receipt_number,
            };
          });
        
        const reportData: IndividualFeeReportData = {
          studentName: profile?.full_name || "Unknown",
          studentId: student?.student_id || "",
          rollNo: student?.student_id || "",
          className: studentClass?.name || "Unknown",
          fatherName: (student as any)?.father_name || undefined,
          phone: (profile as any)?.phone || undefined,
          reportDate: new Date().toLocaleDateString(),
          fees: fees,
          payments: studentPayments,
        };
        
        setPreviewIndividualReportData(reportData);
        setPreviewType("individualReport");
        setPreviewOpen(true);
        setReportDialog(false);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  // Filter students by class for individual report
  const filteredStudentsForReport = reportForm.classId 
    ? students.filter(s => s.class_id === reportForm.classId)
    : students;

  const filteredStudentFees = studentFees.filter(sf => 
    sf.student?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sf.student?.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalFees: studentFees.reduce((sum, sf) => sum + sf.final_amount, 0),
    collected: payments.reduce((sum, p) => sum + p.amount, 0),
    pending: studentFees.filter(sf => sf.status === "pending").length,
    overdue: studentFees.filter(sf => sf.status === "overdue" || (sf.status === "pending" && new Date(sf.due_date) < new Date())).length
  };

  // Get preview generator based on type
  const getPreviewGenerator = () => {
    switch (previewType) {
      case "invoice":
        return () => generateInvoicePdf(previewInvoiceData!);
      case "receipt":
        return () => generateReceiptPdf(previewReceiptData!);
      case "classReport":
        return () => generateClassFeeReportPdf(previewClassReportData!);
      case "individualReport":
        return () => generateIndividualFeeReportPdf(previewIndividualReportData!);
    }
  };

  const getPreviewFilename = () => {
    switch (previewType) {
      case "invoice":
        return `Invoice-${previewInvoiceData?.invoiceNumber}.pdf`;
      case "receipt":
        return `Receipt-${previewReceiptData?.receiptNumber}.pdf`;
      case "classReport":
        return `Fee-Report-${previewClassReportData?.className.replace(/\s+/g, "-")}.pdf`;
      case "individualReport":
        return `Fee-Report-${previewIndividualReportData?.studentName.replace(/\s+/g, "-")}.pdf`;
    }
  };

  const getPreviewTitle = () => {
    switch (previewType) {
      case "invoice":
        return "Invoice Preview";
      case "receipt":
        return "Receipt Preview";
      case "classReport":
        return "Class Fee Report Preview";
      case "individualReport":
        return "Student Fee Report Preview";
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Fee Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Fee Management" description="Manage fees, payments, and invoices">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {stats.totalFees.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">PKR {stats.collected.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="payments">Student Payments</TabsTrigger>
            <TabsTrigger value="structures">Fee Structures</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/fee-structure")}>
              <Grid3X3 className="h-4 w-4 mr-2" />
              Fee Structure
            </Button>
            <Dialog open={reportDialog} onOpenChange={setReportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Fee Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Report Type</Label>
                    <Select 
                      value={reportForm.reportType} 
                      onValueChange={(v: "class" | "individual") => setReportForm({ ...reportForm, reportType: v, studentId: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="class">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Class Report
                          </div>
                        </SelectItem>
                        <SelectItem value="individual">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Individual Student Report
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Select Class *</Label>
                    <Select 
                      value={reportForm.classId} 
                      onValueChange={(v) => setReportForm({ ...reportForm, classId: v, studentId: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {reportForm.reportType === "individual" && (
                    <div>
                      <Label>Select Student *</Label>
                      <Select 
                        value={reportForm.studentId} 
                        onValueChange={(v) => setReportForm({ ...reportForm, studentId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredStudentsForReport.map((student) => {
                            const profile = profiles.find(p => p.user_id === student.user_id);
                            return (
                              <SelectItem key={student.id} value={student.id}>
                                {profile?.full_name || student.student_id} ({student.student_id})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <Button onClick={handlePreviewReport} className="w-full" disabled={generatingReport}>
                    {generatingReport ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Report
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={feeStructureDialog} onOpenChange={setFeeStructureDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fee Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Fee Structure</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Fee Name *</Label>
                    <Input 
                      value={feeForm.name} 
                      onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })}
                      placeholder="e.g., Tuition Fee - Term 1"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input 
                      value={feeForm.description} 
                      onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Amount *</Label>
                      <Input 
                        type="number"
                        value={feeForm.amount} 
                        onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Fee Type</Label>
                      <Select value={feeForm.fee_type} onValueChange={(v) => setFeeForm({ ...feeForm, fee_type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tuition">Tuition</SelectItem>
                          <SelectItem value="registration">Registration</SelectItem>
                          <SelectItem value="exam">Exam</SelectItem>
                          <SelectItem value="library">Library</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Due Date</Label>
                      <Input 
                        type="date"
                        value={feeForm.due_date} 
                        onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Class (optional)</Label>
                      <Select value={feeForm.class_id} onValueChange={(v) => setFeeForm({ ...feeForm, class_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="All classes" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleCreateFeeStructure} className="w-full">Create Fee Structure</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={bulkAssignDialog} onOpenChange={setBulkAssignDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Assign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Assign Fee to Class</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Class *</Label>
                    <Select value={bulkAssignForm.class_id} onValueChange={(v) => setBulkAssignForm({ ...bulkAssignForm, class_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Select Fee Type *</Label>
                    <Select value={bulkAssignForm.fee_structure_id} onValueChange={(v) => setBulkAssignForm({ ...bulkAssignForm, fee_structure_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                      <SelectContent>
                        {feeStructures.map((fee) => (
                          <SelectItem key={fee.id} value={fee.id}>
                            {fee.name} (PKR {fee.amount.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Discount (optional)</Label>
                    <Input 
                      type="number"
                      value={bulkAssignForm.discount}
                      onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, discount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <Button onClick={handleBulkAssignFee} className="w-full" disabled={bulkAssigning}>
                    {bulkAssigning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      "Assign to All Students"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={assignFeeDialog} onOpenChange={setAssignFeeDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Fee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Fee to Student</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Student *</Label>
                    <Select value={assignForm.student_id} onValueChange={(v) => setAssignForm({ ...assignForm, student_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => {
                          const profile = profiles.find(p => p.user_id === student.user_id);
                          return (
                            <SelectItem key={student.id} value={student.id}>
                              {profile?.full_name || student.student_id} ({student.student_id})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fee Type *</Label>
                    <Select value={assignForm.fee_structure_id} onValueChange={(v) => setAssignForm({ ...assignForm, fee_structure_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee" />
                      </SelectTrigger>
                      <SelectContent>
                        {feeStructures.map((fee) => (
                          <SelectItem key={fee.id} value={fee.id}>
                            {fee.name} (PKR {fee.amount.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Discount</Label>
                    <Input 
                      type="number"
                      value={assignForm.discount}
                      onChange={(e) => setAssignForm({ ...assignForm, discount: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAssignFee} className="w-full">Assign Fee</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Student Fee Records</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudentFees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No student fees assigned yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudentFees.map((sf) => {
                      const paid = calculatePaidAmount(sf.id);
                      const balance = sf.final_amount - paid;
                      return (
                        <TableRow key={sf.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sf.student?.profiles?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{sf.student?.student_id}</p>
                            </div>
                          </TableCell>
                          <TableCell>{sf.fee_structure?.name}</TableCell>
                          <TableCell>PKR {sf.final_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">PKR {paid.toLocaleString()}</TableCell>
                          <TableCell className={balance > 0 ? "text-destructive" : ""}>
                            PKR {balance.toLocaleString()}
                          </TableCell>
                          <TableCell>{new Date(sf.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(sf.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              {sf.status !== "paid" && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStudentFee(sf);
                                    setPaymentForm({ ...paymentForm, amount: balance.toString() });
                                    setPaymentDialog(true);
                                  }}
                                >
                                  <Receipt className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="Preview Invoice"
                                onClick={() => handlePreviewInvoice(sf)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="Download Invoice"
                                onClick={() => downloadInvoice(createInvoiceData(sf))}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="Print Invoice"
                                onClick={() => printInvoice(createInvoiceData(sf))}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures">
          <Card>
            <CardHeader>
              <CardTitle>Fee Structures</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeStructures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No fee structures created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    feeStructures.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{fee.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{fee.fee_type}</Badge>
                        </TableCell>
                        <TableCell>PKR {fee.amount.toLocaleString()}</TableCell>
                        <TableCell>{fee.due_date ? new Date(fee.due_date).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{fee.description || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment History</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No payments recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => {
                      const sf = payment.studentFee || studentFees.find(s => s.id === payment.student_fee_id);
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono">{payment.receipt_number || "-"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sf?.student?.profiles?.full_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{sf?.student?.student_id || ""}</p>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(payment.payment_date).toLocaleString()}</TableCell>
                          <TableCell className="text-green-600 font-medium">PKR {payment.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{payment.payment_method}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{payment.transaction_id || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                title="Preview Receipt"
                                onClick={() => handlePreviewReceipt(payment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                title="Download Receipt"
                                onClick={() => downloadReceipt(createReceiptData(payment))}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                title="Print Receipt"
                                onClick={() => printReceipt(createReceiptData(payment))}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-medium">{selectedStudentFee?.student?.profiles?.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedStudentFee?.fee_structure?.name} - 
                Balance: PKR {((selectedStudentFee?.final_amount || 0) - calculatePaidAmount(selectedStudentFee?.id || "")).toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Amount *</Label>
              <Input 
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction ID (optional)</Label>
              <Input 
                value={paymentForm.transaction_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
              />
            </div>
            <div>
              <Label>Remarks (optional)</Label>
              <Input 
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                id="email-receipt"
                checked={paymentForm.sendEmailReceipt}
                onCheckedChange={(checked) => setPaymentForm({ ...paymentForm, sendEmailReceipt: checked })}
              />
              <Label htmlFor="email-receipt" className="flex items-center gap-2 cursor-pointer">
                <Mail className="h-4 w-4" />
                Send receipt via email
              </Label>
            </div>
            <Button onClick={handleRecordPayment} className="w-full">Record Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      {previewOpen && (
        <DocumentPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={getPreviewTitle()}
          generatePdf={getPreviewGenerator()}
          filename={getPreviewFilename()}
        />
      )}
    </AdminLayout>
  );
};

export default FeeManagement;
