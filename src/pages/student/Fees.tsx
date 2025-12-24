import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, LogOut, Receipt, Wallet, AlertCircle, CheckCircle2, Clock, Download 
} from "lucide-react";
import { downloadInvoice } from "@/utils/generateInvoicePdf";
import { toast } from "sonner";

interface StudentFee {
  id: string;
  amount: number;
  discount: number;
  final_amount: number;
  due_date: string;
  status: string;
  created_at: string;
  fee_structure: {
    id: string;
    name: string;
    fee_type: string;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  receipt_number: string | null;
  transaction_id: string | null;
  student_fee_id: string;
}

interface StudentInfo {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string | null;
}

const StudentFees = () => {
  const navigate = useNavigate();
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Verify student role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "student") {
      navigate("/dashboard");
      return;
    }

    await fetchData(session.user.id);
  };

  const fetchData = async (userId: string) => {
    try {
      // Get student record
      const { data: student } = await supabase
        .from("students")
        .select("id, student_id, class_id")
        .eq("user_id", userId)
        .single();

      if (!student) {
        toast.error("Student record not found");
        setLoading(false);
        return;
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .single();

      // Get class name
      let className = null;
      if (student.class_id) {
        const { data: classData } = await supabase
          .from("classes")
          .select("name, section")
          .eq("id", student.class_id)
          .single();
        className = classData ? `${classData.name} ${classData.section || ""}`.trim() : null;
      }

      setStudentInfo({
        id: student.id,
        student_id: student.student_id,
        full_name: profile?.full_name || "Unknown",
        class_name: className,
      });

      // Fetch fees
      const { data: feesData } = await supabase
        .from("student_fees")
        .select(`
          id,
          amount,
          discount,
          final_amount,
          due_date,
          status,
          created_at,
          fee_structure:fee_structures(id, name, fee_type)
        `)
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

      if (feesData) {
        setFees(feesData as StudentFee[]);

        // Fetch payments for all fees
        const feeIds = feesData.map(f => f.id);
        if (feeIds.length > 0) {
          const { data: paymentsData } = await supabase
            .from("fee_payments")
            .select("*")
            .in("student_fee_id", feeIds)
            .order("payment_date", { ascending: false });

          if (paymentsData) {
            setPayments(paymentsData);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load fee information");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      paid: { variant: "default", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      partial: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      pending: { variant: "outline", icon: <Clock className="h-3 w-3 mr-1" /> },
      overdue: { variant: "destructive", icon: <AlertCircle className="h-3 w-3 mr-1" /> },
    };
    const { variant, icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center w-fit">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const calculatePaidAmount = (feeId: string) => {
    return payments
      .filter(p => p.student_fee_id === feeId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const stats = {
    totalFees: fees.reduce((sum, f) => sum + f.final_amount, 0),
    totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
    pending: fees.filter(f => f.status === "pending" || f.status === "partial").length,
    overdue: fees.filter(f => f.status === "overdue").length,
  };

  const handleDownloadInvoice = (fee: StudentFee) => {
    const feePayments = payments
      .filter(p => p.student_fee_id === fee.id)
      .map(p => ({
        date: new Date(p.payment_date).toLocaleDateString(),
        amount: p.amount,
        method: p.payment_method,
        receiptNumber: p.receipt_number,
      }));

    downloadInvoice({
      invoiceNumber: `INV-${fee.id.slice(0, 8).toUpperCase()}`,
      invoiceDate: new Date(fee.created_at).toLocaleDateString(),
      dueDate: new Date(fee.due_date).toLocaleDateString(),
      studentName: studentInfo?.full_name || "Unknown",
      studentId: studentInfo?.student_id || "",
      className: studentInfo?.class_name || undefined,
      feeName: fee.fee_structure?.name || "Fee",
      feeType: fee.fee_structure?.fee_type || "tuition",
      amount: fee.amount,
      discount: fee.discount,
      finalAmount: fee.final_amount,
      paidAmount: calculatePaidAmount(fee.id),
      status: fee.status,
      payments: feePayments,
    });
    toast.success("Invoice downloaded");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold">The Suffah</h1>
              <p className="text-xs text-muted-foreground">Student Portal</p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Fee Status</h2>
          <p className="text-muted-foreground">
            {studentInfo?.full_name} • {studentInfo?.student_id}
            {studentInfo?.class_name && ` • ${studentInfo.class_name}`}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Total Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{stats.totalFees.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Total Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₦{stats.totalPaid.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Due Alert */}
        {stats.totalFees - stats.totalPaid > 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Outstanding Balance: ₦{(stats.totalFees - stats.totalPaid).toLocaleString()}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Please contact the school administration for payment options.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="fees" className="space-y-4">
          <TabsList>
            <TabsTrigger value="fees">Fee Records</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle>My Fee Records</CardTitle>
              </CardHeader>
              <CardContent>
                {fees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No fee records found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fee Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fees.map((fee) => {
                        const paid = calculatePaidAmount(fee.id);
                        const balance = fee.final_amount - paid;
                        return (
                          <TableRow key={fee.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{fee.fee_structure?.name}</div>
                                <div className="text-sm text-muted-foreground capitalize">
                                  {fee.fee_structure?.fee_type}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>₦{fee.final_amount.toLocaleString()}</div>
                                {fee.discount > 0 && (
                                  <div className="text-xs text-green-600">
                                    -{fee.discount.toLocaleString()} discount
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-green-600">
                              ₦{paid.toLocaleString()}
                            </TableCell>
                            <TableCell className={balance > 0 ? "text-destructive font-medium" : "text-green-600"}>
                              ₦{balance.toLocaleString()}
                            </TableCell>
                            <TableCell>{new Date(fee.due_date).toLocaleDateString()}</TableCell>
                            <TableCell>{getStatusBadge(fee.status)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadInvoice(fee)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payment records found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Transaction ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            ₦{payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize">{payment.payment_method}</TableCell>
                          <TableCell>{payment.receipt_number || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {payment.transaction_id || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentFees;
