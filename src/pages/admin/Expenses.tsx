import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Wallet, TrendingUp, Receipt, Search, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportToExcel, exportToCSV } from "@/utils/exportUtils";

interface ExpenseHead {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Expense {
  id: string;
  date: string;
  expense_head_id: string;
  amount: number;
  description: string | null;
  receipt_number: string | null;
  paid_to: string | null;
  created_at: string;
  expense_heads?: ExpenseHead;
}

const Expenses = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHead, setFilterHead] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  
  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    expense_head_id: "",
    amount: "",
    description: "",
    receipt_number: "",
    paid_to: "",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchExpenses();
    }
  }, [filterMonth]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "admin") { 
      navigate("/dashboard"); 
      return; 
    }

    await Promise.all([fetchExpenseHeads(), fetchExpenses()]);
    setLoading(false);
  };

  const fetchExpenseHeads = async () => {
    const { data, error } = await supabase
      .from("expense_heads")
      .select("*")
      .eq("is_active", true)
      .order("name");
    
    if (error) {
      toast.error("Failed to load expense heads");
      return;
    }
    setExpenseHeads(data || []);
  };

  const fetchExpenses = async () => {
    const [year, month] = filterMonth.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from("expenses")
      .select("*, expense_heads(*)")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });
    
    if (error) {
      toast.error("Failed to load expenses");
      return;
    }
    setExpenses(data || []);
  };

  const handleAddExpense = async () => {
    if (!formData.expense_head_id || !formData.amount) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from("expenses").insert({
      date: formData.date,
      expense_head_id: formData.expense_head_id,
      amount: parseFloat(formData.amount),
      description: formData.description || null,
      receipt_number: formData.receipt_number || null,
      paid_to: formData.paid_to || null,
      created_by: user?.id,
    });

    setSaving(false);
    
    if (error) {
      toast.error("Failed to add expense");
      return;
    }

    toast.success("Expense added successfully");
    setAddDialogOpen(false);
    resetForm();
    fetchExpenses();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    
    if (error) {
      toast.error("Failed to delete expense");
      return;
    }

    toast.success("Expense deleted");
    fetchExpenses();
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      expense_head_id: "",
      amount: "",
      description: "",
      receipt_number: "",
      paid_to: "",
    });
  };

  const handleExport = (type: "excel" | "csv") => {
    const exportData = filteredExpenses.map(exp => ({
      date: format(new Date(exp.date), "dd/MM/yyyy"),
      head: exp.expense_heads?.name || "",
      amount: exp.amount,
      description: exp.description || "",
      receipt_number: exp.receipt_number || "",
      paid_to: exp.paid_to || "",
    }));

    const columns = [
      { header: "Date", key: "date" },
      { header: "Expense Head", key: "head" },
      { header: "Amount (PKR)", key: "amount" },
      { header: "Description", key: "description" },
      { header: "Receipt #", key: "receipt_number" },
      { header: "Paid To", key: "paid_to" },
    ];

    if (type === "excel") {
      exportToExcel(exportData, columns, `Expenses_${filterMonth}`);
    } else {
      exportToCSV(exportData, columns, `Expenses_${filterMonth}`);
    }
  };

  // Calculate stats
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const expensesByHead = expenses.reduce((acc, exp) => {
    const head = exp.expense_heads?.name || "Unknown";
    acc[head] = (acc[head] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const topExpenseHead = Object.entries(expensesByHead).sort((a, b) => b[1] - a[1])[0];

  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = 
      exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.paid_to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHead = filterHead === "all" || exp.expense_head_id === filterHead;
    return matchesSearch && matchesHead;
  });

  if (loading) {
    return (
      <AdminLayout title="Expenses" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Expense Management" description="Track and manage school expenses">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">PKR {totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{expenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Category</p>
                <p className="text-lg font-bold truncate">
                  {topExpenseHead ? topExpenseHead[0] : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label>Month</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label>Category</Label>
              <Select value={filterHead} onValueChange={setFilterHead}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {expenseHeads.map(head => (
                    <SelectItem key={head.id} value={head.id}>{head.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport("excel")}>
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Ledger</CardTitle>
          <CardDescription>
            {filteredExpenses.length} expense(s) for {format(new Date(filterMonth + "-01"), "MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Paid To</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No expenses found for this period
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.expense_heads?.name || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {expense.description || "-"}
                    </TableCell>
                    <TableCell>{expense.paid_to || "-"}</TableCell>
                    <TableCell>{expense.receipt_number || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      PKR {expense.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>Record a new expense entry</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Amount (PKR) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Expense Category *</Label>
              <Select
                value={formData.expense_head_id}
                onValueChange={(value) => setFormData({ ...formData, expense_head_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseHeads.map(head => (
                    <SelectItem key={head.id} value={head.id}>{head.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Expense details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Paid To</Label>
                <Input
                  placeholder="Vendor/Person name"
                  value={formData.paid_to}
                  onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
                />
              </div>
              <div>
                <Label>Receipt Number</Label>
                <Input
                  placeholder="Receipt #"
                  value={formData.receipt_number}
                  onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExpense} disabled={saving}>
              {saving ? "Saving..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Expenses;
