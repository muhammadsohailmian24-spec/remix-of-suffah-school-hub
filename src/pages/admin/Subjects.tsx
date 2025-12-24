import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  credit_hours: number;
}

const AdminSubjects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    credit_hours: "3",
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

    fetchSubjects();
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data) {
      setSubjects(data as Subject[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      credit_hours: parseInt(formData.credit_hours),
    };

    if (editingSubject) {
      const { error } = await supabase
        .from("subjects")
        .update(payload)
        .eq("id", editingSubject.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update subject", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Subject updated successfully" });
      }
    } else {
      const { error } = await supabase
        .from("subjects")
        .insert(payload);

      if (error) {
        toast({ title: "Error", description: "Failed to create subject", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Subject created successfully" });
      }
    }

    setIsDialogOpen(false);
    setEditingSubject(null);
    resetForm();
    fetchSubjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    
    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete subject", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Subject deleted successfully" });
      fetchSubjects();
    }
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({ 
      name: subject.name, 
      code: subject.code || "", 
      description: subject.description || "", 
      credit_hours: String(subject.credit_hours) 
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", code: "", description: "", credit_hours: "3" });
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Subjects" description="Manage curriculum subjects">
      <div className="flex justify-end mb-6">
        <Dialog open={isDialogOpen} onOpenChange={(o) => { 
          setIsDialogOpen(o); 
          if (!o) { setEditingSubject(null); resetForm(); } 
        }}>
          <DialogTrigger asChild>
            <Button className="hero-gradient text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject ? "Edit" : "Add"} Subject</DialogTitle>
              <DialogDescription>Enter subject details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input 
                    placeholder="e.g., Mathematics" 
                    value={formData.name} 
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input 
                    placeholder="e.g., MATH101" 
                    value={formData.code} 
                    onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))} 
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Description</Label>
                  <Textarea 
                    placeholder="Subject description" 
                    value={formData.description} 
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credit Hours</Label>
                  <Input 
                    type="number" 
                    value={formData.credit_hours} 
                    onChange={(e) => setFormData(p => ({ ...p, credit_hours: e.target.value }))} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="hero-gradient text-primary-foreground">
                  {editingSubject ? "Update" : "Create"}
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
              placeholder="Search subjects..." 
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
          ) : filteredSubjects.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No subjects found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Credit Hours</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.code || "-"}</TableCell>
                    <TableCell>{s.credit_hours}</TableCell>
                    <TableCell className="max-w-xs truncate">{s.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(s)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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

export default AdminSubjects;
