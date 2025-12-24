import { useState, useEffect } from "react";
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
import { Plus, Receipt, CreditCard, FileText, Loader2, Search, Download, Printer } from "lucide-react";

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
}

const FeeManagement = () => {
  const [loading, setLoading] = useState(true);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; student_id: string; user_id: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [feeStructureDialog, setFeeStructureDialog] = useState(false);
  const [assignFeeDialog, setAssignFeeDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedStudentFee, setSelectedStudentFee] = useState<StudentFee | null>(null);
  
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
    remarks: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feeStructuresRes, classesRes, studentsRes] = await Promise.all([
        supabase.from("fee_structures").select("*").order("created_at", { ascending: false }),
        supabase.from("classes").select("id, name"),
        supabase.from("students").select("id, student_id, user_id")
      ]);

      if (feeStructuresRes.data) setFeeStructures(feeStructuresRes.data);
      if (classesRes.data) setClasses(classesRes.data);
      if (studentsRes.data) setStudents(studentsRes.data);

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
    if (data) setPayments(data);
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

    toast.success("Fee assigned to student");
    setAssignFeeDialog(false);
    setAssignForm({ student_id: "", fee_structure_id: "", discount: "0" });
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

    toast.success(`Payment recorded. Receipt: ${receiptNumber}`);
    setPaymentDialog(false);
    setPaymentForm({ amount: "", payment_method: "cash", transaction_id: "", remarks: "" });
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
            <div className="text-2xl font-bold">₦{stats.totalFees.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₦{stats.collected.toLocaleString()}</div>
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
            <Dialog open={assignFeeDialog} onOpenChange={setAssignFeeDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <CreditCard className="h-4 w-4 mr-2" />
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
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>{student.student_id}</SelectItem>
                        ))}
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
                            {fee.name} - ₦{fee.amount.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Discount Amount</Label>
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
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search students..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudentFees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No fee records found
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
                              <div className="font-medium">{sf.student?.profiles?.full_name}</div>
                              <div className="text-sm text-muted-foreground">{sf.student?.student_id}</div>
                            </div>
                          </TableCell>
                          <TableCell>{sf.fee_structure?.name}</TableCell>
                          <TableCell>₦{sf.final_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">₦{paid.toLocaleString()}</TableCell>
                          <TableCell className={balance > 0 ? "text-destructive" : ""}>
                            ₦{balance.toLocaleString()}
                          </TableCell>
                          <TableCell>{new Date(sf.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(sf.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
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
                              <Button variant="ghost" size="sm">
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
                        <TableCell>₦{fee.amount.toLocaleString()}</TableCell>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Transaction ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No payments recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">{payment.receipt_number}</TableCell>
                        <TableCell>{new Date(payment.payment_date).toLocaleString()}</TableCell>
                        <TableCell className="text-green-600 font-medium">₦{payment.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{payment.payment_method}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{payment.transaction_id || "-"}</TableCell>
                      </TableRow>
                    ))
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
                  <SelectItem value="card">Card</SelectItem>
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
            <Button onClick={handleRecordPayment} className="w-full">
              <Receipt className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default FeeManagement;