import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  GraduationCap, Users, School, BookOpen, ClipboardList, 
  Bell, LogOut, Search, Plus, Pencil, Trash2, Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || (roleData as any).role !== "admin") {
      navigate("/dashboard");
      return;
    }

    fetchClasses();
  };

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from("classes" as any)
      .select("*")
      .order("grade_level", { ascending: true });

    if (!error && data) {
      setClasses(data as unknown as ClassItem[]);
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
        .from("classes" as any)
        .update(payload as any)
        .eq("id", editingClass.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update class", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Class updated successfully" });
      }
    } else {
      const { error } = await supabase
        .from("classes" as any)
        .insert(payload as any);

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
      .from("classes" as any)
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading text-lg font-bold">The Suffah</h1>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground">
              <GraduationCap className="w-5 h-5" /><span className="font-medium">Dashboard</span>
            </Link>
            <Link to="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground">
              <Users className="w-5 h-5" /><span className="font-medium">Users</span>
            </Link>
            <Link to="/admin/classes" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground">
              <School className="w-5 h-5" /><span className="font-medium">Classes</span>
            </Link>
            <Link to="/admin/subjects" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground">
              <BookOpen className="w-5 h-5" /><span className="font-medium">Subjects</span>
            </Link>
            <Link to="/admin/admissions" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground">
              <ClipboardList className="w-5 h-5" /><span className="font-medium">Admissions</span>
            </Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-2">Classes</h1>
              <p className="text-muted-foreground">Manage school classes and sections</p>
            </div>
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
                          <div className="flex items-center justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => openEditDialog(cls)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(cls.id)}>
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
        </main>
      </div>
    </div>
  );
};

export default AdminClasses;
