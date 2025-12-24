import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Wallet, AlertCircle, Users, Calendar } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend 
} from "recharts";

interface CollectionTrend {
  month: string;
  collected: number;
  assigned: number;
}

interface ClassOutstanding {
  className: string;
  outstanding: number;
  total: number;
  paid: number;
}

interface PaymentMethod {
  method: string;
  count: number;
  amount: number;
}

interface FeeStatus {
  status: string;
  count: number;
  amount: number;
}

const FeeAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6months");
  const [collectionTrends, setCollectionTrends] = useState<CollectionTrend[]>([]);
  const [classOutstanding, setClassOutstanding] = useState<ClassOutstanding[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [feeStatuses, setFeeStatuses] = useState<FeeStatus[]>([]);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    collectionRate: 0,
    overdueCount: 0,
    thisMonthCollection: 0,
    lastMonthCollection: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all student fees with class info
      const { data: studentFees } = await supabase
        .from("student_fees")
        .select(`
          id,
          amount,
          discount,
          final_amount,
          due_date,
          status,
          created_at,
          student:students(
            id,
            class_id
          )
        `);

      // Fetch all payments
      const { data: payments } = await supabase
        .from("fee_payments")
        .select("*")
        .order("payment_date", { ascending: true });

      // Fetch classes
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name, section");

      if (!studentFees || !payments || !classes) {
        setLoading(false);
        return;
      }

      // Calculate totals
      const totalAssigned = studentFees.reduce((sum, sf) => sum + sf.final_amount, 0);
      const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalOutstanding = totalAssigned - totalCollected;
      const collectionRate = totalAssigned > 0 ? (totalCollected / totalAssigned) * 100 : 0;
      const overdueCount = studentFees.filter(sf => sf.status === "overdue").length;

      // This month vs last month
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthCollection = payments
        .filter(p => new Date(p.payment_date) >= thisMonthStart)
        .reduce((sum, p) => sum + p.amount, 0);

      const lastMonthCollection = payments
        .filter(p => {
          const date = new Date(p.payment_date);
          return date >= lastMonthStart && date <= lastMonthEnd;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalAssigned,
        totalCollected,
        totalOutstanding,
        collectionRate,
        overdueCount,
        thisMonthCollection,
        lastMonthCollection,
      });

      // Calculate collection trends by month
      const monthsToShow = period === "3months" ? 3 : period === "6months" ? 6 : 12;
      const trends: CollectionTrend[] = [];
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthName = monthDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

        const collected = payments
          .filter(p => {
            const date = new Date(p.payment_date);
            return date >= monthDate && date <= monthEnd;
          })
          .reduce((sum, p) => sum + p.amount, 0);

        const assigned = studentFees
          .filter(sf => {
            const date = new Date(sf.created_at);
            return date >= monthDate && date <= monthEnd;
          })
          .reduce((sum, sf) => sum + sf.final_amount, 0);

        trends.push({ month: monthName, collected, assigned });
      }
      setCollectionTrends(trends);

      // Calculate outstanding by class
      const classMap = new Map<string, ClassOutstanding>();
      classes.forEach(c => {
        const className = `${c.name}${c.section ? ` ${c.section}` : ""}`;
        classMap.set(c.id, { className, outstanding: 0, total: 0, paid: 0 });
      });

      // Create a map of fee to student's class
      const feeToClass = new Map<string, string>();
      studentFees.forEach(sf => {
        const student = sf.student as { id: string; class_id: string | null } | null;
        if (student?.class_id) {
          feeToClass.set(sf.id, student.class_id);
          const classData = classMap.get(student.class_id);
          if (classData) {
            classData.total += sf.final_amount;
          }
        }
      });

      // Add payments to class data
      payments.forEach(p => {
        const studentFee = studentFees.find(sf => sf.id === p.student_fee_id);
        if (studentFee) {
          const student = studentFee.student as { id: string; class_id: string | null } | null;
          if (student?.class_id) {
            const classData = classMap.get(student.class_id);
            if (classData) {
              classData.paid += p.amount;
            }
          }
        }
      });

      // Calculate outstanding
      classMap.forEach(data => {
        data.outstanding = data.total - data.paid;
      });

      const outstandingData = Array.from(classMap.values())
        .filter(c => c.total > 0)
        .sort((a, b) => b.outstanding - a.outstanding);
      setClassOutstanding(outstandingData);

      // Payment methods breakdown
      const methodMap = new Map<string, PaymentMethod>();
      payments.forEach(p => {
        const method = p.payment_method || "cash";
        if (!methodMap.has(method)) {
          methodMap.set(method, { method, count: 0, amount: 0 });
        }
        const data = methodMap.get(method)!;
        data.count++;
        data.amount += p.amount;
      });
      setPaymentMethods(Array.from(methodMap.values()));

      // Fee status breakdown
      const statusMap = new Map<string, FeeStatus>();
      studentFees.forEach(sf => {
        const status = sf.status || "pending";
        if (!statusMap.has(status)) {
          statusMap.set(status, { status, count: 0, amount: 0 });
        }
        const data = statusMap.get(status)!;
        data.count++;
        data.amount += sf.final_amount;
      });
      setFeeStatuses(Array.from(statusMap.values()));

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;
  
  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];
  const STATUS_COLORS: Record<string, string> = {
    paid: "#22c55e",
    partial: "#eab308",
    pending: "#94a3b8",
    overdue: "#ef4444",
  };

  if (loading) {
    return (
      <AdminLayout title="Fee Analytics">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const collectionChange = stats.lastMonthCollection > 0 
    ? ((stats.thisMonthCollection - stats.lastMonthCollection) / stats.lastMonthCollection) * 100 
    : 0;

  return (
    <AdminLayout title="Fee Analytics" description="Monitor fee collection performance and trends">
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex justify-end">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Total Assigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAssigned)}</div>
              <p className="text-xs text-muted-foreground mt-1">All time fees</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCollected)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.collectionRate.toFixed(1)}% collection rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.overdueCount} overdue fees</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.thisMonthCollection)}</div>
              <div className="flex items-center gap-1 mt-1">
                {collectionChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={`text-xs ${collectionChange >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {Math.abs(collectionChange).toFixed(1)}% vs last month
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Collection Trends */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Collection Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={collectionTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), ""]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="assigned" 
                      name="Assigned"
                      stroke="hsl(var(--muted-foreground))" 
                      fill="hsl(var(--muted))" 
                      fillOpacity={0.3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="collected" 
                      name="Collected"
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Fee Status Distribution */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Fee Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feeStatuses}
                      dataKey="amount"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ status, percent }) => `${status} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {feeStatuses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Amount"]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Outstanding by Class */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Outstanding Amount by Class</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {classOutstanding.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Users className="h-8 w-8 mr-2" />
                    No class data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classOutstanding.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} className="text-xs" />
                      <YAxis type="category" dataKey="className" width={80} className="text-xs" />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), ""]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      />
                      <Bar dataKey="outstanding" name="Outstanding" fill="#ef4444" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="paid" name="Paid" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {paymentMethods.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Wallet className="h-8 w-8 mr-2" />
                    No payment data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentMethods}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="method" className="text-xs capitalize" />
                      <YAxis yAxisId="left" tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} className="text-xs" />
                      <YAxis yAxisId="right" orientation="right" className="text-xs" />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === "amount" ? formatCurrency(value) : value,
                          name === "amount" ? "Total Amount" : "Transactions"
                        ]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="amount" name="Amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="count" name="Transactions" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Class-wise Fee Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Class</th>
                    <th className="text-right py-3 px-4 font-medium">Total Fees</th>
                    <th className="text-right py-3 px-4 font-medium">Collected</th>
                    <th className="text-right py-3 px-4 font-medium">Outstanding</th>
                    <th className="text-right py-3 px-4 font-medium">Collection Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {classOutstanding.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No class data available
                      </td>
                    </tr>
                  ) : (
                    classOutstanding.map((cls, index) => {
                      const rate = cls.total > 0 ? (cls.paid / cls.total) * 100 : 0;
                      return (
                        <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{cls.className}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(cls.total)}</td>
                          <td className="py-3 px-4 text-right text-green-600">{formatCurrency(cls.paid)}</td>
                          <td className="py-3 px-4 text-right text-destructive">{formatCurrency(cls.outstanding)}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={rate >= 75 ? "text-green-600" : rate >= 50 ? "text-yellow-600" : "text-destructive"}>
                              {rate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default FeeAnalytics;
