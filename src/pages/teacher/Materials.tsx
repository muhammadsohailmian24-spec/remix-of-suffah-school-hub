import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  GraduationCap, Bell, LogOut, Plus, FileText, ClipboardList, Award, BookMarked, Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

const TeacherMaterials = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    file_url: "",
    file_type: "pdf",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase.from("user_roles" as any).select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || (roleData as any).role !== "teacher") { navigate("/dashboard"); return; }

    fetchMaterials();
  };

  const fetchMaterials = async () => {
    const { data, error } = await supabase.from("study_materials" as any).select("*").order("created_at", { ascending: false });
    if (!error && data) setMaterials(data as unknown as Material[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: teacherData } = await supabase.from("teachers" as any).select("id").eq("user_id", session.user.id).maybeSingle();
    const { data: classData } = await supabase.from("classes" as any).select("id").limit(1).maybeSingle();
    const { data: subjectData } = await supabase.from("subjects" as any).select("id").limit(1).maybeSingle();

    if (!teacherData || !classData || !subjectData) {
      toast({ title: "Error", description: "Please set up classes and subjects first", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("study_materials" as any).insert({
      title: formData.title,
      description: formData.description || null,
      file_url: formData.file_url,
      file_type: formData.file_type,
      teacher_id: (teacherData as any).id,
      class_id: (classData as any).id,
      subject_id: (subjectData as any).id,
    } as any);

    if (error) {
      toast({ title: "Error", description: "Failed to upload material", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Material uploaded successfully" });
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", file_url: "", file_type: "pdf" });
      fetchMaterials();
    }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div><h1 className="font-heading text-lg font-bold">The Suffah</h1><p className="text-xs text-muted-foreground">Teacher Portal</p></div>
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
            <Link to="/teacher/attendance" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><ClipboardList className="w-5 h-5" />Attendance</Link>
            <Link to="/teacher/assignments" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><FileText className="w-5 h-5" />Assignments</Link>
            <Link to="/teacher/results" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><Award className="w-5 h-5" />Results</Link>
            <Link to="/teacher/materials" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground"><BookMarked className="w-5 h-5" />Materials</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-2">Study Materials</h1>
              <p className="text-muted-foreground">Upload and manage learning resources</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="hero-gradient text-primary-foreground gap-2"><Upload className="w-4 h-4" />Upload Material</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Study Material</DialogTitle>
                  <DialogDescription>Add a new learning resource for students</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input placeholder="e.g., Chapter 1 Notes" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Brief description..." value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>File URL *</Label>
                    <Input placeholder="https://..." value={formData.file_url} onChange={(e) => setFormData(p => ({ ...p, file_url: e.target.value }))} required />
                    <p className="text-xs text-muted-foreground">Enter the URL of the uploaded file</p>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="hero-gradient text-primary-foreground">Upload</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : materials.length === 0 ? (
              <div className="col-span-full p-8 text-center">
                <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No materials uploaded yet</p>
              </div>
            ) : (
              materials.map((material) => (
                <Card key={material.id} className="card-hover">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{material.title}</CardTitle>
                    <CardDescription>{material.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(material.created_at).toLocaleDateString()}
                      </span>
                      <Button variant="outline" size="sm" asChild>
                        <a href={material.file_url} target="_blank" rel="noopener noreferrer">View</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherMaterials;
