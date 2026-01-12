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
import { Search, Plus, Pencil, Trash2, UserCheck, UserX, Loader2, KeyRound, Mail, CreditCard, Eye, MoreHorizontal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadTeacherCard, TeacherCardData, generateTeacherCardPdf } from "@/utils/generateTeacherCardPdf";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

interface Teacher {
  id: string;
  employee_id: string;
  user_id: string;
  department_id: string | null;
  qualification: string | null;
  specialization: string | null;
  status: string;
  joining_date: string;
  profile?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
  department?: {
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
}

const TeacherManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ userId: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewTeacher, setPreviewTeacher] = useState<Teacher | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    employee_id: "",
    department_id: "",
    qualification: "",
    specialization: "",
    status: "active",
  });

  const [addFormData, setAddFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    department_id: "",
    qualification: "",
    specialization: "",
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

    await Promise.all([fetchTeachers(), fetchDepartments()]);
    setLoading(false);
  };

  const fetchTeachers = async () => {
    const { data: teachersData, error } = await supabase
      .from("teachers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching teachers:", error);
      return;
    }

    const userIds = teachersData?.map(t => t.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone")
      .in("user_id", userIds);

    const deptIds = teachersData?.filter(t => t.department_id).map(t => t.department_id) || [];
    const { data: depts } = await supabase
      .from("departments")
      .select("id, name")
      .in("id", deptIds);

    const enrichedTeachers = teachersData?.map(teacher => ({
      ...teacher,
      profile: profiles?.find(p => p.user_id === teacher.user_id),
      department: depts?.find(d => d.id === teacher.department_id),
    })) || [];

    setTeachers(enrichedTeachers);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("id, name").order("name");
    setDepartments(data || []);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
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
          role: "teacher",
          roleSpecificData: {
            department_id: addFormData.department_id && addFormData.department_id !== "none" ? addFormData.department_id : null,
            qualification: addFormData.qualification || null,
            specialization: addFormData.specialization || null,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: "Success", description: "Teacher account created successfully" });
      setIsAddDialogOpen(false);
      resetAddForm();
      fetchTeachers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create teacher", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTeacher) {
      const { error: teacherError } = await supabase
        .from("teachers")
        .update({
          employee_id: formData.employee_id,
          department_id: formData.department_id && formData.department_id !== "none" ? formData.department_id : null,
          qualification: formData.qualification || null,
          specialization: formData.specialization || null,
          status: formData.status,
        })
        .eq("id", editingTeacher.id);

      if (teacherError) {
        toast({ title: "Error", description: "Failed to update teacher", variant: "destructive" });
        return;
      }

      await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
        })
        .eq("user_id", editingTeacher.user_id);

      toast({ title: "Success", description: "Teacher updated successfully" });
    }

    setIsDialogOpen(false);
    setEditingTeacher(null);
    resetForm();
    fetchTeachers();
  };

  const handleToggleStatus = async (teacher: Teacher) => {
    const newStatus = teacher.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("teachers")
      .update({ status: newStatus })
      .eq("id", teacher.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Teacher ${newStatus === "active" ? "activated" : "deactivated"}` });
      fetchTeachers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this teacher?")) return;

    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete teacher", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Teacher deleted" });
      fetchTeachers();
    }
  };

  const openEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      full_name: teacher.profile?.full_name || "",
      email: teacher.profile?.email || "",
      phone: teacher.profile?.phone || "",
      employee_id: teacher.employee_id,
      department_id: teacher.department_id || "",
      qualification: teacher.qualification || "",
      specialization: teacher.specialization || "",
      status: teacher.status || "active",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      employee_id: "",
      department_id: "",
      qualification: "",
      specialization: "",
      status: "active",
    });
  };

  const resetAddForm = () => {
    setAddFormData({
      full_name: "",
      email: "",
      password: "",
      phone: "",
      department_id: "",
      qualification: "",
      specialization: "",
    });
  };

  const openResetPasswordDialog = (teacher: Teacher) => {
    setResetPasswordUser({ userId: teacher.user_id, name: teacher.profile?.full_name || "User" });
    setNewPassword("");
    setSendEmailNotification(true);
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
          sendEmail: sendEmailNotification,
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

  const getTeacherCardData = (teacher: Teacher): TeacherCardData => ({
    employeeId: teacher.employee_id,
    teacherName: teacher.profile?.full_name || "Unknown",
    department: teacher.department?.name,
    qualification: teacher.qualification || undefined,
    specialization: teacher.specialization || undefined,
    phone: teacher.profile?.phone || undefined,
    email: teacher.profile?.email || undefined,
    joiningDate: teacher.joining_date,
  });

  const handlePreviewTeacherCard = (teacher: Teacher) => {
    setPreviewTeacher(teacher);
    setIsPreviewOpen(true);
  };

  const handleDownloadTeacherCard = async (teacher: Teacher) => {
    await downloadTeacherCard(getTeacherCardData(teacher));
    toast({ title: "Downloaded", description: "Teacher ID card downloaded successfully" });
  };

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = t.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="Teacher Management" description="Manage all teachers in the system">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Teachers", value: teachers.length, color: "text-primary" },
          { label: "Active", value: teachers.filter(t => t.status === "active").length, color: "text-success" },
          { label: "Inactive", value: teachers.filter(t => t.status === "inactive").length, color: "text-destructive" },
          { label: "Departments", value: departments.length, color: "text-info" },
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
                placeholder="Search by name or employee ID..."
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
              Add Teacher
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
          ) : filteredTeachers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No teachers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-mono">{teacher.employee_id}</TableCell>
                    <TableCell className="font-medium">{teacher.profile?.full_name || "-"}</TableCell>
                    <TableCell>{teacher.profile?.email || "-"}</TableCell>
                    <TableCell>{teacher.department?.name || "-"}</TableCell>
                    <TableCell>{teacher.specialization || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={teacher.status === "active" ? "default" : "secondary"}>
                        {teacher.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(teacher)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreviewTeacherCard(teacher)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview ID Card
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadTeacherCard(teacher)}>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Download ID Card
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openResetPasswordDialog(teacher)}>
                              <KeyRound className="w-4 h-4 mr-2 text-warning" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(teacher)}>
                              {teacher.status === "active" ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2 text-destructive" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2 text-success" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(teacher.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Teacher Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(o) => { 
        setIsAddDialogOpen(o); 
        if (!o) resetAddForm(); 
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>Create a new teacher account. They will be able to sign in with these credentials.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTeacher} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={addFormData.full_name}
                  onChange={(e) => setAddFormData(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Teacher's full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="teacher@example.com"
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
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={addFormData.department_id} onValueChange={(v) => setAddFormData(p => ({ ...p, department_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qualification</Label>
                <Input
                  value={addFormData.qualification}
                  onChange={(e) => setAddFormData(p => ({ ...p, qualification: e.target.value }))}
                  placeholder="e.g., M.Ed, Ph.D"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Specialization</Label>
                <Input
                  value={addFormData.specialization}
                  onChange={(e) => setAddFormData(p => ({ ...p, specialization: e.target.value }))}
                  placeholder="e.g., Mathematics, Physics"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="hero-gradient text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Teacher"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { 
        setIsDialogOpen(o); 
        if (!o) { setEditingTeacher(null); resetForm(); } 
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>Update teacher information</DialogDescription>
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
                <Label>Employee ID *</Label>
                <Input
                  value={formData.employee_id}
                  onChange={(e) => setFormData(p => ({ ...p, employee_id: e.target.value }))}
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
                <Label>Department</Label>
                <Select value={formData.department_id} onValueChange={(v) => setFormData(p => ({ ...p, department_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qualification</Label>
                <Input
                  value={formData.qualification}
                  onChange={(e) => setFormData(p => ({ ...p, qualification: e.target.value }))}
                  placeholder="e.g., M.Ed, Ph.D"
                />
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={formData.specialization}
                  onChange={(e) => setFormData(p => ({ ...p, specialization: e.target.value }))}
                  placeholder="e.g., Mathematics"
                />
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
                Update Teacher
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
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="send-email-teacher" className="text-sm font-normal cursor-pointer">
                  Send email with new credentials
                </Label>
              </div>
              <Switch
                id="send-email-teacher"
                checked={sendEmailNotification}
                onCheckedChange={setSendEmailNotification}
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

      {/* ID Card Preview Dialog */}
      {previewTeacher && (
        <DocumentPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          title={`Teacher ID Card - ${previewTeacher.profile?.full_name || "Unknown"}`}
          generatePdf={() => generateTeacherCardPdf(getTeacherCardData(previewTeacher))}
          filename={`TeacherCard-${previewTeacher.employee_id}.pdf`}
        />
      )}
    </AdminLayout>
  );
};

export default TeacherManagement;
