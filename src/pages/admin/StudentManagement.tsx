import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, UserCheck, UserX, Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";

interface Student {
  id: string;
  student_id: string;
  user_id: string;
  class_id: string | null;
  status: string;
  admission_date: string;
  profile?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
  class?: {
    name: string;
    section: string | null;
  };
}

interface ClassOption {
  id: string;
  name: string;
  section: string | null;
}

const StudentManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ userId: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    student_id: "",
    class_id: "",
    status: "active",
  });

  const [addFormData, setAddFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    class_id: "",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

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

    await Promise.all([fetchStudents(), fetchClasses()]);
    setLoading(false);
  };

  const fetchStudents = async () => {
    const { data: studentsData, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching students:", error);
      return;
    }

    const userIds = studentsData?.map(s => s.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone")
      .in("user_id", userIds);

    const classIds = studentsData?.filter(s => s.class_id).map(s => s.class_id) || [];
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, name, section")
      .in("id", classIds);

    const enrichedStudents = studentsData?.map(student => ({
      ...student,
      profile: profiles?.find(p => p.user_id === student.user_id),
      class: classesData?.find(c => c.id === student.class_id),
    })) || [];

    setStudents(enrichedStudents);
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("id, name, section").order("grade_level");
    setClasses(data || []);
  };

  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `STU${year}${random}`;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: addFormData.email,
          password: addFormData.password,
          fullName: addFormData.full_name,
          phone: addFormData.phone || undefined,
          role: "student",
          roleSpecificData: {
            class_id: addFormData.class_id || null,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: "Success", description: "Student account created successfully" });
      setIsAddDialogOpen(false);
      resetAddForm();
      fetchStudents();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create student", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingStudent) {
      const { error: studentError } = await supabase
        .from("students")
        .update({
          student_id: formData.student_id,
          class_id: formData.class_id || null,
          status: formData.status,
        })
        .eq("id", editingStudent.id);

      if (studentError) {
        toast({ title: "Error", description: "Failed to update student", variant: "destructive" });
        return;
      }

      await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
        })
        .eq("user_id", editingStudent.user_id);

      toast({ title: "Success", description: "Student updated successfully" });
    }

    setIsDialogOpen(false);
    setEditingStudent(null);
    resetForm();
    fetchStudents();
  };

  const handleToggleStatus = async (student: Student) => {
    const newStatus = student.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("students")
      .update({ status: newStatus })
      .eq("id", student.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Student ${newStatus === "active" ? "activated" : "deactivated"}` });
      fetchStudents();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete student", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Student deleted" });
      fetchStudents();
    }
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      full_name: student.profile?.full_name || "",
      email: student.profile?.email || "",
      phone: student.profile?.phone || "",
      student_id: student.student_id,
      class_id: student.class_id || "",
      status: student.status || "active",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      student_id: generateStudentId(),
      class_id: "",
      status: "active",
    });
  };

  const resetAddForm = () => {
    setAddFormData({
      full_name: "",
      email: "",
      password: "",
      phone: "",
      class_id: "",
    });
  };

  const openResetPasswordDialog = (student: Student) => {
    setResetPasswordUser({ userId: student.user_id, name: student.profile?.full_name || "User" });
    setNewPassword("");
    setIsResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    setIsSubmitting(true);

    try {
      const response = await supabase.functions.invoke("reset-password", {
        body: {
          userId: resetPasswordUser.userId,
          newPassword: newPassword,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: "Success", description: "Password reset successfully" });
      setIsResetPasswordDialogOpen(false);
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reset password", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="Student Management" description="Manage all students in the system">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Students", value: students.length, color: "text-primary" },
          { label: "Active", value: students.filter(s => s.status === "active").length, color: "text-success" },
          { label: "Inactive", value: students.filter(s => s.status === "inactive").length, color: "text-destructive" },
          { label: "Unassigned", value: students.filter(s => !s.class_id).length, color: "text-warning" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or student ID..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAddDialogOpen(true)} className="hero-gradient text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No students found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono">{student.student_id}</TableCell>
                    <TableCell className="font-medium">{student.profile?.full_name || "-"}</TableCell>
                    <TableCell>{student.profile?.email || "-"}</TableCell>
                    <TableCell>
                      {student.class ? `${student.class.name}${student.class.section ? ` - ${student.class.section}` : ""}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === "active" ? "default" : "secondary"}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(student)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openResetPasswordDialog(student)} title="Reset Password">
                          <KeyRound className="w-4 h-4 text-warning" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleToggleStatus(student)}
                          title={student.status === "active" ? "Deactivate" : "Activate"}
                        >
                          {student.status === "active" ? 
                            <UserX className="w-4 h-4 text-destructive" /> : 
                            <UserCheck className="w-4 h-4 text-success" />
                          }
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-destructive"
                          onClick={() => handleDelete(student.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(o) => { 
        setIsAddDialogOpen(o); 
        if (!o) resetAddForm(); 
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Create a new student account. They will be able to sign in with these credentials.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={addFormData.full_name}
                  onChange={(e) => setAddFormData(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Student's full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="student@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={addFormData.password}
                  onChange={(e) => setAddFormData(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={addFormData.phone}
                  onChange={(e) => setAddFormData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Assign Class</Label>
                <Select value={addFormData.class_id} onValueChange={(v) => setAddFormData(p => ({ ...p, class_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No class</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.section ? ` - ${c.section}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="hero-gradient text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { 
        setIsDialogOpen(o); 
        if (!o) { setEditingStudent(null); resetForm(); } 
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Student ID *</Label>
                <Input
                  value={formData.student_id}
                  onChange={(e) => setFormData(p => ({ ...p, student_id: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formData.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign Class</Label>
                <Select value={formData.class_id} onValueChange={(v) => setFormData(p => ({ ...p, class_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No class</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.section ? ` - ${c.section}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="hero-gradient text-primary-foreground">
                Update Student
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={(o) => {
        setIsResetPasswordDialogOpen(o);
        if (!o) { setResetPasswordUser(null); setNewPassword(""); }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button 
                onClick={handleResetPassword} 
                disabled={!newPassword || newPassword.length < 6 || isSubmitting}
                className="hero-gradient text-primary-foreground"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting...</> : "Reset Password"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default StudentManagement;
