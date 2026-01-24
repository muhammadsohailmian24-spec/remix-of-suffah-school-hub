import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Users, Search, CreditCard, User, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

interface Family {
  id: string;
  family_code: string;
  billing_address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  primary_parent_id: string | null;
  student_count?: number;
  students?: { id: string; student_id: string; profiles: { full_name: string } }[];
}

interface Student {
  id: string;
  student_id: string;
  profiles: { full_name: string };
  class_id: string | null;
  classes?: { name: string; section: string } | null;
}

const Families = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<Family[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    family_code: "",
    billing_address: "",
    phone: "",
    email: "",
    student_ids: [] as string[],
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

    await Promise.all([fetchFamilies(), fetchStudents()]);
    setLoading(false);
  };

  const fetchFamilies = async () => {
    const { data, error } = await supabase
      .from("families")
      .select("*")
      .order("family_code");
    
    if (error) {
      toast.error("Failed to load families");
      return;
    }

    // Fetch student counts for each family
    const familiesWithCounts = await Promise.all((data || []).map(async (family) => {
      const { count } = await supabase
        .from("student_families")
        .select("*", { count: "exact", head: true })
        .eq("family_id", family.id);
      
      return { ...family, student_count: count || 0 };
    }));

    setFamilies(familiesWithCounts);
  };

  const fetchStudents = async () => {
    // Fetch students separately from classes to avoid FK ambiguity
    const { data, error } = await supabase
      .from("students")
      .select("id, student_id, user_id, class_id")
      .eq("status", "active");
    
    if (error) {
      toast.error("Failed to load students");
      return;
    }

    // Fetch all classes
    const classIds = [...new Set((data || []).map(s => s.class_id).filter(Boolean))];
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, name, section")
      .in("id", classIds);

    // Fetch profiles for students
    const studentsWithProfiles = await Promise.all((data || []).map(async (student) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", student.user_id)
        .single();
      
      const classInfo = classesData?.find(c => c.id === student.class_id);
      
      return { 
        ...student, 
        profiles: profile || { full_name: "Unknown" },
        classes: classInfo ? { name: classInfo.name, section: classInfo.section || "" } : null
      };
    }));

    setStudents(studentsWithProfiles as Student[]);
  };

  const generateFamilyCode = () => {
    const prefix = "FAM";
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
  };

  const handleAddFamily = async () => {
    if (!formData.family_code) {
      toast.error("Family code is required");
      return;
    }

    setSaving(true);
    
    // Create family
    const { data: familyData, error: familyError } = await supabase
      .from("families")
      .insert({
        family_code: formData.family_code,
        billing_address: formData.billing_address || null,
        phone: formData.phone || null,
        email: formData.email || null,
      })
      .select()
      .single();

    if (familyError) {
      setSaving(false);
      toast.error("Failed to create family");
      return;
    }

    // Link students to family
    if (formData.student_ids.length > 0) {
      const studentFamilyLinks = formData.student_ids.map(studentId => ({
        student_id: studentId,
        family_id: familyData.id,
      }));

      const { error: linkError } = await supabase
        .from("student_families")
        .insert(studentFamilyLinks);

      if (linkError) {
        console.error("Failed to link students:", linkError);
      }
    }

    setSaving(false);
    toast.success("Family created successfully");
    setAddDialogOpen(false);
    resetForm();
    fetchFamilies();
  };

  const handleDeleteFamily = async (id: string) => {
    if (!confirm("Are you sure you want to delete this family? This will unlink all students.")) return;
    
    const { error } = await supabase.from("families").delete().eq("id", id);
    
    if (error) {
      toast.error("Failed to delete family");
      return;
    }

    toast.success("Family deleted");
    fetchFamilies();
  };

  const handleViewFamily = async (family: Family) => {
    // Fetch students linked to this family
    const { data } = await supabase
      .from("student_families")
      .select("student_id")
      .eq("family_id", family.id);

    if (data) {
      const studentIds = data.map(sf => sf.student_id);
      const linkedStudents = students.filter(s => studentIds.includes(s.id));
      setSelectedFamily({ ...family, students: linkedStudents as any });
    } else {
      setSelectedFamily(family);
    }
    
    setViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      family_code: generateFamilyCode(),
      billing_address: "",
      phone: "",
      email: "",
      student_ids: [],
    });
  };

  const toggleStudentSelection = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      student_ids: prev.student_ids.includes(studentId)
        ? prev.student_ids.filter(id => id !== studentId)
        : [...prev.student_ids, studentId]
    }));
  };

  // Filter families
  const filteredFamilies = families.filter(family =>
    family.family_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    family.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    family.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout title="Families" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Family Management" description="Manage family accounts for consolidated billing">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Families</p>
                <p className="text-2xl font-bold">{families.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center">
                <User className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Linked Students</p>
                <p className="text-2xl font-bold">
                  {families.reduce((sum, f) => sum + (f.student_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Students/Family</p>
                <p className="text-2xl font-bold">
                  {families.length > 0 
                    ? (families.reduce((sum, f) => sum + (f.student_count || 0), 0) / families.length).toFixed(1)
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={() => { resetForm(); setAddDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Family
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Families Table */}
      <Card>
        <CardHeader>
          <CardTitle>Family Accounts</CardTitle>
          <CardDescription>{filteredFamilies.length} family account(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family Code</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Address</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFamilies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No families found. Create a family to group students for consolidated billing.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFamilies.map((family) => (
                  <TableRow key={family.id}>
                    <TableCell className="font-medium">{family.family_code}</TableCell>
                    <TableCell>{family.phone || "-"}</TableCell>
                    <TableCell>{family.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{family.student_count || 0} student(s)</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {family.billing_address || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewFamily(family)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFamily(family.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Family Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Family Account</DialogTitle>
            <DialogDescription>Group students under one family for consolidated billing</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Family Code *</Label>
                <Input
                  value={formData.family_code}
                  onChange={(e) => setFormData({ ...formData, family_code: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="Family contact number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Family email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label>Billing Address</Label>
              <Input
                placeholder="Address for fee bills/receipts"
                value={formData.billing_address}
                onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
              />
            </div>

            <div>
              <Label>Link Students</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select students to add to this family ({formData.student_ids.length} selected)
              </p>
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {students.map(student => (
                  <div
                    key={student.id}
                    className={`p-3 border-b last:border-0 cursor-pointer hover:bg-accent transition-colors ${
                      formData.student_ids.includes(student.id) ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => toggleStudentSelection(student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{student.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.student_id} • {student.classes?.name || "No class"} {student.classes?.section || ""}
                        </p>
                      </div>
                      {formData.student_ids.includes(student.id) && (
                        <Badge>Selected</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFamily} disabled={saving}>
              {saving ? "Creating..." : "Create Family"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Family Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Family Details</DialogTitle>
            <DialogDescription>{selectedFamily?.family_code}</DialogDescription>
          </DialogHeader>
          
          {selectedFamily && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedFamily.phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedFamily.email || "-"}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Billing Address</Label>
                <p className="font-medium">{selectedFamily.billing_address || "-"}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Linked Students</Label>
                {selectedFamily.students && selectedFamily.students.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedFamily.students.map((student: any) => (
                      <div key={student.id} className="p-3 bg-accent rounded-lg">
                        <p className="font-medium">{student.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">{student.student_id}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-2">No students linked</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Families;
