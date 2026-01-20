import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  GraduationCap,
  CreditCard,
  CalendarCheck,
  BookOpen,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface SessionStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalFees: number;
  collectedFees: number;
  pendingFees: number;
  totalExams: number;
  avgAttendance: number;
  totalAdmissions: number;
  approvedAdmissions: number;
}

const SessionReport = () => {
  const { academicYears, selectedSession, setSelectedSession, isLoading: sessionLoading } = useSession();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [classBreakdown, setClassBreakdown] = useState<{ name: string; students: number; fees: number; paid: number }[]>([]);

  useEffect(() => {
    if (selectedSession) {
      fetchSessionStats();
    }
  }, [selectedSession]);

  const fetchSessionStats = async () => {
    if (!selectedSession) return;
    setLoading(true);

    try {
      // Fetch classes for selected session
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name")
        .eq("academic_year_id", selectedSession.id);

      const classIds = classes?.map(c => c.id) || [];

      // Fetch students in these classes
      const { data: students } = await supabase
        .from("students")
        .select("id, class_id")
        .in("class_id", classIds.length > 0 ? classIds : ["no-match"]);

      // Fetch teachers count
      const { count: teacherCount } = await supabase
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch fee structures for this session
      const { data: feeStructures } = await supabase
        .from("fee_structures")
        .select("id, amount")
        .eq("academic_year_id", selectedSession.id);

      // Fetch student fees for students in these classes
      const studentIds = students?.map(s => s.id) || [];
      const { data: studentFees } = await supabase
        .from("student_fees")
        .select("id, final_amount, status, student_id")
        .in("student_id", studentIds.length > 0 ? studentIds : ["no-match"]);

      // Fetch payments
      const studentFeeIds = studentFees?.map(sf => sf.id) || [];
      const { data: payments } = await supabase
        .from("fee_payments")
        .select("amount, student_fee_id")
        .in("student_fee_id", studentFeeIds.length > 0 ? studentFeeIds : ["no-match"]);

      // Fetch exams for this session
      const { count: examCount } = await supabase
        .from("exams")
        .select("id", { count: "exact", head: true })
        .eq("academic_year_id", selectedSession.id);

      // Fetch attendance for date range
      const { data: attendance } = await supabase
        .from("attendance")
        .select("status")
        .in("class_id", classIds.length > 0 ? classIds : ["no-match"])
        .gte("date", selectedSession.start_date)
        .lte("date", selectedSession.end_date);

      // Fetch admissions
      const { data: admissions } = await supabase
        .from("admissions")
        .select("status, created_at")
        .gte("created_at", selectedSession.start_date)
        .lte("created_at", selectedSession.end_date);

      // Calculate stats
      const totalFees = studentFees?.reduce((sum, sf) => sum + Number(sf.final_amount), 0) || 0;
      const collectedFees = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const presentCount = attendance?.filter(a => a.status === "present").length || 0;
      const totalAttendance = attendance?.length || 1;
      const avgAttendance = Math.round((presentCount / totalAttendance) * 100);

      setStats({
        totalStudents: students?.length || 0,
        totalTeachers: teacherCount || 0,
        totalClasses: classes?.length || 0,
        totalFees,
        collectedFees,
        pendingFees: totalFees - collectedFees,
        totalExams: examCount || 0,
        avgAttendance,
        totalAdmissions: admissions?.length || 0,
        approvedAdmissions: admissions?.filter(a => a.status === "approved").length || 0,
      });

      // Class breakdown
      const breakdown = (classes || []).map(cls => {
        const classStudents = students?.filter(s => s.class_id === cls.id) || [];
        const classStudentIds = classStudents.map(s => s.id);
        const classFees = studentFees?.filter(sf => classStudentIds.includes(sf.student_id)) || [];
        const classFeeIds = classFees.map(cf => cf.id);
        const classPayments = payments?.filter(p => classFeeIds.includes(p.student_fee_id)) || [];
        
        return {
          name: cls.name,
          students: classStudents.length,
          fees: classFees.reduce((sum, cf) => sum + Number(cf.final_amount), 0),
          paid: classPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        };
      });

      setClassBreakdown(breakdown);

    } catch (error) {
      console.error("Error fetching session stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AdminLayout
      title="Session Report"
      description="Comprehensive overview of academic session data"
    >
      <div className="space-y-6">
        {/* Session Selector */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Select Session:</span>
                <Select
                  value={selectedSession?.id || ""}
                  onValueChange={(value) => {
                    const session = academicYears.find(y => y.id === value);
                    if (session) setSelectedSession(session);
                  }}
                  disabled={sessionLoading}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.is_current && "(Current)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSession && (
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selectedSession.start_date), "MMM yyyy")} - {format(new Date(selectedSession.end_date), "MMM yyyy")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Students</p>
                      <p className="text-2xl font-bold">{stats.totalStudents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                      <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Teachers</p>
                      <p className="text-2xl font-bold">{stats.totalTeachers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                      <GraduationCap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Classes</p>
                      <p className="text-2xl font-bold">{stats.totalClasses}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                      <BookOpen className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Exams Conducted</p>
                      <p className="text-2xl font-bold">{stats.totalExams}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900">
                      <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fees Collected</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.collectedFees)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
                      <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Fees</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.pendingFees)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-cyan-100 dark:bg-cyan-900">
                      <CalendarCheck className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Attendance</p>
                      <p className="text-2xl font-bold">{stats.avgAttendance}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
                      <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Admissions</p>
                      <p className="text-2xl font-bold">{stats.approvedAdmissions}/{stats.totalAdmissions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fee Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Fee Collection Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Fees Expected</span>
                    <span className="font-bold text-lg">{formatCurrency(stats.totalFees)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${stats.totalFees > 0 ? (stats.collectedFees / stats.totalFees) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="text-green-600">Collected: {formatCurrency(stats.collectedFees)}</span>
                    <span className="text-red-600">Pending: {formatCurrency(stats.pendingFees)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Class Breakdown */}
            {classBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Class-wise Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Class</th>
                          <th className="text-center py-3 px-4">Students</th>
                          <th className="text-right py-3 px-4">Total Fees</th>
                          <th className="text-right py-3 px-4">Paid</th>
                          <th className="text-right py-3 px-4">Balance</th>
                          <th className="text-center py-3 px-4">Collection %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classBreakdown.map((cls) => (
                          <tr key={cls.name} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-medium">{cls.name}</td>
                            <td className="text-center py-3 px-4">{cls.students}</td>
                            <td className="text-right py-3 px-4">{formatCurrency(cls.fees)}</td>
                            <td className="text-right py-3 px-4 text-green-600">{formatCurrency(cls.paid)}</td>
                            <td className="text-right py-3 px-4 text-red-600">{formatCurrency(cls.fees - cls.paid)}</td>
                            <td className="text-center py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                cls.fees > 0 && (cls.paid / cls.fees) >= 0.8 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                                  : cls.fees > 0 && (cls.paid / cls.fees) >= 0.5 
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" 
                                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              }`}>
                                {cls.fees > 0 ? Math.round((cls.paid / cls.fees) * 100) : 0}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Select a session to view the report</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default SessionReport;