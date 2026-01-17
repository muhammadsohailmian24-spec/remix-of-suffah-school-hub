import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, School } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import ClassActionsDropdown from "@/components/admin/ClassActionsDropdown";

interface ClassItem {
  id: string;
  name: string;
  section: string | null;
  grade_level: number;
  room_number: string | null;
  capacity: number;
}

const AdminClasses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    section: "",
    grade_level: "",
    room_number: "",
    capacity: "40",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "admin") {
      navigate("/dashboard");
      return;
    }

    fetchClasses();
  };

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("grade_level", { ascending: true });

    if (!error && data) {
      setClasses(data as ClassItem[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name,
      section: formData.section || null,
      grade_level: parseInt(formData.grade_level),
      room_number: formData.room_number || null,
      capacity: parseInt(formData.capacity),
    };

    if (editingClass) {
      const { error } = await supabase
        .from("classes")
        .update(payload)
        .eq("id", editingClass.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update class", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Class updated successfully" });
      }
    } else {
      const { error } = await supabase
        .from("classes")
        .insert(payload);

      if (error) {
        toast({ title: "Error", description: "Failed to create class", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Class created successfully" });
      }
    }

    setIsDialogOpen(false);
    setEditingClass(null);
    resetForm();
    fetchClasses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete class", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Class deleted successfully" });
      fetchClasses();
    }
  };

  const openEditDialog = (cls: ClassItem) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      section: cls.section || "",
      grade_level: String(cls.grade_level),
      room_number: cls.room_number || "",
      capacity: String(cls.capacity),
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      section: "",
      grade_level: "",
      room_number: "",
      capacity: "40",
    });
  };

  const filteredClasses = classes.filter(cls => 
    cls.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Classes" description="Manage school classes and sections">
      <div className="flex justify-end mb-6">
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingClass(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="hero-gradient text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
              <DialogDescription>
                {editingClass ? "Update class details" : "Create a new class for the school"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class Name *</Label>
                  <Input
                    placeholder="e.g., Class 10"
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Input
                    placeholder="e.g., A, B, C"
                    value={formData.section}
                    onChange={(e) => setFormData(p => ({ ...p, section: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade Level *</Label>
                  <Select value={formData.grade_level} onValueChange={(v) => setFormData(p => ({ ...p, grade_level: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {[...Array(12)].map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>Grade {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Room Number</Label>
                  <Input
                    placeholder="e.g., 101"
                    value={formData.room_number}
                    onChange={(e) => setFormData(p => ({ ...p, room_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    placeholder="40"
                    value={formData.capacity}
                    onChange={(e) => setFormData(p => ({ ...p, capacity: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="hero-gradient text-primary-foreground">
                  {editingClass ? "Update Class" : "Create Class"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search classes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-8 text-center">
              <School className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No classes found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.section || "-"}</TableCell>
                    <TableCell>Grade {cls.grade_level}</TableCell>
                    <TableCell>{cls.room_number || "-"}</TableCell>
                    <TableCell>{cls.capacity}</TableCell>
                    <TableCell className="text-right">
                      <ClassActionsDropdown
                        classItem={cls}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminClasses;
