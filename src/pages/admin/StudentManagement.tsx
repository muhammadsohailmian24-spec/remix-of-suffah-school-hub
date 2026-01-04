import { useEffect, useState, useRef } from "react";
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
import { Search, Plus, Pencil, Trash2, UserCheck, UserX, Loader2, KeyRound, Upload, X, MoreHorizontal, FileDown, Mail } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { downloadAdmissionForm, AdmissionFormData } from "@/utils/generateAdmissionFormPdf";
interface Student {
  id: string;
  student_id: string;
  user_id: string;
  class_id: string | null;
  status: string;
  admission_date: string;
  father_name: string | null;
  father_phone: string | null;
  father_cnic: string | null;
  father_email: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  guardian_occupation: string | null;
  previous_school: string | null;
  profile?: {
    full_name: string;
    email: string;
    phone: string | null;
    photo_url: string | null;
    date_of_birth?: string | null;
    address?: string | null;
    gender?: string | null;
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
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

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
    password: "",
    phone: "",
    student_id: "",
    class_id: "",
    date_of_birth: "",
    father_name: "",
    father_phone: "",
    father_cnic: "",
    father_email: "",
    mother_name: "",
    mother_phone: "",
    occupation: "",
    address: "",
    previous_school: "",
  });

  const [lastCreatedStudent, setLastCreatedStudent] = useState<AdmissionFormData | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  
  const [lastStudentId, setLastStudentId] = useState<string | null>(null);

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

    await Promise.all([fetchStudents(), fetchClasses(), fetchLastStudentId()]);
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
      .select("user_id, full_name, email, phone, photo_url, date_of_birth, address, gender")
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

  const fetchLastStudentId = async () => {
    const { data } = await supabase
      .from("students")
      .select("student_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data?.student_id) {
      setLastStudentId(data.student_id);
    }
  };

  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `STU${year}${random}`;
  };

  const uploadPhoto = async (file: File, studentId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${studentId}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }
    
    const { data } = supabase.storage.from('student-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Create student account
      const response = await supabase.functions.invoke("create-user", {
        body: {
          password: addFormData.password,
          fullName: addFormData.full_name,
          phone: addFormData.phone || undefined,
          role: "student",
          roleSpecificData: {
            student_id: addFormData.student_id || undefined,
            class_id: addFormData.class_id && addFormData.class_id !== "none" ? addFormData.class_id : null,
          },
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      const studentUserId = response.data?.user?.id;
      const finalStudentId = response.data?.student_id || addFormData.student_id;
      let photoUrl: string | null = null;

      // Upload photo if provided
      if (photoFile && studentUserId) {
        photoUrl = await uploadPhoto(photoFile, finalStudentId || studentUserId);
        if (photoUrl) {
          await supabase
            .from("profiles")
            .update({ 
              photo_url: photoUrl,
              date_of_birth: addFormData.date_of_birth || null,
              address: addFormData.address || null,
            })
            .eq("user_id", studentUserId);
        }
      } else if (studentUserId) {
        // Update profile with DOB and address even without photo
        await supabase
          .from("profiles")
          .update({ 
            date_of_birth: addFormData.date_of_birth || null,
            address: addFormData.address || null,
          })
          .eq("user_id", studentUserId);
      }

      // Update student record with parent info and previous_school (stored in students table, no parent account)
      if (studentUserId) {
        await supabase
          .from("students")
          .update({ 
            previous_school: addFormData.previous_school || null,
            father_name: addFormData.father_name || null,
            father_phone: addFormData.father_phone || null,
            father_cnic: addFormData.father_cnic || null,
            father_email: addFormData.father_email || null,
            mother_name: addFormData.mother_name || null,
            mother_phone: addFormData.mother_phone || null,
            guardian_occupation: addFormData.occupation || null,
          })
          .eq("user_id", studentUserId);
      }

      // Get class info for admission form
      let className = "";
      let section = "";
      if (addFormData.class_id && addFormData.class_id !== "none") {
        const classInfo = classes.find(c => c.id === addFormData.class_id);
        if (classInfo) {
          className = classInfo.name;
          section = classInfo.section || "";
        }
      }

      // Prepare data for admission form download
      const admissionData: AdmissionFormData = {
        studentName: addFormData.full_name,
        studentId: finalStudentId,
        dateOfBirth: addFormData.date_of_birth,
        phone: addFormData.phone,
        className,
        section,
        admissionDate: new Date().toLocaleDateString(),
        address: addFormData.address,
        previousSchool: addFormData.previous_school,
        fatherName: addFormData.father_name,
        fatherPhone: addFormData.father_phone,
        fatherCnic: addFormData.father_cnic,
        fatherEmail: addFormData.father_email,
        motherName: addFormData.mother_name,
        motherPhone: addFormData.mother_phone,
        occupation: addFormData.occupation,
        photoUrl: photoUrl || undefined,
      };

      setLastCreatedStudent(admissionData);
      toast({ title: "Success", description: "Student created successfully" });
      setIsAddDialogOpen(false);
      setShowSuccessDialog(true);
      resetAddForm();
      fetchStudents();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create student", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadAdmissionForm = async (student: Student) => {
    const classInfo = student.class;
    const admissionData: AdmissionFormData = {
      studentName: student.profile?.full_name || "",
      studentId: student.student_id,
      dateOfBirth: student.profile?.date_of_birth || "",
      gender: student.profile?.gender || undefined,
      phone: student.profile?.phone || undefined,
      className: classInfo?.name || "",
      section: classInfo?.section || undefined,
      admissionDate: student.admission_date,
      address: student.profile?.address || undefined,
      previousSchool: student.previous_school || undefined,
      fatherName: student.father_name || "",
      fatherPhone: student.father_phone || "",
      fatherCnic: student.father_cnic || "",
      fatherEmail: student.father_email || undefined,
      motherName: student.mother_name || undefined,
      motherPhone: student.mother_phone || undefined,
      occupation: student.guardian_occupation || undefined,
      photoUrl: student.profile?.photo_url || undefined,
    };
    await downloadAdmissionForm(admissionData);
    toast({ title: "Downloaded", description: "Admission form downloaded successfully" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingStudent) {
        const { error: studentError } = await supabase
          .from("students")
          .update({
            student_id: formData.student_id,
            class_id: formData.class_id && formData.class_id !== "none" ? formData.class_id : null,
            status: formData.status,
          })
          .eq("id", editingStudent.id);

        if (studentError) {
          toast({ title: "Error", description: "Failed to update student", variant: "destructive" });
          return;
        }

        // Upload photo if changed
        let photoUrl = editingStudent.profile?.photo_url || null;
        if (editPhotoFile) {
          const newPhotoUrl = await uploadPhoto(editPhotoFile, editingStudent.student_id);
          if (newPhotoUrl) {
            photoUrl = newPhotoUrl;
          }
        }

        await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            phone: formData.phone || null,
            photo_url: photoUrl,
          })
          .eq("user_id", editingStudent.user_id);

        toast({ title: "Success", description: "Student updated successfully" });
      }

      setIsDialogOpen(false);
      setEditingStudent(null);
      resetForm();
      fetchStudents();
    } finally {
      setIsSubmitting(false);
    }
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
    setEditPhotoPreview(student.profile?.photo_url || null);
    setEditPhotoFile(null);
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
      password: "",
      phone: "",
      student_id: "",
      class_id: "",
      date_of_birth: "",
      father_name: "",
      father_phone: "",
      father_cnic: "",
      father_email: "",
      mother_name: "",
      mother_phone: "",
      occupation: "",
      address: "",
      previous_school: "",
    });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isEdit) {
        setEditPhotoFile(file);
        setEditPhotoPreview(URL.createObjectURL(file));
      } else {
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
      }
    }
  };

  const clearPhoto = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditPhotoFile(null);
      setEditPhotoPreview(null);
    } else {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  };

  const openResetPasswordDialog = (student: Student) => {
    setResetPasswordUser({ userId: student.user_id, name: student.profile?.full_name || "User" });
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
                  <TableHead>Photo</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={student.profile?.photo_url || undefined} alt={student.profile?.full_name} />
                        <AvatarFallback>{student.profile?.full_name?.charAt(0) || "S"}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-mono font-bold">{student.student_id}</TableCell>
                    <TableCell className="font-medium">{student.profile?.full_name || "-"}</TableCell>
                    <TableCell>{student.profile?.phone || "-"}</TableCell>
                    <TableCell>
                      {student.class ? `${student.class.name}${student.class.section ? ` - ${student.class.section}` : ""}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === "active" ? "default" : "secondary"}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => openEditDialog(student)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Student
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadAdmissionForm(student)}>
                            <FileDown className="w-4 h-4 mr-2" />
                            Download Admission Form
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openResetPasswordDialog(student)}>
                            <KeyRound className="w-4 h-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(student)}>
                            {student.status === "active" ? (
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
                          <DropdownMenuItem 
                            onClick={() => handleDelete(student.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            <DialogDescription>
              Create a new student account. Students will login using their Student ID and password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Student Photo */}
              <div className="space-y-2 col-span-2">
                <Label>Student Photo</Label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={photoPreview} />
                        <AvatarFallback>Photo</AvatarFallback>
                      </Avatar>
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 w-6 h-6"
                        onClick={() => clearPhoto(false)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="w-20 h-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => addPhotoInputRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">Upload</span>
                    </div>
                  )}
                  <input
                    ref={addPhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoChange(e, false)}
                  />
                  <p className="text-xs text-muted-foreground">Upload passport-size photo</p>
                </div>
              </div>

              {/* Student Info Section */}
              <div className="col-span-2 border-b pb-1 pt-2">
                <p className="text-sm font-semibold text-muted-foreground">Student Information</p>
              </div>
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
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={addFormData.date_of_birth}
                  onChange={(e) => setAddFormData(p => ({ ...p, date_of_birth: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Student ID *</Label>
                <Input
                  value={addFormData.student_id}
                  onChange={(e) => setAddFormData(p => ({ ...p, student_id: e.target.value.toUpperCase() }))}
                  placeholder="e.g., STU2025001"
                  required
                />
                {lastStudentId && (
                  <p className="text-xs text-primary font-medium">Last used ID: {lastStudentId}</p>
                )}
                <p className="text-xs text-muted-foreground">Used for login</p>
              </div>
              <div className="space-y-2">
                <Label>Student Password *</Label>
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
                  placeholder="+92 300 1234567"
                />
              </div>
              <div className="space-y-2">
                <Label>Assign Class</Label>
                <Select value={addFormData.class_id} onValueChange={(v) => setAddFormData(p => ({ ...p, class_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No class</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.section ? ` - ${c.section}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Father/Guardian Section */}
              <div className="col-span-2 border-b pb-1 pt-2">
                <p className="text-sm font-semibold text-muted-foreground">Father/Guardian Information</p>
              </div>
              <div className="space-y-2">
                <Label>Father's Name *</Label>
                <Input
                  value={addFormData.father_name}
                  onChange={(e) => setAddFormData(p => ({ ...p, father_name: e.target.value }))}
                  placeholder="Father's full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Father's Phone *</Label>
                <Input
                  value={addFormData.father_phone}
                  onChange={(e) => setAddFormData(p => ({ ...p, father_phone: e.target.value }))}
                  placeholder="+92 300 1234567"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Father's CNIC *</Label>
                <Input
                  value={addFormData.father_cnic}
                  onChange={(e) => setAddFormData(p => ({ ...p, father_cnic: e.target.value }))}
                  placeholder="12345-1234567-1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Father's Email</Label>
                <Input
                  type="email"
                  value={addFormData.father_email}
                  onChange={(e) => setAddFormData(p => ({ ...p, father_email: e.target.value }))}
                  placeholder="email@example.com (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Mother's Name</Label>
                <Input
                  value={addFormData.mother_name}
                  onChange={(e) => setAddFormData(p => ({ ...p, mother_name: e.target.value }))}
                  placeholder="Mother's full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Mother's Phone</Label>
                <Input
                  value={addFormData.mother_phone}
                  onChange={(e) => setAddFormData(p => ({ ...p, mother_phone: e.target.value }))}
                  placeholder="+92 300 1234567"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Guardian's Occupation</Label>
                <Input
                  value={addFormData.occupation}
                  onChange={(e) => setAddFormData(p => ({ ...p, occupation: e.target.value }))}
                  placeholder="e.g., Teacher, Engineer, etc."
                />
              </div>

              {/* Address & Previous Education */}
              <div className="col-span-2 border-b pb-1 pt-2">
                <p className="text-sm font-semibold text-muted-foreground">Address & Previous Education</p>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address *</Label>
                <Input
                  value={addFormData.address}
                  onChange={(e) => setAddFormData(p => ({ ...p, address: e.target.value }))}
                  placeholder="Full address"
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Previous School</Label>
                <Input
                  value={addFormData.previous_school}
                  onChange={(e) => setAddFormData(p => ({ ...p, previous_school: e.target.value }))}
                  placeholder="Name of previous school (if any)"
                />
              </div>
            </div>
            <div className="bg-accent/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Student Login:</strong> ID: <code className="bg-background px-1 rounded">{addFormData.student_id || "..."}</code> + Password<br />
                <span className="text-xs">Parent account can be created later from Parent Management</span>
              </p>
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
                    <SelectItem value="none">No class</SelectItem>
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
              <div className="space-y-2 col-span-2">
                <Label>Student Photo</Label>
                <div className="flex items-center gap-4">
                  {editPhotoPreview ? (
                    <div className="relative">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={editPhotoPreview} />
                        <AvatarFallback>Photo</AvatarFallback>
                      </Avatar>
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 w-6 h-6"
                        onClick={() => clearPhoto(true)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="w-20 h-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => editPhotoInputRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">Upload</span>
                    </div>
                  )}
                  <input
                    ref={editPhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoChange(e, true)}
                  />
                  <p className="text-xs text-muted-foreground">Update student photo</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="hero-gradient text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</> : "Update Student"}
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
                <Label htmlFor="send-email" className="text-sm font-normal cursor-pointer">
                  Send email with new credentials
                </Label>
              </div>
              <Switch
                id="send-email"
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

      {/* Success Dialog with Download Option */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-success flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Student Created Successfully
            </DialogTitle>
            <DialogDescription>
              The student account has been created. You can now download the admission form.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {lastCreatedStudent && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Name:</strong> {lastCreatedStudent.studentName}</p>
                <p><strong>Student ID:</strong> {lastCreatedStudent.studentId}</p>
                <p><strong>Father's Name:</strong> {lastCreatedStudent.fatherName}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSuccessDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={async () => {
                if (lastCreatedStudent) {
                  await downloadAdmissionForm(lastCreatedStudent);
                  toast({ title: "Downloaded", description: "Admission form downloaded" });
                }
              }}
              className="hero-gradient text-primary-foreground"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Download Admission Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default StudentManagement;
