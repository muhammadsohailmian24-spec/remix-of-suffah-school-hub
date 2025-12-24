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
import { Search, Plus, Pencil, Trash2, Link2, Unlink, Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";

interface Parent {
  id: string;
  user_id: string;
  occupation: string | null;
  relationship: string | null;
  profile?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
  linkedStudents?: {
    student_id: string;
    full_name: string;
  }[];
}

interface Student {
  id: string;
  student_id: string;
  profile?: {
    full_name: string;
  };
}

const ParentManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [linkingParent, setLinkingParent] = useState<Parent | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ userId: string; name: string } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    occupation: "",
    relationship: "parent",
  });

  const [addFormData, setAddFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    occupation: "",
    relationship: "parent",
    linked_student_id: "",
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

    await Promise.all([fetchParents(), fetchStudents()]);
    setLoading(false);
  };

  const fetchParents = async () => {
    const { data: parentsData, error } = await supabase
      .from("parents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching parents:", error);
      return;
    }

    const userIds = parentsData?.map(p => p.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone")
      .in("user_id", userIds);

    const parentIds = parentsData?.map(p => p.id) || [];
    const { data: links } = await supabase
      .from("student_parents")
      .select("parent_id, student_id")
      .in("parent_id", parentIds);

    const linkedStudentIds = links?.map(l => l.student_id) || [];
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_id, user_id")
      .in("id", linkedStudentIds);

    const studentUserIds = studentsData?.map(s => s.user_id) || [];
    const { data: studentProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", studentUserIds);

    const enrichedParents = parentsData?.map(parent => {
      const parentLinks = links?.filter(l => l.parent_id === parent.id) || [];
      const linkedStudents = parentLinks.map(link => {
        const student = studentsData?.find(s => s.id === link.student_id);
        const profile = studentProfiles?.find(p => p.user_id === student?.user_id);
        return {
          student_id: student?.student_id || "",
          full_name: profile?.full_name || "Unknown",
        };
      });

      return {
        ...parent,
        profile: profiles?.find(p => p.user_id === parent.user_id),
        linkedStudents,
      };
    }) || [];

    setParents(enrichedParents);
  };

  const fetchStudents = async () => {
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_id, user_id")
      .order("student_id");

    const userIds = studentsData?.map(s => s.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const enriched = studentsData?.map(s => ({
      ...s,
      profile: profiles?.find(p => p.user_id === s.user_id),
    })) || [];

    setStudents(enriched);
  };

  const handleAddParent = async (e: React.FormEvent) => {
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
          role: "parent",
          roleSpecificData: {
            occupation: addFormData.occupation || null,
            relationship: addFormData.relationship,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // If a student was selected, link them
      if (addFormData.linked_student_id) {
        // Need to get the new parent ID
        await fetchParents();
        
        // Find the newly created parent by email
        const { data: newParentData } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", addFormData.email)
          .single();

        if (newParentData) {
          const { data: parentRecord } = await supabase
            .from("parents")
            .select("id")
            .eq("user_id", newParentData.user_id)
            .single();

          if (parentRecord) {
            await supabase
              .from("student_parents")
              .insert({
                parent_id: parentRecord.id,
                student_id: addFormData.linked_student_id,
                is_primary: true,
              });
          }
        }
      }

      toast({ title: "Success", description: "Parent account created successfully" });
      setIsAddDialogOpen(false);
      resetAddForm();
      fetchParents();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create parent", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingParent) {
      const { error: parentError } = await supabase
        .from("parents")
        .update({
          occupation: formData.occupation || null,
          relationship: formData.relationship,
        })
        .eq("id", editingParent.id);

      if (parentError) {
        toast({ title: "Error", description: "Failed to update parent", variant: "destructive" });
        return;
      }

      await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
        })
        .eq("user_id", editingParent.user_id);

      toast({ title: "Success", description: "Parent updated successfully" });
    }

    setIsDialogOpen(false);
    setEditingParent(null);
    resetForm();
    fetchParents();
  };

  const handleLinkStudent = async () => {
    if (!linkingParent || !selectedStudentId) return;

    const { error } = await supabase
      .from("student_parents")
      .insert({
        parent_id: linkingParent.id,
        student_id: selectedStudentId,
        is_primary: linkingParent.linkedStudents?.length === 0,
      });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Error", description: "Student already linked to this parent", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to link student", variant: "destructive" });
      }
    } else {
      toast({ title: "Success", description: "Student linked successfully" });
      fetchParents();
    }

    setIsLinkDialogOpen(false);
    setLinkingParent(null);
    setSelectedStudentId("");
  };

  const handleUnlinkStudent = async (parentId: string, studentId: string) => {
    const student = students.find(s => s.student_id === studentId);
    if (!student) return;

    const { error } = await supabase
      .from("student_parents")
      .delete()
      .eq("parent_id", parentId)
      .eq("student_id", student.id);

    if (error) {
      toast({ title: "Error", description: "Failed to unlink student", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Student unlinked" });
      fetchParents();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this parent?")) return;

    await supabase.from("student_parents").delete().eq("parent_id", id);
    
    const { error } = await supabase.from("parents").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete parent", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Parent deleted" });
      fetchParents();
    }
  };

  const openEditDialog = (parent: Parent) => {
    setEditingParent(parent);
    setFormData({
      full_name: parent.profile?.full_name || "",
      email: parent.profile?.email || "",
      phone: parent.profile?.phone || "",
      occupation: parent.occupation || "",
      relationship: parent.relationship || "parent",
    });
    setIsDialogOpen(true);
  };

  const openLinkDialog = (parent: Parent) => {
    setLinkingParent(parent);
    setSelectedStudentId("");
    setIsLinkDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      occupation: "",
      relationship: "parent",
    });
  };

  const resetAddForm = () => {
    setAddFormData({
      full_name: "",
      email: "",
      password: "",
      phone: "",
      occupation: "",
      relationship: "parent",
      linked_student_id: "",
    });
  };

  const openResetPasswordDialog = (parent: Parent) => {
    setResetPasswordUser({ userId: parent.user_id, name: parent.profile?.full_name || "User" });
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

  const filteredParents = parents.filter(p => 
    p.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Parent Management" description="Manage parents and their linked students">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Parents", value: parents.length, color: "text-primary" },
          { label: "With Linked Students", value: parents.filter(p => p.linkedStudents && p.linkedStudents.length > 0).length, color: "text-success" },
          { label: "No Students Linked", value: parents.filter(p => !p.linkedStudents || p.linkedStudents.length === 0).length, color: "text-warning" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Add */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="hero-gradient text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Parent
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
          ) : filteredParents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No parents found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Linked Students</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.map((parent) => (
                  <TableRow key={parent.id}>
                    <TableCell className="font-medium">{parent.profile?.full_name || "-"}</TableCell>
                    <TableCell>{parent.profile?.email || "-"}</TableCell>
                    <TableCell>{parent.profile?.phone || "-"}</TableCell>
                    <TableCell className="capitalize">{parent.relationship || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {parent.linkedStudents?.length ? parent.linkedStudents.map((s, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {s.full_name}
                            <button 
                              onClick={() => handleUnlinkStudent(parent.id, s.student_id)}
                              className="hover:text-destructive"
                            >
                              <Unlink className="w-3 h-3" />
                            </button>
                          </Badge>
                        )) : <span className="text-muted-foreground text-sm">None</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openLinkDialog(parent)} title="Link Student">
                          <Link2 className="w-4 h-4 text-primary" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(parent)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openResetPasswordDialog(parent)} title="Reset Password">
                          <KeyRound className="w-4 h-4 text-warning" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(parent.id)} title="Delete">
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

      {/* Add Parent Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(o) => { 
        setIsAddDialogOpen(o); 
        if (!o) resetAddForm(); 
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Parent</DialogTitle>
            <DialogDescription>Create a new parent account. They will be able to sign in with these credentials.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddParent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={addFormData.full_name}
                  onChange={(e) => setAddFormData(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Parent's full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="parent@example.com"
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
                <Label>Occupation</Label>
                <Input
                  value={addFormData.occupation}
                  onChange={(e) => setAddFormData(p => ({ ...p, occupation: e.target.value }))}
                  placeholder="e.g., Engineer, Doctor"
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select value={addFormData.relationship} onValueChange={(v) => setAddFormData(p => ({ ...p, relationship: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Link to Student (optional)</Label>
                <Select value={addFormData.linked_student_id} onValueChange={(v) => setAddFormData(p => ({ ...p, linked_student_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a student to link" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No student</SelectItem>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.profile?.full_name} ({s.student_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="hero-gradient text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Parent"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { 
        setIsDialogOpen(o); 
        if (!o) { setEditingParent(null); resetForm(); } 
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Parent</DialogTitle>
            <DialogDescription>Update parent information</DialogDescription>
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
                <Label>Occupation</Label>
                <Input
                  value={formData.occupation}
                  onChange={(e) => setFormData(p => ({ ...p, occupation: e.target.value }))}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Relationship</Label>
                <Select value={formData.relationship} onValueChange={(v) => setFormData(p => ({ ...p, relationship: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="hero-gradient text-primary-foreground">
                Update Parent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Student Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Student to Parent</DialogTitle>
            <DialogDescription>
              Select a student to link to {linkingParent?.profile?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.profile?.full_name} ({s.student_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleLinkStudent} disabled={!selectedStudentId} className="hero-gradient text-primary-foreground">
                Link Student
              </Button>
            </DialogFooter>
          </div>
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

export default ParentManagement;
