import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  GraduationCap, Users, School, BookOpen, ClipboardList, 
  Bell, LogOut, Search, Plus, Pencil, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

    const { data: roleData } = await supabase.from("user_roles" as any).select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || (roleData as any).role !== "admin") { navigate("/dashboard"); return; }

    fetchSubjects();
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from("subjects" as any).select("*").order("name", { ascending: true });
    if (!error && data) setSubjects(data as unknown as Subject[]);
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
      const { error } = await supabase.from("subjects" as any).update(payload as any).eq("id", editingSubject.id);
      toast({ title: error ? "Error" : "Success", description: error ? "Failed to update" : "Subject updated", variant: error ? "destructive" : "default" });
    } else {
      const { error } = await supabase.from("subjects" as any).insert(payload as any);
      toast({ title: error ? "Error" : "Success", description: error ? "Failed to create" : "Subject created", variant: error ? "destructive" : "default" });
    }

    setIsDialogOpen(false);
    setEditingSubject(null);
    resetForm();
    fetchSubjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    const { error } = await supabase.from("subjects" as any).delete().eq("id", id);
    toast({ title: error ? "Error" : "Success", description: error ? "Failed to delete" : "Subject deleted", variant: error ? "destructive" : "default" });
    if (!error) fetchSubjects();
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({ name: subject.name, code: subject.code || "", description: subject.description || "", credit_hours: String(subject.credit_hours) });
    setIsDialogOpen(true);
  };

  const resetForm = () => setFormData({ name: "", code: "", description: "", credit_hours: "3" });

  const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code?.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div><h1 className="font-heading text-lg font-bold">The Suffah</h1><p className="text-xs text-muted-foreground">Admin Panel</p></div>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2"><LogOut className="w-4 h-4" />Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><GraduationCap className="w-5 h-5" />Dashboard</Link>
            <Link to="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><Users className="w-5 h-5" />Users</Link>
            <Link to="/admin/classes" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><School className="w-5 h-5" />Classes</Link>
            <Link to="/admin/subjects" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground"><BookOpen className="w-5 h-5" />Subjects</Link>
            <Link to="/admin/admissions" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><ClipboardList className="w-5 h-5" />Admissions</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div><h1 className="font-heading text-3xl font-bold mb-2">Subjects</h1><p className="text-muted-foreground">Manage curriculum subjects</p></div>
            <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) { setEditingSubject(null); resetForm(); } }}>
              <DialogTrigger asChild><Button className="hero-gradient text-primary-foreground gap-2"><Plus className="w-4 h-4" />Add Subject</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingSubject ? "Edit" : "Add"} Subject</DialogTitle><DialogDescription>Enter subject details</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Name *</Label><Input placeholder="e.g., Mathematics" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label>Code</Label><Input placeholder="e.g., MATH101" value={formData.code} onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))} /></div>
                    <div className="space-y-2 col-span-2"><Label>Description</Label><Textarea placeholder="Subject description" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Credit Hours</Label><Input type="number" value={formData.credit_hours} onChange={(e) => setFormData(p => ({ ...p, credit_hours: e.target.value }))} /></div>
                  </div>
                  <DialogFooter><Button type="submit" className="hero-gradient text-primary-foreground">{editingSubject ? "Update" : "Create"}</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="mb-6"><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search subjects..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></CardContent></Card>

          <Card><CardContent className="p-0">
            {loading ? <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div> :
            filteredSubjects.length === 0 ? <div className="p-8 text-center"><BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No subjects found</p></div> :
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Credit Hours</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredSubjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.code || "-"}</TableCell>
                    <TableCell>{s.credit_hours}</TableCell>
                    <TableCell className="max-w-xs truncate">{s.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(s)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>}
          </CardContent></Card>
        </main>
      </div>
    </div>
  );
};

export default AdminSubjects;
